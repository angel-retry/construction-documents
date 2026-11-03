# Implementation Plan: 數量看板顯示日期與施工路段設定連動 (Quantities Work Dates Sync)

**Branch**: `001-quantities-work-dates-sync` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-quantities-work-dates-sync/spec.md`

---

## Summary

本功能旨在讓「每日數量與帳務總覽」（`/quantities`）之日期欄位與篩選元件，完全與「施工路段」（`/sites`）所設定之施工日期（`monthly_sites.work_dates`）即時連動。
改善 `web/app/projects/[id]/quantities/board.tsx` 中的 `SiteBlock` 元件，讓預設表格欄位精確呈現施工日，並在「顯示日期」篩選下拉框中提供清晰的施工日標記與快速重設機制。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router) / React 19  
**Primary Dependencies**: React Client Components, CSS Modules  
**Storage**: Supabase PostgreSQL (`monthly_sites.work_dates`)  
**Testing**: 演算法單元驗證 (`legacy-work-dates.test.mjs`)、瀏覽器手動端對端驗收  
**Target Platform**: Web (Desktop Chrome / Edge)  
**Project Type**: Next.js Fullstack Web Application  
**Performance Goals**: 狀態切換延遲 < 16ms (60fps)，無多餘重渲染  
**Constraints**: 變更範圍僅限於前端呈現層，不得更動後端 `daily_quantities` 資料持久化契約  
**Scale/Scope**: 單一路段支援 1~31 天施工日切換，整頁約 1~20 個施工路段  

---

## Constitution Check

*GATE: 依據 `.specify/memory/constitution.md` 逐項檢核：*

| 憲章原則 | 檢核結果 | 說明 |
| :--- | :--- | :--- |
| **Principle I: SDD 優先** | **PASS** | 嚴格依循 Specify → Plan → Tasks 順序，於動工前完成架構設計。 |
| **Principle II: App Router 分工** | **PASS** | 本次改良局限於 Client Component（`board.tsx`），保持 Server Component（`page.tsx`）純讀取。 |
| **Principle III: 領域演算法獨立** | **PASS** | 直接沿用 `web/lib/legacy-work-dates.ts` 內現成之純函式 `workDatesToDays`，不侵入核心演算。 |
| **Principle IV: 繁體中文無裝飾** | **PASS** | 程式碼註釋與 UI 字串一律使用純繁體中文，無裝飾性表情符號。 |
| **Principle V: 安全性與最小變更** | **PASS** | 不更動授權與連線金鑰，只修改必要之渲染邏輯。 |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-quantities-work-dates-sync/
├── spec.md              # 需求規格與驗收條件
├── plan.md              # 技術實作計畫（本檔案）
├── research.md          # 架構調研與決策
├── data-model.md        # 狀態介面與資料模型
├── contracts/           # 前端合約與型別定義
│   └── quantities-dates.ts
├── quickstart.md        # 驗收與快速測試指引
└── tasks.md             # 任務檢核表（由 /speckit-tasks 生成）
```

### Source Code (affected areas)

```text
web/
└── app/
    └── projects/
        └── [id]/
            └── quantities/
                └── board.tsx       # 主要修改：SiteBlock 內部篩選狀態與施工日高亮顯示
```

---

## Detailed Design & Phases

### Phase 0: Research (Completed)
- 釐清現有 `board.tsx` 之日期解析邏輯（`workDatesToDays`）。
- 確立「預設連動 `/sites` 施工日」、「篩選器明確標註施工日」之設計方案。

### Phase 1: Data Contracts & Design (Completed)
- 產出 `data-model.md` 與 `contracts/quantities-dates.ts`。
- 確認無資料庫欄位或後端 API 異動。

### Phase 2: Implementation Outline (for `/speckit-tasks`)
1. **改良 `SiteBlock` 之顯示日期下拉選單 (`board.tsx`)**：
   - 在選單標題動態顯示目前狀態（例如：`依施工日期顯示（4天）` 或 `自訂篩選（2天）`）。
   - 在日期核取方塊旁加上 `[施工日]` 樣式標記，讓使用者清楚辨識。
2. **優化預設欄位呈現 (`visible`)**：
   - 確保 `site.work_dates` 更新時，無自訂篩選的情況下表格立即對齊最新施工日。
3. **驗證與端對端測試**：
   - 參照 `quickstart.md` 完成瀏覽器端整合驗收。
