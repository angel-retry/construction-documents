from __future__ import annotations

import calendar

import dataclasses

import math

import re

import shutil

from collections import defaultdict

from datetime import datetime, timedelta

from pathlib import Path

import openpyxl

from openpyxl.utils import get_column_letter

from .excel_utils import (

    clear_body,

    copy_cell_style,

    copy_row_block,

    park_data_row_formulas,

    strip_external_links_from_xlsx,

    trim_rows_below,

)

from .kinds import ProjectKind

from .models import (
    Project,
    QuantityRecord,
    Site,
    WorkItem,
    item_map,
    revision_effective_on,
    sorted_revisions,
    work_dates_to_days,
)

from .paths import resource_root

SHEET_CALC = "03.數量計算"

SHEET_SITES = "施工路段表"

SHEET_ANALYSIS = "04.數量分析"

SHEET_DETAIL = "詳細表連結"

SHEET_LOG = "施工日誌"

SHEET_COVER = "封面"

# 金額欄一律用千分位會計格式（單價／複價／小計／合計／本月累計金額）
MONEY_FMT = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-'

def roc_to_datetime(roc_year: int, month: int, day: int) -> datetime:

    return datetime(roc_year + 1911, month, day)

def _validate_template(path: Path) -> None:

    if not path.is_file():

        raise FileNotFoundError(f"找不到範本：{path}")

    try:

        wb = openpyxl.load_workbook(path, read_only=True, data_only=False)

        wb.close()

    except Exception as exc:

        raise ValueError(f"範本檔案損壞，請重新放置 {path.parent.name}/{path.name}") from exc

def _export_from_template(template: Path, dest: Path, fill_fn) -> Path:

    _validate_template(template)

    dest.parent.mkdir(parents=True, exist_ok=True)

    work_copy = dest.with_name(dest.stem + "._work" + dest.suffix)

    work_out = dest.with_name(dest.stem + "._part" + dest.suffix)

    try:

        shutil.copy2(template, work_copy)

        wb = openpyxl.load_workbook(work_copy, data_only=False)

        try:

            fill_fn(wb)

            wb.save(work_out)

        finally:

            wb.close()

        strip_external_links_from_xlsx(work_out)

        verify = openpyxl.load_workbook(work_out, read_only=True, data_only=False)

        verify.close()

        if dest.exists():

            dest.unlink()

        work_out.replace(dest)

        return dest

    except PermissionError as exc:

        raise PermissionError(

            f"無法寫入 {dest.name}，請先關閉 Excel/WPS 中已開啟的同名檔案後再匯出"

        ) from exc

    finally:

        work_copy.unlink(missing_ok=True)

        work_out.unlink(missing_ok=True)

def floor2(value: float) -> float:
    return math.floor(value * 100) / 100


def compute_site_amounts(
    project: Project, items_by_code: dict[str, WorkItem]
) -> dict[int, float]:
    site_items = _site_item_quantities(project)
    totals: dict[int, float] = {}
    for site in project.sites:
        item_data = site_items.get(site.site_id, {})
        total = 0.0
        for code, daily in item_data.items():
            item = items_by_code.get(code)
            if not item:
                continue
            qty = round(sum(daily.values()), 4)
            total += floor2(qty * item.price)
        totals[site.site_id] = total
    return totals


_FILENAME_UNSAFE = re.compile(r'[\\/:*?"<>|]')


def independent_settlement_name(project: Project, site: Site) -> str:
    base = project.settlement_name()
    stem = base[:-5] if base.lower().endswith(".xlsx") else base
    label = _FILENAME_UNSAFE.sub("", site.name).strip()[:30] or "路段"
    return f"{stem}_獨立_{site.site_id}_{label}.xlsx"


def _sites_with_any_data(project: Project) -> set[int]:
    """有每日數量或本月數量的路段 site_id。"""
    ids = {q.site_id for q in project.quantities if q.quantity}
    for key, target in project.item_targets.items():
        if target > 0 and "|" in key:
            try:
                ids.add(int(key.split("|", 1)[0]))
            except ValueError:
                pass
    return ids


def sites_missing_work_dates(project: Project, sites: list[Site]) -> list[Site]:
    """公園依上／下旬拆分結算單前，找出「有數量資料（每日數量或本月數量）卻未填施工日期」的路段。"""
    with_data = _sites_with_any_data(project)
    return [
        s for s in sites if s.site_id in with_data and not s.work_dates.strip()
    ]


def unallocated_targets(project: Project) -> list[tuple[int, str]]:
    """找出「帳務總覽」設了本月數量、但「每日數量」頁尚未分配的工項。
    匯出只讀每日數量，這些工項不會出現在結算單／日誌，需提醒使用者。"""
    allocated = {
        (q.site_id, q.item_code) for q in project.quantities if q.quantity
    }
    result: list[tuple[int, str]] = []
    for key, target in project.item_targets.items():
        if target <= 0 or "|" not in key:
            continue
        sid_text, code = key.split("|", 1)
        try:
            sid = int(sid_text)
        except ValueError:
            continue
        if (sid, code) not in allocated:
            result.append((sid, code))
    return result


def export_settlement_for_sites(
    project: Project,
    kind: ProjectKind,
    items: list[WorkItem],
    output_dir: Path,
    sites: list[Site],
    dest_name: str,
    *,
    day_range: tuple[int, int] | None = None,
) -> Path:
    """雨水（rainwater）用：一般派工彙整一份 + 每個獨立案一份。
    公園（park）已改走 :func:`export_combined_settlement`（上旬／下旬／獨立案同一分頁）。"""
    if kind.id != "rainwater":
        raise NotImplementedError(
            "park 結算單請改用 export_combined_settlement()"
        )

    output_dir.mkdir(parents=True, exist_ok=True)

    dest_path = output_dir / dest_name

    items_by_code = item_map(items)

    site_view = dataclasses.replace(project, sites=sites)

    site_items = _site_item_quantities(site_view)

    daily_totals = _aggregate_daily(project)

    def fill_settlement(wb) -> None:

        _fill_settlement_rainwater(
            wb, site_view, kind, items_by_code, site_items, daily_totals
        )

    _export_from_template(kind.settlement_path(), dest_path, fill_settlement)

    return dest_path


