from __future__ import annotations



import json
import re
import uuid
from dataclasses import asdict, dataclass, field

from datetime import datetime, timedelta

from pathlib import Path



from .kinds import ProjectKind, get_kind

from .paths import runtime_root



WORK_DATES_HINT = "115/6/1、115/6/1-115/6/2 或 115/7/2、115/7/10"

WORK_DATES_PART_PATTERN = re.compile(

    r"^(\d{2,3}/\d{1,2}/\d{1,2})(?:[-~](\d{2,3}/\d{1,2}/\d{1,2}))?$"

)





def _parse_roc_date(text: str) -> datetime:

    year_s, month_s, day_s = text.split("/")

    return datetime(int(year_s) + 1911, int(month_s), int(day_s))





def _validate_work_dates_part(part: str) -> str | None:

    match = WORK_DATES_PART_PATTERN.match(part.strip())

    if not match:

        return f"施工日期格式錯誤，請使用：{WORK_DATES_HINT}"

    start_text, end_text = match.group(1), match.group(2)

    try:

        start = _parse_roc_date(start_text)

        if end_text:

            end = _parse_roc_date(end_text)

            if end < start:

                return "結束日不可早於開始日"

    except ValueError:

        return "施工日期無效，請確認年月日是否正確"

    return None





def validate_work_dates(value: str) -> str | None:

    text = value.strip()

    if not text:

        return None

    parts = [part.strip() for part in text.split("、") if part.strip()]

    if not parts:

        return f"施工日期格式錯誤，請使用：{WORK_DATES_HINT}"

    for part in parts:

        error = _validate_work_dates_part(part)

        if error:

            return error

    return None





def is_valid_work_dates(value: str) -> bool:

    return validate_work_dates(value) is None



def work_dates_to_days(value: str, year: int, month: int) -> list[int] | None:

    """展開施工日期字串為指定年月內的日期（幾日）清單；格式無效或空白則回傳 None。"""

    if not is_valid_work_dates(value):

        return None

    parts = [part.strip() for part in value.strip().split("、") if part.strip()]

    if not parts:

        return None

    days: set[int] = set()

    for part in parts:

        match = WORK_DATES_PART_PATTERN.match(part)

        start = _parse_roc_date(match.group(1))

        end = _parse_roc_date(match.group(2)) if match.group(2) else start

        current = start

        while current <= end:

            if current.year == year and current.month == month:

                days.add(current.day)

            current += timedelta(days=1)

    return sorted(days) if days else None





@dataclass

class WorkItem:

    seq: int

    code: str

    name: str

    unit: str

    price: float





@dataclass
class Site:
    site_id: int
    name: str
    work_dates: str = ""
    note: str = ""
    uid: str = field(default_factory=lambda: uuid.uuid4().hex[:10])
    case_override: str = ""


INDEPENDENT_CASE_THRESHOLD = 150_000


def effective_case_type(
    site: Site, amount: float, threshold: float = INDEPENDENT_CASE_THRESHOLD
) -> str:
    if site.case_override in ("normal", "independent"):
        return site.case_override
    return "independent" if amount >= threshold else "normal"





@dataclass

class QuantityRecord:

    site_id: int

    item_code: str

    day: int

    quantity: float


@dataclass
class ContractRevision:
    """一筆「直接工程費小計」的生效紀錄，例如原契約或第 N 次變更設計。"""

    label: str = ""
    amount: float = 0.0
    effective_date: str = ""  # ISO 格式 "YYYY-MM-DD"；空字串代表從專案開始即生效（原契約）


def _revision_from_dict(data: dict) -> ContractRevision:
    return ContractRevision(
        label=str(data.get("label", "")),
        amount=float(data.get("amount", 0) or 0),
        effective_date=str(data.get("effective_date", "") or ""),
    )


def _revision_sort_key(revision: ContractRevision) -> datetime:
    if not revision.effective_date:
        return datetime.min
    try:
        return datetime.strptime(revision.effective_date, "%Y-%m-%d")
    except ValueError:
        return datetime.min


def sorted_revisions(revisions: list[ContractRevision]) -> list[ContractRevision]:
    return sorted(revisions, key=_revision_sort_key)


def revision_effective_on(
    revisions: list[ContractRevision], date: datetime
) -> ContractRevision | None:
    """回傳在指定日期當下生效的最新一筆工程費小計紀錄（找不到則為 None）。"""
    applicable: ContractRevision | None = None
    for revision in sorted_revisions(revisions):
        eff = _revision_sort_key(revision)
        if eff <= date:
            applicable = revision
        else:
            break
    return applicable





@dataclass

