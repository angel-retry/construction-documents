# 架構調研與技術決策 (Research): 數量看板專業報表排版重構

**功能**: `004-quantities-table-layout-redesign`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 調研主題 1: CSS Grid 欄位精確對齊機制

### 背景與挑戰
目前數量看板中，表頭的 `<span>` 元素與工項列中的 `<span>`、`<input>`、`<textarea>` 各自呈現，缺乏統一的分欄寬度約束，導致小數點與欄位無法上下垂直齊平，視覺凌亂。

### 決策方案 (Decision)
1. **共用標準 Grid 軌道定義**：
   表頭（`.quantity-account-head`）與資料列（`.quantity-account`）統一採用相同之 CSS Grid 定義：
   ```css
   grid-template-columns: 24px 80px minmax(0, 2fr) 95px 85px 105px minmax(130px, 1.6fr);
   gap: 8px;
   align-items: center;
   ```
   - 欄位 1 (24px)：操作按鈕（「×」移除鈕）
   - 欄位 2 (80px)：工項代碼（等寬字型）
   - 欄位 3 (2fr)：工作項目名稱規格與單位標籤（防溢出截斷）
   - 欄位 4 (95px)：本月數量（靠右對齊輸入框）
   - 欄位 5 (85px)：單價（靠右對齊數值）
   - 欄位 6 (105px)：本月金額（靠右對齊高亮數值）
   - 欄位 7 (1.6fr)：尺寸算式/備註（多行精巧輸入框）
2. **零偏差保證**：透過嚴格對齊的 CSS Grid 軌道，確保表頭與每一筆資料列的欄寬 100% 絕對齊平。

---

## 調研主題 2: 數字排版與視覺高亮規範 (Numeric Typography & Accent)

### 背景與挑戰
工程報表中包含千分位、浮點數與貨幣，若使用非等寬比例字體或靠左排列，數值的小數點會呈現鋸齒狀錯位，難以快速掃視核算。

### 決策方案 (Decision)
1. **靠右等寬排列**：
   所有數值欄位（數量、單價、金額、每日數量）統一強制套用：
   ```css
   text-align: right;
   font-variant-numeric: tabular-nums;
   font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
   ```
2. **金額層次突顯**：
   - 「本月金額」採用深藍色重點標註（`#0284c7`，`font-weight: 700`），使審核人員一眼掌握各工項財務規模。
   - 「單價」與「未填寫之 0 數量」適度淡化（`#64748b`、`#94a3b8`），降低畫面視覺噪音。

---

## 調研主題 3: 樣式隔離保證 (CSS Scope Isolation)

### 決策方案 (Decision)
所有新增與修改之 CSS 選擇器，均嚴格限定在 `.quantity-*` 範疇內（如 `.quantity-column-head`、`.quantity-account`、`.quantity-row-item`）。
經全專案檢索確認，專案中除 `board.tsx` 外無任何其他頁面使用 `quantity-*` 前綴，保證具備 100% 的樣式隔離，絕不影響其他頁面。