@dataclasses.dataclass
class _ParkUnit:
    """公園結算單裡的一個「單位」：上旬 / 下旬 / 一個獨立派工案。"""

    label: str
    sites: list[Site]
    quantities: list[QuantityRecord]
    day_range: tuple[int, int]
    is_independent: bool
    min_seq: int = 10**9
    # 04.數量分析 建好後回填：該單位資料列（J 欄＝施工數量）的列區間
    block_j_first: int = 0
    block_j_last: int = 0


def _site_day_span(
    site: Site, roc_year: int, month: int
) -> tuple[int, int] | None:
    days = work_dates_to_days(site.work_dates, roc_year + 1911, month)
    if not days:
        return None
    return (min(days), max(days))


def _build_park_units(
    project: Project,
    normal_sites: list[Site],
    independent_sites: list[Site],
    items_by_code: dict[str, WorkItem],
    month: int,
    month_days: int,
) -> list[_ParkUnit]:
    normal_ids = {s.site_id for s in normal_sites}
    units: list[_ParkUnit] = []

    # 濾掉落在該路段施工日期以外的每日數量（改過施工日期後的殘留紀錄）
    allowed = _allowed_days_by_site(project)
    quantities = [
        r for r in project.quantities
        if r.quantity and _in_work_dates(r, allowed)
    ]

    for suffix, (lo, hi) in (("上旬", (1, 15)), ("下旬", (16, month_days))):
        rows = [
            r
            for r in quantities
            if r.site_id in normal_ids and lo <= r.day <= hi
        ]
        if not rows:
            continue
        ids = {r.site_id for r in rows}
        units.append(
            _ParkUnit(
                label=f"{month}月{suffix}",
                sites=[s for s in normal_sites if s.site_id in ids],
                quantities=rows,
                day_range=(lo, hi),
                is_independent=False,
            )
        )

    for site in independent_sites:
        rows = [
            r
            for r in quantities
            if r.site_id == site.site_id
        ]
        if not rows:
            continue
        span = _site_day_span(site, project.roc_year, month) or (1, month_days)
        units.append(
            _ParkUnit(
                label="",
                sites=[site],
                quantities=rows,
                day_range=span,
                is_independent=True,
            )
        )

    for unit in units:
        seqs = [
            items_by_code[r.item_code].seq
            for r in unit.quantities
            if r.item_code in items_by_code
        ]
        unit.min_seq = min(seqs) if seqs else 10**9

    def _order_key(u: "_ParkUnit") -> tuple:
        if u.is_independent:
            # 上旬、下旬固定在前；獨立派工案接在後面，彼此依最小項次排序
            return (2, u.min_seq)
        return (0 if u.label.endswith("上旬") else 1, 0)

    units.sort(key=_order_key)

    counter = 0
    for unit in units:
        if unit.is_independent:
            counter += 1
            unit.label = f"派工單{counter:02d}"

    return units


def export_combined_settlement(
    project: Project,
    kind: ProjectKind,
    items: list[WorkItem],
    output_dir: Path,
    normal_sites: list[Site],
    independent_sites: list[Site],
) -> Path:
    """公園結算單：上旬、下旬、每個獨立派工案全部疊在同一份活頁簿的
    03.數量計算 / 04.數量分析 兩張分頁上。"""
    output_dir.mkdir(parents=True, exist_ok=True)

    dest_path = output_dir / project.settlement_name()

    items_by_code = item_map(items)

    month_days = calendar.monthrange(project.gregorian_year(), project.month)[1]

    units = _build_park_units(
        project,
        normal_sites,
        independent_sites,
        items_by_code,
        project.month,
        month_days,
    )

    ordered_sites: list[Site] = []
    seen: set[int] = set()
    for unit in units:
        for site in unit.sites:
            if site.site_id not in seen:
                seen.add(site.site_id)
                ordered_sites.append(site)

    site_view = dataclasses.replace(project, sites=ordered_sites)

    def fill_settlement(wb) -> None:
        _fill_settlement_park(
            wb, site_view, kind, items_by_code, units, month_days
        )

    _export_from_template(kind.settlement_path(), dest_path, fill_settlement)

    return dest_path


def export_log_only(
    project: Project, kind: ProjectKind, items: list[WorkItem], output_dir: Path
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)

    log_path = output_dir / project.log_name()

    items_by_code = item_map(items)

    daily_totals = _aggregate_daily(project)

    def fill_log(wb) -> None:

        _fill_log(wb, project, kind, items_by_code, daily_totals)

    _export_from_template(kind.log_path(), log_path, fill_log)

    return log_path

def _allowed_days_by_site(project: Project) -> dict[int, set[int] | None]:
    """每個路段可接受的施工日（幾日）集合；未填或格式錯誤的施工日期回傳 None（不過濾）。

    施工日期改過之後，舊那天殘留的每日數量會在匯總時被重複加總（匯出數量灌水），
    這裡在讀取時就把落在施工日期以外的紀錄濾掉。"""
    gyear = project.gregorian_year()
    result: dict[int, set[int] | None] = {}
    for site in project.sites:
        days = work_dates_to_days(site.work_dates, gyear, project.month)
        result[site.site_id] = set(days) if days else None
    return result


def _in_work_dates(record, allowed: dict[int, set[int] | None]) -> bool:
    days = allowed.get(record.site_id)
    return days is None or record.day in days


def _aggregate_daily(project: Project) -> dict[str, dict[int, float]]:

    totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))

    allowed = _allowed_days_by_site(project)

    for record in project.quantities:

        if record.quantity and _in_work_dates(record, allowed):

            totals[record.item_code][record.day] += record.quantity

    return totals