class Project:

    kind: str = "park"

    roc_year: int = 115

    month: int = 6

    project_name: str = ""

    owner: str = "新北市中和區公所"

    location: str = "中和區全區"

    contractor: str = "皇喆營造工程有限公司"

    supervisor: str = ""

    contract_amount: int = 0

    prior_cumulative: dict[str, float] = field(default_factory=dict)
    item_notes: dict[str, str] = field(default_factory=dict)
    item_targets: dict[str, float] = field(default_factory=dict)
    # 每個路段已加入的工項清單（str(site_id) -> [工項碼]）。
    # 讓「新增了工項但還沒填每日數量／本月數量」的項目也能保存下來、重開不消失。
    site_items: dict[str, list[str]] = field(default_factory=dict)
    sites: list[Site] = field(default_factory=list)

    quantities: list[QuantityRecord] = field(default_factory=list)

    contract_revisions: list[ContractRevision] = field(default_factory=list)



    def project_kind(self) -> ProjectKind:

        return get_kind(self.kind)



    def gregorian_year(self) -> int:

        return self.roc_year + 1911



    def period_label(self) -> str:

        return f"{self.roc_year}年{self.month}月"



    def settlement_name(self) -> str:

        suffix = self.project_kind().settlement_suffix

        return f"{self.period_label()}{suffix}.xlsx"



    def log_name(self) -> str:

        pattern = self.project_kind().log_name_pattern

        return f"{pattern.format(roc_year=self.roc_year, month=self.month)}.xlsx"



    def to_dict(self) -> dict:

        return asdict(self)



    @classmethod

    def from_dict(cls, data: dict) -> Project:

        kind = str(data.get("kind", "park"))

        cfg = get_kind(kind)

        return cls(

            kind=kind,

            roc_year=int(data.get("roc_year", 115)),

            month=int(data.get("month", cfg.month_min)),

            project_name=str(data.get("project_name", cfg.default_project_name)),

            owner=str(data.get("owner", "新北市中和區公所")),

            location=str(data.get("location", "中和區全區")),

            contractor=str(data.get("contractor", "皇喆營造工程有限公司")),

            supervisor=str(data.get("supervisor", cfg.default_supervisor)),

            contract_amount=int(

                data.get("contract_amount", cfg.default_contract_amount)

            ),

            prior_cumulative={
                str(k): float(v)
                for k, v in data.get("prior_cumulative", {}).items()
            },
            item_notes={
                str(k): str(v)
                for k, v in data.get("item_notes", {}).items()
            },
            item_targets={
                str(k): float(v)
                for k, v in data.get("item_targets", {}).items()
            },
            site_items={
                str(k): [str(c) for c in (v or [])]
                for k, v in data.get("site_items", {}).items()
            },
            sites=[_site_from_dict(s) for s in data.get("sites", [])],

            quantities=[QuantityRecord(**q) for q in data.get("quantities", [])],

            contract_revisions=[
                _revision_from_dict(r) for r in data.get("contract_revisions", [])
            ],

        )





def _site_from_dict(data: dict) -> Site:
    return Site(
        site_id=int(data["site_id"]),
        name=str(data["name"]),
        work_dates=str(data.get("work_dates", "")),
        note=str(data.get("note", "")),
        uid=str(data.get("uid") or uuid.uuid4().hex[:10]),
        case_override=str(data.get("case_override", "")),
    )


def ensure_site_uids(project: Project) -> None:
    for site in project.sites:
        if not site.uid:
            site.uid = uuid.uuid4().hex[:10]


def default_project(kind: ProjectKind) -> Project:

    return Project(

        kind=kind.id,

        month=max(kind.month_min, 6 if kind.month_min <= 6 <= kind.month_max else kind.month_min),

        project_name=kind.default_project_name,

        supervisor=kind.default_supervisor,

        contract_amount=kind.default_contract_amount,

        sites=[Site(site_id, name, dates) for site_id, name, dates in kind.default_sites],

    )


def blank_period_project(profile: Project, roc_year: int, month: int) -> Project:
    """建立指定年月的全新空白專案：沿用目前的工程基本設定，但不含路段與每日數量。"""
    return Project(
        kind=profile.kind,
        roc_year=roc_year,
        month=month,
        project_name=profile.project_name,
        owner=profile.owner,
        location=profile.location,
        contractor=profile.contractor,
        supervisor=profile.supervisor,
        contract_amount=profile.contract_amount,
        contract_revisions=[
            ContractRevision(r.label, r.amount, r.effective_date)
            for r in profile.contract_revisions
        ],
    )





def load_items(kind: ProjectKind | str) -> list[WorkItem]:

    cfg = kind if isinstance(kind, ProjectKind) else get_kind(kind)

    raw = json.loads(cfg.items_path().read_text(encoding="utf-8"))

    return [WorkItem(**item) for item in raw]





def item_map(items: list[WorkItem]) -> dict[str, WorkItem]:

    return {item.code: item for item in items}


