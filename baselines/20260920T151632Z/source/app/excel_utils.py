from __future__ import annotations

import io
import re
import zipfile
from copy import copy
from pathlib import Path

from openpyxl.worksheet.worksheet import Worksheet

_EXTERNAL_LINK_PART = re.compile(r"^xl/externalLinks/")
_EXTERNAL_LINK_REL = re.compile(
    r'<Relationship[^>]*Type="[^"]*externalLink[^"]*"[^>]*/>\s*'
)
_EXTERNAL_LINK_OVERRIDE = re.compile(
    r'<Override PartName="/xl/externalLinks/[^"]*"[^>]*/>\s*'
)
_EXTERNAL_REFERENCES = re.compile(
    r"<externalReferences[\s\S]*?</externalReferences>"
)
_EXTERNAL_DEFINED_NAME = re.compile(
    r"<definedName[^>]*>[^<]*\[\d+][^<]*</definedName>\s*"
)
_EXTERNAL_SHEET_PREFIX = re.compile(r"'\[\d+\]")





def copy_cell_style(src, dst) -> None:

    dst.font = copy(src.font)

    dst.fill = copy(src.fill)

    dst.border = copy(src.border)

    dst.alignment = copy(src.alignment)

    dst.number_format = src.number_format

    dst.protection = copy(src.protection)





def copy_row_style(ws: Worksheet, src_row: int, dst_row: int, max_col: int = 50) -> None:

    if ws.row_dimensions[src_row].height:

        ws.row_dimensions[dst_row].height = ws.row_dimensions[src_row].height

    for col in range(1, max_col + 1):

        copy_cell_style(ws.cell(src_row, col), ws.cell(dst_row, col))





def clear_row_values(ws: Worksheet, row: int, max_col: int = 50) -> None:

    for col in range(1, max_col + 1):

        cell = ws.cell(row, col)

        if type(cell).__name__ != "MergedCell":

            cell.value = None





def clear_body(ws: Worksheet, start_row: int) -> None:

    for merged in list(ws.merged_cells.ranges):

        if merged.min_row >= start_row:

            ws.unmerge_cells(str(merged))

    for row in range(start_row, ws.max_row + 1):

        clear_row_values(ws, row)





def trim_rows_below(ws: Worksheet, last_row: int, max_col: int = 50) -> None:

    """清除 last_row 以下殘留內容與合併儲存格。"""

    for merged in list(ws.merged_cells.ranges):

        if merged.min_row > last_row:

            ws.unmerge_cells(str(merged))

    for row in range(last_row + 1, ws.max_row + 1):

        clear_row_values(ws, row, max_col)





def copy_row_block(

    ws: Worksheet,

    tpl_ws: Worksheet,

    src_start: int,

    src_end: int,

    dst_start: int,

    max_col: int = 50,

) -> None:

    """複製列區塊的樣式、值與合併儲存格。"""

    offset = dst_start - src_start

    for src_r in range(src_start, src_end + 1):

        dst_r = src_r + offset

        if tpl_ws.row_dimensions[src_r].height:

            ws.row_dimensions[dst_r].height = tpl_ws.row_dimensions[src_r].height

        for col in range(1, max_col + 1):

            src_cell = tpl_ws.cell(src_r, col)

            dst_cell = ws.cell(dst_r, col)

            copy_cell_style(src_cell, dst_cell)

            dst_cell.value = src_cell.value



    for merged in list(tpl_ws.merged_cells.ranges):

        if src_start <= merged.min_row <= src_end:

            ws.merge_cells(

                start_row=merged.min_row + offset,

                end_row=merged.max_row + offset,

                start_column=merged.min_col,

                end_column=merged.max_col,

            )





def strip_external_links_from_xlsx(path: Path) -> None:
    """Remove broken external workbook links from an exported xlsx."""
    path = Path(path)
    buf = io.BytesIO()
    with zipfile.ZipFile(path, "r") as zin:
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                name = item.filename
                if _EXTERNAL_LINK_PART.match(name):
                    continue
                data = zin.read(name)
                if name == "xl/workbook.xml":
                    text = data.decode("utf-8")
                    text = _EXTERNAL_REFERENCES.sub("", text)
                    text = _EXTERNAL_DEFINED_NAME.sub("", text)
                    data = text.encode("utf-8")
                elif name == "xl/_rels/workbook.xml.rels":
                    text = data.decode("utf-8")
                    text = _EXTERNAL_LINK_REL.sub("", text)
                    data = text.encode("utf-8")
                elif name == "[Content_Types].xml":
                    text = data.decode("utf-8")
                    text = _EXTERNAL_LINK_OVERRIDE.sub("", text)
                    data = text.encode("utf-8")
                elif name.startswith("xl/worksheets/") and name.endswith(".xml"):
                    text = data.decode("utf-8")
                    text = _EXTERNAL_SHEET_PREFIX.sub("'", text)
                    data = text.encode("utf-8")
                zout.writestr(item, data)
    path.write_bytes(buf.getvalue())


def park_data_row_formulas(row: int, last_item_row: int) -> dict[int, str]:

    calc = "03.數量計算"

    # 03.數量計算 欄位（per-unit 版）：A 序號 | B 項次碼 | C 品名 | D 單位 | E 單價
    return {

        5: (

            f"=_xlfn.XLOOKUP($B{row},'{calc}'!A$8:A${last_item_row},"

            f"'{calc}'!B$8:B${last_item_row},\"\")"

        ),

        6: (

            f"=_xlfn.XLOOKUP($B{row},'{calc}'!$A$8:$A${last_item_row},"

            f"'{calc}'!$C$8:$C${last_item_row},\"\")"

        ),

        7: (

            f"=IF(LOOKUP(B{row},'{calc}'!A$7:A${last_item_row},"

            f"'{calc}'!D$7:D${last_item_row})=0,\"\","

            f"LOOKUP(B{row},'{calc}'!A$7:A${last_item_row},"

            f"'{calc}'!D$7:D${last_item_row}))"

        ),

        9: (

            f"=_xlfn.XLOOKUP($E{row},'{calc}'!$B$8:$B${last_item_row},"

            f"'{calc}'!$E$8:$E${last_item_row},\"\")"

        ),

        10: f"=ROUND(H{row}*I{row},2)",

    }