def _site_item_quantities(project: Project) -> dict[int, dict[str, dict[int, float]]]:

    result: dict[int, dict[str, dict[int, float]]] = defaultdict(

        lambda: defaultdict(lambda: defaultdict(float))

    )

    allowed = _allowed_days_by_site(project)

    for record in project.quantities:

        if record.quantity and _in_work_dates(record, allowed):

            result[record.site_id][record.item_code][record.day] += record.quantity

    return result

def _project_title(project: Project) -> str:

    return (

        project.project_name

        if project.project_name.startswith("工程名稱：")

        else f"工程名稱：{project.project_name}"

    )

def _fill_settlement_park(
    wb,
    project: Project,
    kind: ProjectKind,
    items_by_code: dict[str, WorkItem],
    units: list["_ParkUnit"],
    month_days: int,
) -> None:
    title = _project_title(project)

    ws_calc = wb[SHEET_CALC]
    ws_calc["B1"] = project.owner
    ws_calc["B3"] = title
    ws_calc["B4"] = f"施工地點：{project.location}"

    ws_sites = wb[SHEET_SITES]
    ws_sites["A1"] = project.owner
    ws_sites["A2"] = project.project_name
    for i in range(18):
        row = 5 + i
        for col in range(1, 7):
            ws_sites.cell(row, col).value = None
    for i, site in enumerate(project.sites[:18]):
        row = 5 + i
        ws_sites.cell(row, 1).value = site.site_id
        ws_sites.cell(row, 2).value = site.name
        ws_sites.cell(row, 4).value = site.work_dates
        if site.note:
            ws_sites.cell(row, 5).value = site.note

    ws_analysis = wb[SHEET_ANALYSIS]
    ws_analysis["D1"] = project.owner
    ws_analysis["D4"] = title
    ws_analysis["N2"] = f"施工日誌{project.month}月"

    for day in range(1, 32):
        ws_analysis.cell(4, kind.analysis_day_col - 1 + day).value = (
            day if day <= month_days else None
        )

    clear_body(ws_analysis, 6)

    _write_analysis_blocks_park(
        ws_analysis,
        project,
        kind,
        items_by_code,
        units,
        project.month,
        project.roc_year,
        month_days,
    )

    _fill_calc_park(ws_calc, kind, units, project)

    if "結算單封面" in wb.sheetnames or "結算單封面 " in wb.sheetnames:
        cover_name = next(n for n in wb.sheetnames if "封面" in n)
        cover = wb[cover_name]
        cover["A1"] = project.owner
        cover["A2"] = project.project_name


def _fill_calc_park(
    ws,
    kind: ProjectKind,
    units: list["_ParkUnit"],
    project: Project,
) -> None:
    """03.數量計算：每個單位一欄（限定範圍 SUMIF）＋ 本月累計數量／金額 ＋ 未來月份標題欄。
    範本前欄已改為 A 序 | B 項次碼 | C 品名 | D 單位 | E 單價。"""
    first_col = 6  # F
    n = len(units)
    style_donor = 9  # 舊 I 欄（保留會計格式與框線）當樣式範本
    last_item_row = kind.last_item_row
    total_row = last_item_row + 1

    for k, unit in enumerate(units):
        ws.cell(5, first_col + k).value = unit.label

    cum_qty_col = first_col + n
    cum_amt_col = first_col + n + 1
    ws.cell(5, cum_qty_col).value = "本月累計數量"
    ws.cell(5, cum_amt_col).value = "本月累計金額"

    trailing: list[int] = []
    for m in range(project.month + 1, kind.month_max + 1):
        c = cum_amt_col + 1 + len(trailing)
        ws.cell(5, c).value = f"{m}月"
        trailing.append(c)
    last_col = trailing[-1] if trailing else cum_amt_col

    unit_first_letter = get_column_letter(first_col)
    unit_last_letter = get_column_letter(first_col + n - 1) if n else unit_first_letter
    cum_qty_letter = get_column_letter(cum_qty_col)
    cum_amt_letter = get_column_letter(cum_amt_col)

    for r in range(kind.first_item_row - 2, last_item_row + 1):
        code = ws.cell(r, 2).value
        if not isinstance(code, str) or not code:
            continue
        for k, unit in enumerate(units):
            c = first_col + k
            copy_cell_style(ws.cell(r, style_donor), ws.cell(r, c))
            a, b = unit.block_j_first, unit.block_j_last
            if a and b:
                ws.cell(r, c).value = (
                    f"=SUMIF('{SHEET_ANALYSIS}'!$E${a}:$E${b},$B{r},"
                    f"'{SHEET_ANALYSIS}'!$H${a}:$H${b})"
                )
            else:
                ws.cell(r, c).value = 0
        copy_cell_style(ws.cell(r, style_donor), ws.cell(r, cum_qty_col))
        copy_cell_style(ws.cell(r, style_donor), ws.cell(r, cum_amt_col))
        if n:
            ws.cell(r, cum_qty_col).value = (
                f"=SUM({unit_first_letter}{r}:{unit_last_letter}{r})"
            )
        else:
            ws.cell(r, cum_qty_col).value = 0
        ws.cell(r, cum_amt_col).value = f"=ROUND({cum_qty_letter}{r}*$E{r},2)"
        ws.cell(r, cum_amt_col).number_format = MONEY_FMT
        ws.cell(r, 5).number_format = MONEY_FMT  # 單價
        for tc in trailing:
            copy_cell_style(ws.cell(r, style_donor), ws.cell(r, tc))

    copy_cell_style(ws.cell(total_row, 7), ws.cell(total_row, cum_amt_col))
    ws.cell(total_row, cum_amt_col).value = (
        f"=ROUND(SUM({cum_amt_letter}{kind.first_item_row}:"
        f"{cum_amt_letter}{last_item_row}),2)"
    )
    ws.cell(total_row, cum_amt_col).number_format = MONEY_FMT

    ws.freeze_panes = ws.cell(row=kind.first_item_row, column=first_col)
    ws.print_area = f"B1:{get_column_letter(last_col)}{total_row}"
    for c in range(first_col, last_col + 1):
        dim = ws.column_dimensions[get_column_letter(c)]
        dim.width = 13.5
        dim.hidden = False

