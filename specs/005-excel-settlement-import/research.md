# Phase 0: 架構調研與技術決策 (Research & Technical Decisions)

**功能名稱**：上傳與匯入 Excel 結算單功能 (Excel Settlement Import)  
**分支**：`005-excel-settlement-import`  
**建立日期**：2026-11-06  

---

## 1. 核心技術選型與決策

### 決策 1：Excel 解析引擎架構（Python Worker vs Node.js 原生解析）
* **背景評估**：
  * 原舊系統（`jin02`）於 `app/importer.py` 已經建構了完整且經過驗證的結算單試算表逆向解析演算法，深度相容「施工路段表」、「04.數量分析」與「03.數量計算」之複雜儲存格格位、合併儲存格、動態列數及工程類型判定。
  * 目前 Next.js 專案於 `migration_tools/web_excel_worker.py` 已成熟採用「Node.js 子行程呼叫 Python 處理 Excel」之模式，並於 `Dockerfile` 與執行環境配置完善。
* **評估選項**：
  * **選項 A（Node.js 端重寫，如 xlsx/exceljs）**：需完全重新撰寫格位解析、數十種邊界情況與合併儲存格對齊邏輯，風險極高且容易引入微妙的試算表欄位錯位。
  * **選項 B（Python Importer Worker 架構）**：整合 `jin02/app/importer.py` 至 `migration_tools/web_excel_importer.py`，由 Node.js 後端以標準 I/O（`stdin` 傳入二進位、`stdout` 輸出 JSON）進行非同步子行程調用。
* **最終決策**：**採納選項 B**。沿用 Python `openpyxl` 引擎，確保 100% 繼承 `jin02` 的解析精度與規則，大幅降低維護成本與潛在 Bug。

---

### 決策 2：資料庫寫入策略與交易一致性 (Supabase Transaction & Batching)
* **背景評估**：
  * 單月結算單包含 1 個期程、約 10~18 個施工路段、數十項契約工項，以及數百至上千筆每日施作數量（`daily_quantities`）。
  * 若逐筆寫入資料庫，HTTP 來回將造成數十秒延遲；若中途失敗，可能殘留部分路段或孤立數量。
* **處理解決方案**：
  1. **期程判定**：比對該標案是否有對應起始日期的 `reporting_periods`，無則自動新建，有則重用。
  2. **路段處理**：依 `(period_id, item_number)` 進行 Upsert，更新 `name`、`work_dates` 與 `note`。
  3. **工項與目標量綁定**：
     * 預先以單一查詢快取該標案之全部契約工項（`contract_items`），以 `code` 為鍵建立查詢字典。
     * 批次建立或取得 `work_order_items`，並 Upsert 至 `item_period_targets`。
  4. **每日數量批次寫入**：將日數（1~31）轉為 `YYYY-MM-DD`，過濾值為 0 或空之數量，使用 Supabase 批次 Upsert（Chunk 200 筆/次）寫入 `daily_quantities`。
  5. **原子性防護**：如遇到致命錯誤（如契約不相符或標案類型錯誤），在解析階段即行中止，完全不觸發任何資料庫寫入。

---

### 決策 3：前後端分工與上傳介面體驗 (UI / UX Flow)
* **伺服器端與客戶端邊界**：
  * **Server Action (`importSettlementExcel`)**：負責權限檢核（`requireUser`）、檔案安全檢查、調用 Python Importer、寫入 Supabase、產出結果摘要。
  * **Client Component (`ExcelImportModal` / `UploadTrigger`)**：
    * 支援檔案選擇按鈕與拖曳（Drag & Drop）上傳。
    * 提供檔案格式（`.xlsx`）與大小檢驗（<= 30MB）。
    * 上傳中呈現轉圈載入狀態（避免重複點擊）。
    * 匯入完成後顯示結構化對話框，清楚呈現「匯入路段數」、「數量筆數」與「警告提示清單」。

---

## 2. 安全性與邊界防護調研

1. **檔案安全**：
   * Python 端 `openpyxl.load_workbook` 開啟時強制設定 `data_only=True`，僅提取計算結果數值，不執行巨集程式碼。
   * 限制單次上傳檔案二進位上限 30MB，防止記憶體耗盡（OOM）攻擊。
2. **類型隔離**：
   * 自動比對試算表特徵（如「03.數量計算」之表頭特徵）：
     * 若為公園工程卻上傳雨水結算單，或反之，立即中斷並拋出明確業務錯誤。
3. **工項未知代碼處理**：
   * 不得將未知代碼強制插入資料庫，僅略過該筆資料並將其加入 `warnings` 清單，保障資料庫關聯完整性。
