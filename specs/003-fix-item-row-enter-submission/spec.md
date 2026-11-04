# Feature Specification: 修復工項數量輸入按 Enter 誤觸移除按鈕問題 (Fix Item Row Enter Submission Bug)

**Feature Branch**: `003-fix-item-row-enter-submission`  
**Created**: 2026-11-04  
**Status**: Draft  
**Input**: 修復在 `/quantities` 頁面工項列（`ItemRow`）中輸入「本月數量」後按下鍵盤 Enter 鍵，因 HTML 表單隱含提交（Implicit Submission）預設觸發第一個 submit 按鈕（`×` 移除按鈕）導致工項被誤刪除消失的問題。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 輸入本月數量按 Enter 鍵正常儲存並防止誤刪 (Priority: P1)

作為工程核銷人員，在「每日數量與帳務總覽」（`/quantities`）頁面編輯工項之「本月數量」並按下鍵盤 Enter 鍵時，我希望系統執行正常的數量儲存並平順失焦（Blur），避免因瀏覽器預設行為誤觸左側「×」移除按鈕而將該工項標記為已移除並從畫面消失。

**Why this priority**: 這是造成使用者填報資料嚴重丟失或誤以為系統壞掉的重大操作陷阱（Critical Bug）。使用者輸入數字後按 Enter 是極為普遍的習慣，若按 Enter 反而觸發刪除，將嚴重破壞系統信任度。

**Independent Test**:
進入任一工程標案之 `/quantities` 頁面展開路段，在任一工項的「本月數量」輸入框填入新數字（例如 `15`），隨後直接在鍵盤上按下 `Enter` 鍵。確認該工項穩定保留在畫面上、顯示「已儲存」提示，且金額正確更新，工項絕不消失。

**Acceptance Scenarios**:
1. **Given** 使用者在工項列之「本月數量」輸入框修改數值，  
   **When** 使用者在輸入框內按下鍵盤 `Enter` 鍵，  
   **Then** 系統觸發正常的數量儲存（`queue.submit(false)`），該工項穩固留於畫面上，不會觸發移除操作。
2. **Given** 儲存執行完畢，  
   **When** 後端回傳成功狀態，  
   **Then** 狀態列顯示「已儲存」，該工項之本月金額與小計即時更新，工項列不會被從 DOM 列表中移除。

---

### User Story 2 - 「移除工項」操作明確分離與防呆隔離 (Priority: P2)

作為填報人員，當我明確想要移除某個工項時，我希望點擊工項最左側的「×」按鈕能正常執行移除操作，但該按鈕必須徹底自表單的預設鍵盤提交（Implicit Submission）序列中隔離，確保其只能由滑鼠主動點擊或特定無障礙操作觸發。

**Why this priority**: 明確區分「安全送出操作（儲存）」與「破壞性操作（移除）」，建立防呆邊界，防止任何鍵盤焦點意外觸發刪除。

**Independent Test**:
在工項列中主動以滑鼠點擊最左側的「×」按鈕，確認該工項順利被移除（可恢復）；但在其他任意文字或數字欄位中按 Enter，絕對不觸發該移除按鈕。

**Acceptance Scenarios**:
1. **Given** 工項最左側呈現「×」移除按鈕，  
   **When** 使用者以滑鼠主動點擊該按鈕，  
   **Then** 系統正常向後端發送 `operation: "remove"` 請求，並安全將工項移出當前列表。
2. **Given** 使用者焦點停留在工項列中之備註（`textarea`）或每日日期數量輸入框，  
   **When** 觸發任何表單預設行為或提交時，  
   **Then** 絕對不以「移除工項」作為提交目標。

---

### User Story 3 - 移除常態儲存按鈕全面自動儲存，並提供失敗重試機制 (Priority: P2)

作為填報人員，在工項數量輸入已具備失焦與 Enter 自動儲存的前提下，我希望工項列移除底部冗餘的「儲存工項」按鈕以精簡排版；且當網路不穩或伺服器發生錯誤導致儲存失敗時，狀態列能動態出現「重試」按鈕供我手動重送。