def _fill_settlement_rainwater(

    wb,

    project: Project,

    kind: ProjectKind,

    items_by_code: dict[str, WorkItem],

    site_items: dict[int, dict[str, dict[int, float]]],

    daily_totals: dict[str, dict[int, float]],

) -> None:

    title = _project_title(project)

    ws_calc = wb[SHEET_CALC]

    ws_calc["A1"] = project.owner

    ws_calc["A3"] = title

    ws_calc["A4"] = f"施工地點：{project.location}"

    month_names = {i: f"{i}月" for i in range(kind.month_min, kind.month_max + 1)}

    target_col = kind.month_to_calc_col(project.month)

    for m in range(kind.month_min, kind.month_max + 1):

        ws_calc.cell(5, kind.month_calc_base_col + m - kind.month_min).value = (

            month_names[m]

        )

    for row in range(kind.first_item_row, kind.last_item_row + 1):

        seq = ws_calc.cell(row, 1).value

        if seq is None:

            continue

        try:

            int(seq)

        except (TypeError, ValueError):

            continue

        for m in range(kind.month_min, kind.month_max + 1):

            col = kind.month_calc_base_col + m - kind.month_min

            if col == target_col:

                ws_calc.cell(row, col).value = (

                    f"=SUMIF('{SHEET_ANALYSIS}'!C:C,TRIM(A{row}),"

                    f"'{SHEET_ANALYSIS}'!F:F)"

                )

            elif isinstance(ws_calc.cell(row, col).value, str) and str(

                ws_calc.cell(row, col).value

            ).startswith("=SUMIF"):

                ws_calc.cell(row, col).value = 0

    ws_sites = wb[SHEET_SITES]

    ws_sites["A1"] = project.owner

    ws_sites["A2"] = project.project_name

    for i in range(18):

        row = 5 + i

        for col in range(1, 7):

            ws_sites.cell(row, col).value = None

    for i, site in enumerate(project.sites[:18]):

        row = 5 + i

        ws_sites.cell(row, 1).value = site.site_id

        ws_sites.cell(row, 2).value = site.name

        ws_sites.cell(row, 4).value = site.work_dates

        if site.note:

            ws_sites.cell(row, 5).value = site.note

    ws_analysis = wb[SHEET_ANALYSIS]

    ws_analysis["B4"] = title

    days = calendar.monthrange(project.gregorian_year(), project.month)[1]

    for day in range(1, 32):

        ws_analysis.cell(5, kind.analysis_day_col - 1 + day).value = (

            day if day <= days else None

        )

    clear_body(ws_analysis, 6)

    _write_analysis_blocks_rainwater(

        ws_analysis, project, kind, items_by_code, site_items, project.month, project.roc_year

    )

    if SHEET_COVER in wb.sheetnames:

        cover = wb[SHEET_COVER]

        cover["A1"] = project.owner

        cover["A2"] = project.project_name

def _apply_row_style_from_tpl(

    ws, tpl_ws, dst_row: int, src_row: int, max_col: int = 50

) -> None:

    from .excel_utils import copy_cell_style

    if tpl_ws.row_dimensions[src_row].height:

        ws.row_dimensions[dst_row].height = tpl_ws.row_dimensions[src_row].height

    for col in range(1, max_col + 1):

        copy_cell_style(tpl_ws.cell(src_row, col), ws.cell(dst_row, col))

def _item_sort_key(code: str) -> tuple:

    if code.isdigit():

        return (int(code),)

    parts = code.replace("一.", "").split(".")

    result = []

    for part in parts:

        part = part.strip("()")

        try:

            result.append(int(part))

        except ValueError:

            result.append(part)

    return tuple(result)

