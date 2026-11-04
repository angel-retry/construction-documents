---
description: "Task list for Searchable Item Combobox implementation"
---

# Tasks: 整合式可搜尋工項下拉選單 (Searchable Item Combobox)

**Input**: Design documents from `specs/002-searchable-item-combobox/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`  
**Target Code**: `web/app/projects/[id]/quantities/item-combobox.tsx`, `web/app/projects/[id]/quantities/board.tsx`, `web/app/legacy.css`  

---

## Phase 1: Setup (準備工作)

**Purpose**: 檢視現有元件結構、樣式與表單提交流程

- [x] T001 檢視 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 內 `SiteBlock` 既有之工項加入區段、`addItem` Server Action 與 `available` 清單過濾邏輯
- [x] T002 檢視 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 內既有之 `.quantity-add`、`.quantity-tools` 及 `.old-field` 樣式結構

---

## Phase 2: Foundational (基礎元件與樣式基礎)

**Purpose**: 建立可搜尋下拉選單（Combobox）之型別與浮層樣式基底

- [x] T003 [P] 參照 `contracts/combobox-contract.ts` 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 建立 `ItemCombobox` 元件骨架與型別定義
- [x] T004 [P] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 新增 Combobox 浮層與選項樣式（`.item-combobox` 容器、`.item-combobox-menu` 絕對定位懸浮選單、`.item-combobox-option` 選項懸停反白、`.item-combobox-empty` 查無工項提示）

**Checkpoint**: 基礎型別與 CSS 樣式就緒，可開始實作核心互動邏輯。

---

## Phase 3: User Story 1 - 整合式輸入框展開選單與關鍵字即時過濾 (Priority: P1) 🎯 MVP

**Goal**: 將分開之「搜尋工項文字框」與「原生 select 下拉選單」整合成單一 Combobox 輸入元件，點擊展開清單，打字時即時依工項代碼與名稱模糊過濾，點選後同步選定並可送出加入。

**Independent Test**:
進入特定標案之 `/quantities` 展開任一路段，點擊「加入工項」輸入框，清單立即展開；輸入關鍵字（例如 `瀝青` 或 `一.`），清單即時過濾相符項目；點擊該項目後按「加入」，確認該工項成功加入路段工項表格。

### Implementation for User Story 1

- [x] T005 [US1] 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 實作輸入框聚焦與點擊展開/收合狀態（`isOpen`）與整合文字輸入框
- [x] T006 [US1] 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 實作即時 contains 包含模糊比對邏輯，依使用者輸入同時過濾代碼（`code`）與名稱（`name`），若無相符項目則呈現「查無相符工項」提示
- [x] T007 [US1] 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 實作選項點選邏輯，點選後自動更新輸入框呈現標籤，收合下拉清單，並透過隱藏欄位 `<input type="hidden" name="code" value={selectedCode} />` 同步選定值
- [x] T008 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 的 `SiteBlock` 中移除原先分開的搜尋 input 與原生 `<select>`，替換為 `<ItemCombobox>`，並確認右側「加入」按鈕與 `<form action={addAction}>` 表單提交正常運作

**Checkpoint**: User Story 1 完成，使用者可透過單一輸入框完成工項搜尋、選取並加入路段。

---

## Phase 4: User Story 2 - 下拉清單懸浮呈現與操作防呆防跑版 (Priority: P2)

**Goal**: 確保清單以絕對定位浮層（Overlay）展示，展開時下方日期數量表格 0 位移；支援點擊外部關閉（Click outside）、Escape 鍵退出、清除按鈕，以及表單成功加入後自動重置輸入狀態。

**Independent Test**:
展開下拉清單時觀察下方表格是否維持不動；點擊外部空白處或按下 Escape 鍵確認選單正常收合；成功加入一筆工項後，確認輸入框自動恢復初始空白狀態。

### Implementation for User Story 2

- [x] T009 [US2] 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 透過 `useRef` 與 `pointerdown` 事件監聽實作點擊外部自動收合（Click outside），並支援 `Escape` 鍵退出
- [x] T010 [US2] 在 [item-combobox.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/item-combobox.tsx) 實作清除按鈕（`✕`），選取後若使用者欲重新挑選可一鍵清空選取
- [x] T011 [US2] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 監聽 `addState` 與提交完成狀態，在成功加入工項後自動觸發 `ItemCombobox` 重置，恢復初始 placeholder 狀態
- [x] T012 [US2] 調整並驗證 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 浮層樣式，確保最大高度（`max-height: 280px`）滾動條與陰影視覺細節完善，展開時下方表格維持 0 位移

**Checkpoint**: User Stories 1 與 2 皆可獨立運作，選單操作流暢、視覺無位移且防呆完備。

---

## Phase 5: Polish & Verification (收尾與驗證)

**Purpose**: 依照快速驗收指引進行端對端驗收與程式碼整潔度檢核

- [x] T013 依據 [quickstart.md](file:///c:/Users/angel.wei/code/construction-documents/specs/002-searchable-item-combobox/quickstart.md) 執行三項驗收場景之手動驗收確認
- [x] T014 檢核所有新增程式碼與樣式之註釋一律為繁體中文，且無表情符號（符合憲章規範）

---

## Dependencies & Execution Order

1. **Phase 1 & 2**：環境與樣式基底準備（循序）
2. **Phase 3 (User Story 1)**：核心 MVP，實作整合式 Combobox 輸入框與表單連動
3. **Phase 4 (User Story 2)**：浮層防跑版、外部點擊收合、狀態重置與防呆（依賴 US1 完成）
4. **Phase 5**：整合驗證與繁體中文規範檢核
