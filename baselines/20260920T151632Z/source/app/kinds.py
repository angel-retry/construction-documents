from __future__ import annotations

from dataclasses import dataclass

from .paths import resource_root

DATA_ROOT = resource_root() / "data"
TEMPLATE_ROOT = resource_root() / "templates"


@dataclass(frozen=True)
class ProjectKind:
    id: str
    label: str
    items_file: str
    settlement_template: str
    log_template: str
    first_item_row: int
    last_item_row: int
    first_detail_row: int
    last_detail_row: int
    analysis_day_col: int
    log_day_col: int
    item_code_prefix: str | None
    month_min: int
    month_max: int
    month_calc_base_col: int
    default_project_name: str
    default_contract_amount: int
    default_supervisor: str
    default_sites: tuple[tuple[int, str, str], ...]
    settlement_suffix: str
    log_name_pattern: str
    # 「詳細表連結」工作表中，工程費小計歷程（原契約／變更設計）與完成百分率所在的列號。
    # 目前僅公園（park）範本已對齊官方格式；未設定（None）的工程類型不套用此邏輯，維持既有行為。
    subtotal_baseline_row: int | None = None
    subtotal_revision_row: int | None = None
    percent_day_row: int | None = None
    percent_cum_row: int | None = None

    def items_path(self):
        return DATA_ROOT / self.id / self.items_file

    def settlement_path(self):
        return TEMPLATE_ROOT / self.id / self.settlement_template

    def log_path(self):
        return TEMPLATE_ROOT / self.id / self.log_template

    def month_to_calc_col(self, month: int) -> int:
        if not self.month_min <= month <= self.month_max:
            raise ValueError(
                f"{self.label}僅支援 {self.month_min}~{self.month_max} 月"
            )
        return self.month_calc_base_col + month - self.month_min


PARK = ProjectKind(
    id="park",
    label="公園",
    items_file="items.json",
    settlement_template="settlement.xlsx",
    log_template="construction_log.xlsx",
    first_item_row=8,
    last_item_row=446,
    first_detail_row=9,
    last_detail_row=447,
    analysis_day_col=14,
    log_day_col=8,
    item_code_prefix="一.",
    month_min=2,
    month_max=12,
    month_calc_base_col=9,
    default_project_name="115年中和區公園設施修繕工程(開口合約)第1、2、3標-第3標",
    default_contract_amount=8_819_553,
    default_supervisor="晨星工程技術顧問有限公司",
    default_sites=((39, "公園037_秀山公園地坪修復", "115/6/1-115/6/2"),),
    settlement_suffix="公園結算單",
    log_name_pattern="{roc_year}年中和公園_施工日誌-{month}月份",
    subtotal_baseline_row=461,
    subtotal_revision_row=462,
    percent_day_row=464,
    percent_cum_row=465,
)

RAINWATER = ProjectKind(
    id="rainwater",
    label="雨水",
    items_file="items.json",
    settlement_template="settlement.xlsx",
    log_template="construction_log.xlsx",
    first_item_row=8,
    last_item_row=229,
    first_detail_row=8,
    last_detail_row=278,
    analysis_day_col=12,
    log_day_col=8,
    item_code_prefix=None,
    month_min=4,
    month_max=12,
    month_calc_base_col=7,
    default_project_name="中和區115年度雨水下水道及其它排水等維護改善工程(開口契約)",
    default_contract_amount=0,
    default_supervisor="華邦工程顧問有限公司",
    default_sites=(
        (1, "A05-115年6月份雨水人孔內部現況調查(含編號噴漆)", "115/6/1~115/6/30"),
    ),
    settlement_suffix="雨水竣工單",
    log_name_pattern="{roc_year}年中和雨水_施工日誌-{month}月份",
)

PROJECT_KINDS: dict[str, ProjectKind] = {
    PARK.id: PARK,
    RAINWATER.id: RAINWATER,
}

DEFAULT_KIND_ORDER = (PARK, RAINWATER)


def get_kind(kind_id: str) -> ProjectKind:
    return PROJECT_KINDS[kind_id]