def _write_analysis_blocks_park(
    ws,
    project: Project,
    kind: ProjectKind,
    items_by_code: dict[str, WorkItem],
    units: list["_ParkUnit"],
    month: int,
    roc_year: int,
    month_days: int,
) -> None:
    tpl = openpyxl.load_workbook(kind.settlement_path(), data_only=False)
    tpl_ws = tpl[SHEET_ANALYSIS]

    # 每個路段在「施工路段表」中的列號（第 5 列起，最多 18 列）
    site_row_map = {
        s.site_id: 5 + i for i, s in enumerate(project.sites[:18])
    }

    current_row = 6
    footer_end = 5
    subtotal_l_cells: list[str] = []

    for unit in units:
        unit_view = dataclasses.replace(
            project, sites=unit.sites, quantities=unit.quantities
        )
        site_items = _site_item_quantities(unit_view)

        site_header_rows: list[int] = []
        j_data_rows: list[int] = []

        for site in unit.sites:
            item_data = site_items.get(site.site_id, {})
            if not item_data:
                continue

            items_list = sorted(item_data.keys(), key=_item_sort_key)
            header_row = current_row
            col_header_row = current_row + 1
            data_start = current_row + 2
            site_header_rows.append(header_row)

            _apply_row_style_from_tpl(ws, tpl_ws, header_row, 6)
            sr = site_row_map.get(site.site_id)
            if sr:
                ws.cell(header_row, 4).value = f"=施工路段表!A{sr}"
                ws.cell(header_row, 6).value = (
                    f"=_xlfn.XLOOKUP($D{header_row},施工路段表!$A$5:$A$22,"
                    f"施工路段表!$B$5:$B$22)"
                )
                ws.cell(header_row, 11).value = (
                    f"=_xlfn.XLOOKUP($D{header_row},施工路段表!$A$5:$A$22,"
                    f"施工路段表!$D$5:$D$22)"
                )
            else:
                ws.cell(header_row, 4).value = site.site_id
                ws.cell(header_row, 6).value = site.name
                ws.cell(header_row, 11).value = site.work_dates
            ws.cell(header_row, 5).value = "施作地點："

            _apply_row_style_from_tpl(ws, tpl_ws, col_header_row, 7)
            ws.cell(col_header_row, 5).value = "合約項次"
            ws.cell(col_header_row, 6).value = "工作項目"
            ws.cell(col_header_row, 7).value = "單位"
            ws.cell(col_header_row, 8).value = "施工數量"
            ws.cell(col_header_row, 9).value = "單價"
            ws.cell(col_header_row, 10).value = "複價"
            ws.cell(col_header_row, 11).value = "備註"

            for i, item_code in enumerate(items_list):
                item = items_by_code.get(item_code)
                if not item:
                    continue
                row = data_start + i
                daily = item_data[item_code]
                _apply_row_style_from_tpl(ws, tpl_ws, row, 8)
                ws.cell(row, 2).value = item.seq
                ws.cell(row, 8).value = round(sum(daily.values()), 4)
                j_data_rows.append(row)
                for col, formula in park_data_row_formulas(
                    row, kind.last_item_row
                ).items():
                    ws.cell(row, col).value = formula
                ws.cell(row, 9).number_format = MONEY_FMT   # 單價
                ws.cell(row, 10).number_format = MONEY_FMT  # 複價
                for day, qty in daily.items():
                    if qty:
                        ws.cell(row, kind.analysis_day_col - 1 + day).value = qty
                note = project.item_notes.get(
                    f"{site.site_id}|{item_code}", ""
                ).strip()
                if note:
                    ws.cell(row, 11).value = note

            data_end = data_start + len(items_list) - 1
            subtotal_row = data_end + 1
            _apply_row_style_from_tpl(ws, tpl_ws, subtotal_row, 15)
            ws.cell(subtotal_row, 6).value = "小計"
            ws.cell(subtotal_row, 11).value = f"=SUM(J{data_start}:J{data_end})"
            ws.cell(subtotal_row, 12).value = f"=K{subtotal_row}"
            ws.cell(subtotal_row, 11).number_format = MONEY_FMT
            ws.cell(subtotal_row, 12).number_format = MONEY_FMT
            subtotal_l_cells.append(f"L{subtotal_row}")
            current_row = subtotal_row + 2

        if not site_header_rows:
            continue

        unit.block_j_first = min(j_data_rows)
        unit.block_j_last = max(j_data_rows)

        footer_end = _write_analysis_footer_park(
            ws,
            tpl_ws,
            current_row,
            project,
            unit,
            site_header_rows,
            j_data_rows,
            month,
            roc_year,
            month_days,
            list(subtotal_l_cells),
        )
        current_row = footer_end + 2

    trim_rows_below(ws, footer_end, max_col=60)
    ws.print_area = f"D1:L{footer_end}"
    ws.row_breaks.brk = []
    tpl.close()

def _rain_site_lookup_formulas(row: int) -> tuple[str, str]:
    sites = SHEET_SITES
    key_range = f"'{sites}'!$A$5:$A$22"
    name_formula = (
        f"=_xlfn.XLOOKUP(B{row},{key_range},'{sites}'!$B$5:$B$22,\"\")"
    )
    date_formula = (
        f"=_xlfn.XLOOKUP(B{row},{key_range},'{sites}'!$D$5:$D$22,\"\")"
    )
    return name_formula, date_formula


def _write_analysis_blocks_rainwater(

    ws,

    project: Project,

    kind: ProjectKind,

    items_by_code: dict[str, WorkItem],

    site_items: dict[int, dict[str, dict[int, float]]],

    month: int,

    roc_year: int,

) -> None:

    tpl = openpyxl.load_workbook(kind.settlement_path(), data_only=False)

    tpl_ws = tpl[SHEET_ANALYSIS]

    current_row = 6

    h_data_rows: list[int] = []

    for site in project.sites:

        item_data = site_items.get(site.site_id, {})

        if not item_data:

            continue

        items_list = sorted(item_data.keys(), key=_item_sort_key)

        header_row = current_row

        col_header_row = current_row + 1

        data_start = current_row + 2

        _apply_row_style_from_tpl(ws, tpl_ws, header_row, 6)

        ws.cell(header_row, 1).value = site.site_id

        ws.cell(header_row, 2).value = site.site_id

        ws.cell(header_row, 3).value = "施工地點："

        name_formula, date_formula = _rain_site_lookup_formulas(header_row)

        ws.cell(header_row, 4).value = name_formula

        ws.cell(header_row, 9).value = date_formula

        _apply_row_style_from_tpl(ws, tpl_ws, col_header_row, 7)

        ws.cell(col_header_row, 3).value = "合約項次"

        ws.cell(col_header_row, 4).value = "工作項目"

        ws.cell(col_header_row, 5).value = "單位"

        ws.cell(col_header_row, 6).value = "施工數量"

        ws.cell(col_header_row, 7).value = "單價"

        ws.cell(col_header_row, 8).value = "複價"

        ws.cell(col_header_row, 9).value = "備註"

        for i, item_code in enumerate(items_list):

            item = items_by_code.get(item_code)

            if not item:

                continue

            row = data_start + i

            daily = item_data[item_code]

            total = round(sum(daily.values()), 4)

            _apply_row_style_from_tpl(ws, tpl_ws, row, 8)

            ws.cell(row, 3).value = item.seq

            ws.cell(row, 4).value = item.name

            ws.cell(row, 5).value = item.unit

            ws.cell(row, 6).value = total

            ws.cell(row, 7).value = item.price

            ws.cell(row, 8).value = f"=ROUND(F{row}*G{row},2)"

            h_data_rows.append(row)

            for day, qty in daily.items():

                if qty:

                    ws.cell(row, kind.analysis_day_col - 1 + day).value = qty

            note = project.item_notes.get(f"{site.site_id}|{item_code}", "").strip()

            if note:

                ws.cell(row, 9).value = note

        data_end = data_start + len(items_list) - 1

        subtotal_row = data_end + 1

        _apply_row_style_from_tpl(ws, tpl_ws, subtotal_row, 13)

        ws.cell(subtotal_row, 4).value = "小計"

        ws.cell(subtotal_row, 9).value = f"=SUM(H{data_start}:H{data_end})"

        current_row = subtotal_row + 2

    if h_data_rows:

        footer_end = _write_analysis_footer_rainwater(

            ws, tpl_ws, current_row, h_data_rows, month, roc_year

        )

        trim_rows_below(ws, footer_end, max_col=60)

        ws.print_area = f"B1:AN{footer_end}"

        ws.row_breaks.brk = []

    tpl.close()

