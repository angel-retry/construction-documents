from __future__ import annotations

import sys
from pathlib import Path


def resource_root() -> Path:
    """唯讀資源（範本、工項清單）。"""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def runtime_root() -> Path:
    """可寫入資料（匯出、專案存檔）。"""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent
