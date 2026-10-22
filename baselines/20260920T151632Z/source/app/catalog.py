"""工項清單快取：依工程類型預先載入一次，供各頁面查詢使用。"""

from __future__ import annotations

from .kinds import DEFAULT_KIND_ORDER
from .models import WorkItem, load_items

ITEMS_BY_KIND: dict[str, list[WorkItem]] = {
    kind.id: load_items(kind) for kind in DEFAULT_KIND_ORDER
}

ITEM_OPTIONS_BY_KIND: dict[str, dict[str, str]] = {
    kind.id: {f"{it.code} | {it.name}": it.code for it in ITEMS_BY_KIND[kind.id]}
    for kind in DEFAULT_KIND_ORDER
}

CODE_TO_ITEM_BY_KIND: dict[str, dict[str, WorkItem]] = {
    kind.id: {it.code: it for it in ITEMS_BY_KIND[kind.id]}
    for kind in DEFAULT_KIND_ORDER
}