def _write_analysis_footer_park(

    ws,

    tpl_ws,

    start_row: int,

    project: Project,

    unit: "_ParkUnit",

    site_header_rows: list[int],

    j_data_rows: list[int],

    month: int,

    roc_year: int,

    month_days: int,

    subtotal_l_cells: list[str] | None = None,

) -> int:

    start_day, end_day = unit.day_range

    end_day = min(end_day, month_days)

    copy_row_block(ws, tpl_ws, 23, 23, start_row)

    ws.cell(start_row, 5).value = "合計"

    if j_data_rows:

        j_min, j_max = min(j_data_rows), max(j_data_rows)

        ws.cell(start_row, 10).value = f"=SUBTOTAL(9,J{j_min}:J{j_max})"

    ws.cell(start_row, 10).number_format = MONEY_FMT

    if subtotal_l_cells:

        ws.cell(start_row, 12).value = "=" + "+".join(subtotal_l_cells)

    ws.cell(start_row, 12).number_format = MONEY_FMT

    copy_row_block(ws, tpl_ws, 24, 25, start_row + 1)

    ws.cell(start_row + 1, 4).value = (

        f"一、施工期限：緊急搶修({roc_year}年{month}月{start_day}至{roc_year}年{month}月{end_day}日)"

    )

    ws.cell(start_row + 2, 4).value = "二、開竣工日期："

    site_row_start = start_row + 3

    for i, header_row in enumerate(site_header_rows):

        dst = site_row_start + i

        copy_row_block(ws, tpl_ws, 26, 26, dst)

        ws.cell(dst, 4).value = f"=D{header_row}"

        ws.cell(dst, 5).value = f"=F{header_row}"

    blank_start = site_row_start + len(site_header_rows)

    copy_row_block(ws, tpl_ws, 28, 31, blank_start)

    sig_start = blank_start + 4

    copy_row_block(ws, tpl_ws, 32, 42, sig_start)

    return sig_start + 10

def _write_analysis_footer_rainwater(

    ws,

    tpl_ws,

    start_row: int,

    h_data_rows: list[int],

    month: int,

    roc_year: int,

) -> int:

    days = calendar.monthrange(roc_year + 1911, month)[1]

    copy_row_block(ws, tpl_ws, 14, 14, start_row, max_col=60)

    ws.cell(start_row, 3).value = "合計"

    if h_data_rows:

        h_min, h_max = min(h_data_rows), max(h_data_rows)

        ws.cell(start_row, 8).value = f"=SUBTOTAL(9,H{h_min}:H{h_max})"

    copy_row_block(ws, tpl_ws, 15, 17, start_row + 1, max_col=60)

    ws.cell(start_row + 1, 2).value = (

        f"一、施工期限：緊急搶修({roc_year}年{month}月1至{roc_year}年{month}月{days}日)"

    )

    ws.cell(start_row + 2, 2).value = "二、開竣工日期："

    sig_start = start_row + 4

    copy_row_block(ws, tpl_ws, 20, 32, sig_start, max_col=60)

    return sig_start + 12

def _apply_contract_revisions(
    detail,
    project: Project,
    kind: ProjectKind,
    days: int,
    month_start: datetime,
) -> None:
    """依「工程費小計歷程」設定，將(原契約)／變更設計小計與完成百分率公式的
    分母切換到正確的生效日期，取代範本中固定不變的舊數值。"""

    if not (
        kind.subtotal_baseline_row
        and kind.subtotal_revision_row
        and kind.percent_day_row
    ):
        return

    revisions = project.contract_revisions
    if not revisions:
        return

    baseline = sorted_revisions(revisions)[0]
    month_end = roc_to_datetime(project.roc_year, project.month, days)
    current = revision_effective_on(revisions, month_end) or baseline

    baseline_row = kind.subtotal_baseline_row
    revision_row = kind.subtotal_revision_row
    percent_row = kind.percent_day_row

    if baseline.label:
        detail.cell(baseline_row, 2).value = baseline.label
    detail.cell(baseline_row, 4).value = baseline.amount

    if current is not baseline:
        detail.cell(revision_row, 2).value = current.label
        detail.cell(revision_row, 4).value = current.amount
    else:
        detail.cell(revision_row, 2).value = None
        detail.cell(revision_row, 4).value = None

    def denom_row_for(date: datetime) -> int:
        applicable = revision_effective_on(revisions, date) or baseline
        return revision_row if applicable is not baseline else baseline_row

    first_row = kind.first_detail_row
    last_row = kind.last_detail_row

    prior_date = month_start - timedelta(days=1)
    e_denom = denom_row_for(prior_date)
    detail.cell(percent_row, 5).value = (
        f"=ROUND(SUMPRODUCT($D${first_row}:$D${last_row},"
        f"E{first_row}:E{last_row})/$D${e_denom},6)"
    )

    for offset in range(days):
        col = kind.log_day_col + offset
        col_letter = get_column_letter(col)
        date = roc_to_datetime(project.roc_year, project.month, offset + 1)
        denom = denom_row_for(date)
        detail.cell(percent_row, col).value = (
            f"=ROUND(SUMPRODUCT($D${first_row}:$D${last_row},"
            f"{col_letter}{first_row}:{col_letter}{last_row})/$D${denom},6)"
        )


