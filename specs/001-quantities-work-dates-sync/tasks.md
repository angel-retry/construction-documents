---
description: "Task list for Quantities Work Dates Display Sync implementation"
---

# Tasks: 數量看板顯示日期與施工路段設定連動 (Quantities Work Dates Sync)

**Input**: Design documents from `specs/001-quantities-work-dates-sync/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`  
**Target Code**: `web/app/projects/[id]/quantities/board.tsx`  

---

## Phase 1: Setup (準備工作)

**Purpose**: 確認開發環境與既有元件結構

- [x] T001 檢視 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 內 `SiteBlock` 的 `filter`、`visible` 與日期渲染邏輯

---

## Phase 2: Foundational (基礎函式與契約)

**Purpose**: 確保領域演算法與合約完備

- [x] T002 驗證 [legacy-work-dates.ts](file:///c:/Users/angel.wei/code/construction-documents/web/lib/legacy-work-dates.ts) 內 `workDatesToDays` 能正確解析連續與離散日期格式

---

## Phase 3: User Story 1 - 依施工路段設定自動渲染數量欄位日期 (Priority: P1) 🎯 MVP

**Goal**: 當路段在 `/sites` 設定施工日期時，`/quantities` 該路段表格橫向欄位預設僅呈現該些施工日，未設定時安全退回整月。

**Independent Test**:
進入 `/sites` 設定路段施工日期為 `115/9/5、115/9/10~115/9/12`，切換至 `/quantities`，該路段橫向欄位預設僅顯示 9/5、9/10、9/11、9/12。

### Implementation for User Story 1

- [x] T003 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 的 `SiteBlock` 優化 `visible` 計算，確保無自訂篩選時精準對齊 `workDays`（若無設定或格式錯誤則 fallback 至 `all`）
- [x] T004 [US1] 確保父層 `site.work_dates` 或 `site.revision` 更新時，`SiteBlock` 能夠同步反映最新施工日清單
- [x] T005 [US1] 確保既有單一施工日（`workDays?.length === 1`）時的本月數量自動同步機制保持運作

**Checkpoint**: User Story 1 完成，數量看板日期欄位已具備依 `/sites` 設定自動連動之能力。

---

## Phase 4: User Story 2 - 「顯示日期」自訂篩選與預設連動 (Priority: P2)

**Goal**: 優化「顯示日期」收合面板體驗，面板內僅列出該路段施工日之 Checkbox，防止選取範圍外日期，並提供全選與一鍵還原連動。

**Independent Test**:
展開「顯示日期」面板，僅看見路段設定之施工日 Checkbox；勾選部分日期後，點擊「選取所有施工日」或「依施工日期顯示」能立即還原為完整施工日。

### Implementation for User Story 2

- [x] T006 [US2] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 改造 `<details className="day-filter">` 的 `<summary>`，動態顯示目前顯示模式（例如：`依施工日期顯示（共 4 天）` 或 `自訂篩選（2/4 天）`）
- [x] T007 [US2] 在日期選取清單（`quantity-days`）中，將選項來源改為僅列出施工日（`selectableDays = workDays && workDays.length > 0 ? workDays : all`），徹底排除非施工日 Checkbox
- [x] T008 [US2] 完善「依施工日期顯示」與「選取所有施工日」按鈕行為，確保使用者可快速重設或全選施工日

**Checkpoint**: User Stories 1 與 2 皆可獨立運作，使用者僅能在實際施工日內勾選，杜絕範圍外日期錯誤。

---

## Phase 5: Polish & Verification (收尾與驗證)

**Purpose**: 整合驗證與程式碼整潔度

- [x] T009 依照 [quickstart.md](file:///c:/Users/angel.wei/code/construction-documents/specs/001-quantities-work-dates-sync/quickstart.md) 執行瀏覽器端驗收情境
- [x] T010 檢查程式碼註釋一律為繁體中文，且無裝飾性表情符號（符合憲章規範）

---

## Dependencies & Execution Order

1. **Phase 1 & 2**：檢查與前置驗證（循序）
2. **Phase 3 (User Story 1)**：核心 MVP，先完成欄位連動
3. **Phase 4 (User Story 2)**：選單與互動體驗優化（依賴 US1 完成）
4. **Phase 5**：整合驗收與規範檢核
