# Implementation Plan: 數量看板專業報表排版重構 (Quantities Table Layout Redesign)

**Branch**: `004-quantities-table-layout-redesign` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-quantities-table-layout-redesign/spec.md`

---

## Summary

本功能旨在重構 `/quantities` 頁面路段工項表格之整體排版與視覺體驗。
依據已驗證之 `preview-table.html` 現代化報表模型，實作具備淺灰底色與分欄邊界的專業表頭、數值靠右等寬對齊（tabular-nums）、深藍色金額高亮、資料列懸停高亮、精緻微型移除按鈕，以及每日數量分配進度之色彩狀態回饋，並保證所有 CSS 變更具備 100% 作用域隔離，絕不影響專案其他頁面。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router) / React 19  
**Primary Dependencies**: React Client Components, 純 CSS (`legacy.css`)  
**Storage**: 本次無資料庫結構或 API 變更  
**Testing**: 瀏覽器端對端視覺與互動驗收（參照 `quickstart.md`）  
**Target Platform**: Web (Desktop Chrome / Edge)  
**Project Type**: Next.js Fullstack Web Application  
**Performance Goals**: 樣式重繪 60fps，欄位對齊 0 像素偏差  
**Constraints**: 100% 樣式隔離，所有 CSS 選擇器限定於 `quantity-*` 範疇，不變更後端存取契約  
**Scale/Scope**: 影響 `board.tsx` 之 `SiteBlock` 與 `ItemRow` 展示結構及 `legacy.css` 樣式  

---

## Constitution Check

*GATE: 依據 `.specify/memory/constitution.md` 逐項檢核：*

| 憲章原則 | 檢核結果 | 說明 |
| :--- | :--- | :--- |
| **Principle I: SDD 優先** | **PASS** | 嚴格依循 Specify → Plan → Tasks 順序，於動工前完成架構設計。 |
| **Principle II: App Router 分工** | **PASS** | 變更嚴格限於 Client Component（`board.tsx`）與樣式檔，職責清晰。 |
| **Principle III: 領域演算法獨立** | **PASS** | 既有數值計算與差量儲存演算法保持獨立，未受影響。 |
| **Principle IV: 繁體中文無裝飾** | **PASS** | 規格、註釋與介面文字 100% 採用純繁體中文，無表情符號。 |
| **Principle V: 安全性與最小變更** | **PASS** | 樣式具有 100% 隔離性，無連帶破壞其他頁面之風險。 |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-quantities-table-layout-redesign/
├── spec.md              # 需求規格與驗收條件
├── plan.md              # 技術實作計畫（本檔案）
├── research.md          # 架構調研與技術決策 (Phase 0)
├── data-model.md        # 狀態介面與資料模型 (Phase 1)
├── quickstart.md        # 驗收與快速測試指引 (Phase 1)
├── checklists/          # 需求品質檢核表
│   └── requirements.md
└── tasks.md             # 任務檢核表（由 /speckit-tasks 生成）
```

### Source Code (affected areas)

```text
web/
├── app/
│   ├── legacy.css                               # 擴充專業報表表頭、數值靠右、斑馬紋與狀態色彩
│   └── projects/
│       └── [id]/
│           └── quantities/
│               └── board.tsx                    # 微調 SiteBlock 表頭與 ItemRow 結構標記
```

---

## Detailed Design & Phases

### Phase 0: Research (Completed)
- 確立共用 CSS Grid 軌道規範，達成表頭與資料列 0 像素垂直對齊。
- 確立等寬數值靠右對齊與深藍金額高亮規則。
- 確認全專案中 `quantity-*` 類別之 100% 樣式隔離性。

### Phase 1: Data Contracts & Design (Completed)
- 產出 `data-model.md` 與 `quickstart.md`。

### Phase 2: Implementation Outline (for `/speckit-tasks`)
1. **編寫 `legacy.css` 現代化報表樣式**：
   - 擴充表頭卡片底色與分欄邊界樣式。
   - 加入數值靠右（`.text-right`）與等寬數字（`.font-mono`）。
   - 加入資料列底線、懸停（hover）底色、微型移除按鈕與狀態色彩。
2. **重構 `board.tsx` 表頭與列表容器結構**：
   - 更新 `SiteBlock` 之 `quantity-column-head` 與空狀態引導提示。
   - 更新 `ItemRow` 內部的欄位結構（標記單位標籤、靠右類別）。
3. **驗收與全頁面檢查**：
   - 依據 `quickstart.md` 執行驗收，確認其他頁面外觀不受影響。