def _fill_park_daily_contents(wb, project: Project, days: int) -> None:
    """用隱藏的案件日期資料與公式帶出公園每日施工名稱。"""
    source_name = "公園施工日期資料"
    source = wb.create_sheet(source_name)
    source.sheet_state = "hidden"
    source["A1"] = "案件名稱"
    source["B1"] = "原施工日期"
    sites = [site for site in project.sites if site.name.strip()]
    last_row = max(2, len(sites) + 1)
    for row, site in enumerate(sites, 2):
        source.cell(row, 1, site.name.strip()).data_type = "s"
        source.cell(row, 2, site.work_dates).data_type = "s"
        work_days = work_dates_to_days(
            site.work_dates, project.gregorian_year(), project.month
        ) or []
        for col, day in enumerate(work_days, 3):
            cell = source.cell(row, col, roc_to_datetime(project.roc_year, project.month, day))
            cell.number_format = "yyyy/mm/dd"

    detail = wb[SHEET_DETAIL]
    last_day_col = get_column_letter(7 + days)
    for row in range(466, 477):
        detail.cell(row, 6).value = (
            f'=IFERROR(INDEX(H{row}:{last_day_col}{row},1,'
            f'MATCH($F$3,$H$3:${last_day_col}$3,0))&"","")'
        )
    for day in range(1, 32):
        rank_col = get_column_letter(34 + day)  # AI:BM，當日案件順序
        date_col = get_column_letter(7 + day)
        if day <= days:
            source.cell(1, 34 + day, roc_to_datetime(project.roc_year, project.month, day))
        for row in range(2, last_row + 1):
            source.cell(row, 34 + day).value = (
                f'=IF({rank_col}$1="","",IF(COUNTIF($C{row}:$AG{row},{rank_col}$1)>0,'
                f'COUNT({rank_col}$1:{rank_col}{row - 1}),""))'
            )
        ref = f"'{source_name}'!"
        ranks = f"{ref}${rank_col}$2:${rank_col}${last_row}"
        for slot in range(1, 4):
            detail.cell(465 + slot, 7 + day).value = (
                f'=IF({date_col}$3="","",IFERROR(INDEX({ref}$A$2:$A${last_row},'
                f'MATCH({slot},{ranks},0))&"",""))'
            )
        # 分列累加第四案以後的名稱，避免案件多時公式過長。
        overflow_col = get_column_letter(66 + day)
        for row in range(2, last_row + 1):
            rank = f"{rank_col}{row}"
            previous = '""' if row == 2 else f"{overflow_col}{row - 1}"
            source.cell(row, 66 + day).value = (
                f'=IF(AND(ISNUMBER({rank}),{rank}>=4),'
                f'{previous}&IF({rank}=4,"","；")&$A{row},{previous})'
            )
        detail.cell(469, 7 + day).value = (
            f'=IF({date_col}$3="","",{ref}{overflow_col}{last_row}&"")'
        )


def _fill_rainwater_daily_contents(
    detail, project: Project, days: int, items_by_code: dict[str, WorkItem]
) -> None:
    """依施工日期填入每日案件名稱，清除範本舊內容。"""
    names_by_day: dict[int, list[str]] = defaultdict(list)
    site_quantities = _site_item_quantities(project)
    for site in project.sites:
        if not site.name.strip():
            continue
        work_days = work_dates_to_days(
            site.work_dates, project.gregorian_year(), project.month
        ) or []
        for day in work_days:
            if site.name.strip().upper().startswith("A"):
                # 巡查派工依當日實際填列數量展開工項，不將整月工項每天重複列出。
                daily_items = site_quantities.get(site.site_id, {})
                for code in ("200", "201", "202", "203", "204"):
                    item = items_by_code.get(code)
                    if item and daily_items.get(code, {}).get(day, 0):
                        name = f"{code}{item.name}"
                        if name not in names_by_day[day]:
                            names_by_day[day].append(name)
            else:
                names_by_day[day].append(site.name.strip())

    last_col = get_column_letter(8 + days - 1)
    for row in range(287, 294):
        # 精確比對日期；無施工內容或日期不在本月時保持空白。
        detail.cell(row, 6).value = (
            f'=IFERROR(INDEX(H{row}:{last_col}{row},1,'
            f'MATCH($G$3,$H$3:${last_col}$3,0))&"","")'
        )
        for day in range(1, 32):
            names = names_by_day.get(day, []) if day <= days else []
            slot = row - 287
            # 固定七列；超過七案時完整保留在最後一列。
            value = ("；".join(names[slot:]) if slot == 6 else names[slot]) if slot < len(names) else None
            cell = detail.cell(row, 7 + day)
            cell.value = value
            if value is not None:
                cell.data_type = "s"


