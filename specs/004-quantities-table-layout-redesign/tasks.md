---
description: "Task list for Quantities Table Layout Redesign implementation"
---

# Tasks: 數量看板專業報表排版重構 (Quantities Table Layout Redesign)

**Input**: Design documents from `specs/004-quantities-table-layout-redesign/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`  
**Target Code**: `web/app/projects/[id]/quantities/board.tsx`, `web/app/legacy.css`  

---

## Phase 1: Setup (準備工作)

**Purpose**: 檢視現有 `board.tsx` 結構與 CSS 定義

- [x] T001 檢視 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 內 `SiteBlock` 表頭與 `ItemRow` 的欄位排版結構
- [x] T002 檢視 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 內既有之 `.quantity-account`、`.quantity-column-head` 與 `.quantity-item` 樣式

---

## Phase 2: Foundational (基礎樣式與 Grid 軌道標準)

**Purpose**: 確立現代化 Grid 軌道與等寬數值基礎規範

- [x] T003 [P] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 確立現代化 Grid 軌道標準（`.quantity-account` 與 `.quantity-account-head`）及數值靠右等寬基礎類別（`.text-right`、`.font-mono`、`.tabular-nums`）

**Checkpoint**: 基礎樣式規範就緒，可開始重構表頭與資料列。

---

## Phase 3: User Story 1 - 現代化專業表頭骨架與數值靠右對齊 (Priority: P1) 🎯 MVP

**Goal**: 表頭具備淺灰底色（`#f1f5f9`）與分欄邊界骨架；「本月數量」、「單價」、「本月金額」嚴格靠右對齊並套用等寬字型，深藍色金額高亮。

**Independent Test**:
進入特定標案之 `/quantities` 展開任一路段，確認表頭具備淺灰底色與清晰邊框；確認所有工項之數量、單價、金額數值 100% 靠右垂直對齊。

### Implementation for User Story 1

- [x] T004 [US1] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 實作 `.quantity-column-head` 淺灰底色（`#f1f5f9`）、邊框與圓角骨架樣式，並設定深藍色金額高亮（`.item-amount-text`）
- [x] T005 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 的 `SiteBlock` 更新表頭 JSX 結構，將「本月數量」、「單價」、「本月金額」標記靠右類別，並完善右側每日完成數量副標題
- [x] T006 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 的 `ItemRow` 更新左側帳務數值欄位（代碼加粗、本月數量輸入框靠右等寬、單價靠右、本月金額靠右高亮）

**Checkpoint**: User Story 1 完成，表頭骨架清晰，所有數值欄位 100% 垂直靠右等寬對齊。

---

## Phase 4: User Story 2 - 資料列邊界層次、懸停高亮與微型移除按鈕 (Priority: P2)

**Goal**: 資料列具備行間分隔底線、滑鼠懸停（hover）淡雅高亮底色與優雅防呆微型按鈕。

**Independent Test**:
滑鼠在工項列上下移動確認該列切換為懸停高亮（`#f8fafc`）；滑鼠移至最左側「×」按鈕確認呈現淡紅底色提示。

### Implementation for User Story 2

- [x] T007 [US2] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 新增資料列容器邊框（`.quantity-rows-container`）、行間分隔線與滑鼠懸停底色（`.quantity-row-item:hover`）
- [x] T008 [US2] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 重構微型移除按鈕樣式（`.quantity-remove-btn`，24x24px 圓角淡灰圖示，hover 變淡紅底色與紅色文字）
- [x] T009 [US2] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 的 `ItemRow` 套用新式微型移除按鈕與行容器 class

**Checkpoint**: User Story 2 完成，工項列層次分明，具備懸停高亮與精緻微型按鈕。

---

## Phase 5: User Story 3 - 每日完成數量狀態回饋與無資料引導 (Priority: P3)

**Goal**: 每日分配進度呈現色彩狀態標籤（完全分配為綠色、超出為紅色），未加入工項時顯示卡片式空狀態引導。

**Independent Test**:
每日數量完全分配時確認顯示綠色「✓ 已完全分配」；超出時顯示紅色警示；尚未加入工項時顯示空狀態卡片。

### Implementation for User Story 3

- [x] T010 [US3] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 定義每日數量分配狀態色彩（`.status-exact` 綠色、`.status-over` 紅色、`.status-rem` 灰色）與空狀態卡片（`.quantity-empty-state`）
- [x] T011 [US3] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 更新每日分配合計摘要文字與狀態樣式標記，並在尚未加入工項時呈現引導空狀態卡片

**Checkpoint**: User Story 3 完成，分配狀態即時回饋，空狀態友善引導。

---

## Phase 6: Polish & Verification (收尾與驗證)

**Purpose**: 依快速驗收指引進行視覺驗收與全專案樣式隔離檢核

- [x] T012 依照 [quickstart.md](file:///c:/Users/angel.wei/code/construction-documents/specs/004-quantities-table-layout-redesign/quickstart.md) 執行三項驗收情境之視覺確認
- [x] T013 檢核所有 CSS 變更嚴格隔離於 `quantity-*` 範疇，確認其他頁面（`/sites`、`/prior`、`/export` 等）100% 不受影響
- [x] T014 檢核所有新增程式碼註釋符合繁體中文標準，無表情符號

---

## Dependencies & Execution Order

1. **Phase 1 & 2**：基礎結構檢視與 Grid 軌道標準設定（T001 ~ T003）
2. **Phase 3 (User Story 1)**：核心 MVP，表頭骨架與數值靠右對齊（T004 ~ T006）
3. **Phase 4 (User Story 2)**：行間分隔線、懸停反白與微型按鈕（T007 ~ T009）
4. **Phase 5 (User Story 3)**：分配色彩狀態與空狀態引導（T010 ~ T011）
5. **Phase 6**：端對端視覺驗收與樣式隔離檢核（T012 ~ T014）
