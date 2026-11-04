---
description: "Task list for Fix Item Row Enter Submission Bug"
---

# Tasks: 修復工項數量輸入按 Enter 誤觸移除按鈕問題 (Fix Item Row Enter Submission Bug)

**Input**: Design documents from `specs/003-fix-item-row-enter-submission/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`  
**Target Code**: `web/app/projects/[id]/quantities/board.tsx`  

---

## Phase 1: Setup (準備工作)

**Purpose**: 檢視現有 `ItemRow` 表單結構與按鈕語意

- [x] T001 檢視 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 內 `ItemRow` 的 `<form>`、移除按鈕與「儲存工項」按鈕定義

---

## Phase 2: User Story 1 - 輸入本月數量按 Enter 鍵正常儲存並防止誤刪 (Priority: P1) 🎯 MVP

**Goal**: 消除按 Enter 鍵隱含提交移除按鈕的 Bug，使按下 Enter 鍵時平順失焦並執行正常數量儲存，工項絕不消失。

**Independent Test**:
進入任一路段，在工項「本月數量」輸入框填寫新數字並直接按下 Enter 鍵，確認工項穩定留於畫面上，且即時顯示「已儲存」。

### Implementation for User Story 1

- [x] T002 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 將最左側「×」移除按鈕從 `type="submit"` 改為 `type="button"`，並改以 `onClick={() => void queue.submit(true)}` 觸發
- [x] T003 [US1] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 於「本月數量」輸入框（`name="target"`）及各日期數量輸入框加入 `onKeyDown` 處理，在偵測到 `Enter` 鍵時呼叫 `e.currentTarget.blur()` 平順觸發失焦儲存

**Checkpoint**: User Story 1 完成，輸入數量按 Enter 鍵不再誤觸移除，正常進行數值儲存。

---

## Phase 3: User Story 2 - 「移除工項」操作明確分離與防呆隔離 (Priority: P2)

**Goal**: 確保破壞性移除操作與一般儲存操作完全解耦，手動點擊「×」時維持 100% 正常移除機制。

**Independent Test**:
手動點擊工項最左側的「×」按鈕，確認工項順利被移除，且可從上方「加入工項（可搜尋）」下拉選單重新加入。

### Implementation for User Story 2

- [x] T004 [US2] 簡化 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 中 `ItemRow` 的 `onSubmit` 處理常式，確保表單唯一提交目標為正常儲存（`queue.submit(false, !!syncNeeded)`）

**Checkpoint**: User Stories 1 與 2 皆可獨立運作，移除操作防呆徹底隔離。

---

## Phase 4: Polish & Verification (收尾與驗證)

**Purpose**: 依快速驗收指引進行端對端驗收與程式碼整潔度檢核

- [x] T005 依據 [quickstart.md](file:///c:/Users/angel.wei/code/construction-documents/specs/003-fix-item-row-enter-submission/quickstart.md) 執行輸入數量按 Enter 鍵與手動移除之驗收測試
- [x] T006 檢核修改之程式碼註釋符合繁體中文標準，無表情符號（符合憲章規範）
- [x] T007 [US3] 在 [board.tsx](file:///c:/Users/angel.wei/code/construction-documents/web/app/projects/[id]/quantities/board.tsx) 移除每列工項底部常態顯示的「儲存工項」按鈕，並於 `queue.failed` 狀態時動態提供微型「點此重試儲存」按鈕
- [x] T008 [US3] 在 [legacy.css](file:///c:/Users/angel.wei/code/construction-documents/web/app/legacy.css) 將全站共用主按鈕 `.old-primary` 升級為統一科技藍（`#0284c7`，Hover `#0369a1`）
- [x] T009 依據 [quickstart.md](file:///c:/Users/angel.wei/code/construction-documents/specs/003-fix-item-row-enter-submission/quickstart.md) 驗證自動儲存、錯誤重試按鈕與主視覺藍色系顯示正常

---

## Dependencies & Execution Order

1. **Phase 1**：檢視結構（T001）
2. **Phase 2 (User Story 1)**：核心修復，調整移除按鈕屬性與 Enter 失焦處理（T002 ~ T003）
3. **Phase 3 (User Story 2)**：解耦 onSubmit 邏輯（T004）
4. **Phase 4**：移除常態按鈕、新增失敗重試、全站按鈕主題色升級與繁體中文規範檢核（T005 ~ T009）