def _fill_log(

    wb,

    project: Project,

    kind: ProjectKind,

    items_by_code: dict[str, WorkItem],

    daily_totals: dict[str, dict[int, float]],

) -> None:

    title = _project_title(project)

    days = calendar.monthrange(project.gregorian_year(), project.month)[1]

    month_start = roc_to_datetime(project.roc_year, project.month, 1)

    month_end = roc_to_datetime(project.roc_year, project.month, days)

    if SHEET_COVER in wb.sheetnames:

        cover = wb[SHEET_COVER]

        cover["B2"] = project.project_name

        cover["C18"] = f"主辦單位：{project.owner}"

        cover["C19"] = f"監造單位：{project.supervisor}"

        cover["C20"] = f"承攬廠商：{project.contractor}"

        cover["C12"] = month_start

        cover["F12"] = month_end

    detail = wb[SHEET_DETAIL]

    detail["A2"] = title

    detail["A4"] = f"承攬廠商：{project.contractor}"

    if project.contract_amount:

        detail["D6"] = project.contract_amount

    detail["H3"] = month_start

    first_day_col = get_column_letter(kind.log_day_col)
    last_day_col = get_column_letter(kind.log_day_col + days - 1)
    if kind.id == "rainwater":
        detail["G2"] = (
            f"=LOOKUP(G3,{first_day_col}3:{last_day_col}4,"
            f"{first_day_col}2:{last_day_col}2)"
        )
    else:
        detail["G2"] = None

    for offset in range(31):

        col = kind.log_day_col + offset

        day = offset + 1

        if day <= days:

            detail.cell(2, col).value = day

            detail.cell(3, col).value = roc_to_datetime(

                project.roc_year, project.month, day

            )

        else:

            detail.cell(2, col).value = None

            detail.cell(3, col).value = None

    if kind.id == "park":
        detail.print_area = "A1:AL476"
    elif detail.print_area:
        end_col = get_column_letter(kind.log_day_col + 30)
        row_match = re.search(r"\$?[A-Z]+\$?(\d+)$", detail.print_area)
        last_row = row_match.group(1) if row_match else kind.last_detail_row
        detail.print_area = f"A1:{end_col}{last_row}"

    day31_col = get_column_letter(kind.log_day_col + 30)
    detail.column_dimensions[day31_col].hidden = days < 31

    for row in range(kind.first_detail_row, kind.last_detail_row + 1):

        code = detail.cell(row, 1).value

        if code is None:

            continue

        if kind.item_code_prefix:

            if not isinstance(code, str) or not code.startswith(kind.item_code_prefix):

                continue

            key = str(code).strip()

        else:

            try:

                key = str(int(code))

            except (TypeError, ValueError):

                continue

        # 前期累計僅寫入指定工程明細範圍，避免雨水後段重複項次
        # （例如保險項目 1、2、3）誤套用主要工程的數量。
        prior_last_row = 447 if kind.id == "park" else 229
        if 6 <= row <= prior_last_row:
            detail.cell(row, 5).value = project.prior_cumulative.get(key, 0)

        day_values = daily_totals.get(key, {})

        for day in range(1, days + 1):

            col = kind.log_day_col + day - 1

            qty = day_values.get(day, 0)

            detail.cell(row, col).value = qty if qty else "-"

    if kind.id == "rainwater":
        _fill_rainwater_daily_contents(detail, project, days, items_by_code)
    elif kind.id == "park":
        _fill_park_daily_contents(wb, project, days)

    _apply_contract_revisions(detail, project, kind, days, month_start)

    if kind.id == "park":
        detail["E463"] = "=ROUND(SUMPRODUCT($D$9:$D447,E9:E447)/$D$462,6)"
        detail["E463"].number_format = "0.00%"
        detail["E464"] = "=ROUND(SUMPRODUCT($D$9:$D447,E9:E447)/$D$462,6)"
        detail["X473"] = '=IF(X470=0,"本日無施工","")'
        for row in range(9, 461):
            detail.cell(row, 6).value = f"=LOOKUP($F$3,$H$3:$AL$4,H{row}:AL{row})"
            detail.cell(row, 7).value = f"=E{row}+SUM(H{row}:OFFSET(H{row},0,$F$2-1))"
        for row in range(9, 448):
            detail.cell(row, 39).value = f"=SUBTOTAL(9,H{row}:AL{row})"
            detail.cell(row, 40).value = f"=AM{row}+E{row}"
            detail.cell(row, 41).value = f"=D{row}*AN{row}"
        for col in range(8, 39):
            letter = get_column_letter(col)
            detail.cell(470, col).value = f'=IF({letter}466="",0,1)'
            no_work_cell = detail.cell(473, col)
            if isinstance(no_work_cell.value, str) and no_work_cell.value.startswith("="):
                no_work_cell.value = no_work_cell.value.replace(f"{letter}466", f"{letter}470")
        # 本工程自民國 115/7/28 契約變更，之後每日百分率改用變更小計。
        if month_end >= datetime(2026, 7, 28):
            detail["AO465"] = "=AO461/D462"
        for day in range(1, days + 1):
            if roc_to_datetime(project.roc_year, project.month, day) >= datetime(2026, 7, 28):
                cell = detail.cell(464, kind.log_day_col + day - 1)
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    cell.value = cell.value.replace("$D$461", "$D$462")

    if SHEET_LOG in wb.sheetnames:
        log = wb[SHEET_LOG]
        if kind.id == "rainwater":
            log.cell(4, 3).value = project.project_name
            log.cell(4, 18).value = project.contractor
            log.cell(3, 20).value = month_end
            log.cell(2, 24).value = month_start
            log.cell(3, 24).value = month_end
            if project.contract_amount:
                log.cell(7, 23).value = project.contract_amount
        else:
            log["D4"] = project.project_name
            log["B36"] = "=詳細表連結!F473"
            log["D3"] = "=詳細表連結!F474"
            log["F3"] = "=詳細表連結!F475"
            log["K7"] = "=詳細表連結!F465"
            log["E33"] = "=詳細表連結!F471"
            log["E34"] = "=詳細表連結!F472"
            for row in range(10, 14):
                log.cell(row, 2).value = f"=詳細表連結!F{row + 456}"
            # 公園日誌固定以 B～M 欄列印，保留範本的縱向範圍與分頁。
            print_rows = re.search(r"\$?[A-Z]+\$?(\d+)$", str(log.print_area))
            last_print_row = int(print_rows.group(1)) if print_rows else log.max_row
            log.print_area = f"B1:M{last_print_row}"
            log.page_setup.fitToWidth = 1
            log.page_setup.fitToHeight = 0
            log.page_setup.scale = None
            log.sheet_properties.pageSetUpPr.fitToPage = True
            log.col_breaks.brk = []
            log["K4"] = project.contractor
            log["K3"] = month_end
            log["N2"] = month_start
            log["N3"] = month_end
            if project.contract_amount:
                log["P6"] = project.contract_amount
            log["D6"] = datetime(2026, 2, 1)
            log["K6"] = datetime(2026, 12, 31)