**Why this priority**: 減少冗餘 UI 操作、提升填報流暢感，同時保留例外失敗時的使用者主動恢復手段。

**Independent Test**:
檢視工項列底部，確認常態下無「儲存工項」按鈕；輸入數量失焦或按 Enter 自動儲存；若刻意切斷連線或模擬失敗，狀態列出現「點此重試儲存」按鈕，點擊後能重新觸發儲存。

**Acceptance Scenarios**:
1. **Given** 工項處於常態檢視或編輯狀態，  
   **When** 檢視工項底部操作區，  
   **Then** 不顯示常態的「儲存工項」按鈕，版面保持精簡。
2. **Given** 儲存請求失敗（`queue.failed === true`），  
   **When** 狀態列轉為錯誤提示，  
   **Then** 動態顯示「點此重試儲存」微型按鈕，使用者點擊即可重新執行儲存流程。

---

### Edge Cases

- **單一施工日自動同步模式**：當該路段僅有單一施工日且需要同步數量時（`syncNeeded = true`），按下 Enter 鍵應正確連帶同步該單日數量並儲存，不產生衝突。
- **快速連擊 Enter 鍵**：若使用者快速連續按下 Enter 鍵，前端佇列（`QuantitySaveQueue`）應維持既有的序列化防抖（Coalescing）機制，不發送重複或混亂之請求。
- **無效輸入防呆**：若輸入之數字不符合格式（例如負數或超過小數位數），按下 Enter 應維持既有的 HTML 格式驗證提示，不向伺服器發送錯誤資料。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須將 `ItemRow` 內最左側的「×」移除按鈕自表單的預設提交行為中抽離，將其從 `type="submit"` 改為非預設提交控制項（如 `type="button"` 搭配專屬點擊處理），徹底禁止其響應鍵盤 Enter 鍵隱含提交。
- **FR-002**: 系統必須確保 `ItemRow` 表單內的預設 Enter 鍵提交目標嚴格限定為「儲存工項」（`queue.submit(false)`），完全禁止提交 `operation: "remove"`。
- **FR-003**: 系統必須在「本月數量」及各日期數量輸入框支援按下 Enter 鍵時，平順觸發失焦（Blur）並進入正常的非同步差量儲存流程。
- **FR-004**: 系統必須保留使用者以滑鼠點擊「×」時的原生移除功能，確保其與現有後端 `save_monthly_item(p_remove=true)` RPC 契約 100% 相容。
- **FR-005**: 系統必須移除每列工項常態顯示的「儲存工項」按鈕，統一由失焦（Blur）及 Enter 鍵平順自動儲存接管。
- **FR-006**: 系統必須在非同步儲存失敗（`queue.failed === true`）時，於狀態提示區動態提供微型「點此重試儲存」按鈕，允許使用者手動重送儲存請求。
- **FR-007**: 系統全站主按鈕樣式（`.old-primary`）由舊版珊瑚紅統一升級為科技藍（`#0284c7`，Hover `#0369a1`），使操作反饋與整體介面主視覺協調一致。

---

### Key Entities

- **ItemPeriodTarget (`item_period_targets`)**: 當月路段工項實體，關鍵屬性為 `id`、`target_quantity`、`note`、`revision`、`removed`。
- **QuantitySaveQueue**: 前端數量儲存差量佇列，核心方法為 `submit(remove: boolean, force: boolean)`。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在「本月數量」輸入框中輸入數值後按下鍵盤 Enter 鍵，誤觸移除（`remove`）發生率降為 0%。
- **SC-002**: 按下 Enter 鍵後的數值儲存成功率達 100%，工項保留於畫面上且即時顯示「已儲存」回饋。
- **SC-003**: 主動點擊「×」按鈕時之工項移除功能 100% 正常運作，無回歸缺陷。

---

## Assumptions

- 專案維持現有 Next.js 16 App Router 與 React 19 架構。
- 後端 `saveItem` 與 RPC `save_monthly_item` 之資料庫存取契約無需變更，本次修正專注於前端表單事件與按鈕語意之防呆修復。
