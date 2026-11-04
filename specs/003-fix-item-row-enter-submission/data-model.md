# 資料與狀態模型 (Data Model): 修復工項數量輸入按 Enter 誤觸移除按鈕問題

**功能**: `003-fix-item-row-enter-submission`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 1. 實體關聯與影響範圍

本次修復純屬前端 DOM 事件與表單控制項屬性之調整，不變更後端 Supabase 資料庫欄位結構：

### 1.1 工項期別目標表 (`item_period_targets`)
- 欄位：`id` (UUID), `target_quantity` (numeric), `note` (text), `revision` (integer), `removed` (boolean)
- 影響：修正前按 Enter 錯誤觸發 `removed = true`；修正後按 Enter 正確更新 `target_quantity` 並維持 `removed = false`。

---

## 2. 佇列狀態與動作映射 (Action Mapping)

| 操作動作 | 觸發來源 | 呼叫方法 | 傳送參數 | 後端 RPC 行為 | 預期前端結果 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **手動點擊移除** | 點擊「×」按鈕 | `queue.submit(true)` | `operation: "remove"` | 標記 `removed = true` | 工項自當前清單移除（可從加入選單恢復） |
| **輸入數量按 Enter** | 數量輸入框按 Enter | `queue.submit(false)` 或 `blur()` 觸發自動儲存 | `target: "數量"` | 更新 `target_quantity` | 工項留在畫面上，提示「已儲存」，更新金額 |
| **切換焦點失焦** | 輸入框 onBlur | `queue.submit(false)` | 差量數值 | 更新異動欄位 | 提示「已儲存」 |
| **儲存失敗重試** | 點擊「點此重試儲存」按鈕（`queue.failed === true`） | `queue.submit(false, syncNeeded)` | 既有異動差量數據 | 重新發送更新請求 | 重新進入儲存佇列，成功後恢復「已儲存」狀態 |
