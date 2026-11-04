# 資料與狀態模型 (Data Model): 數量看板專業報表排版重構

**功能**: `004-quantities-table-layout-redesign`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 1. 前端視圖展示模型 (Presentation Model)

本次重構專注於前端視圖層結構與樣式最佳化，不變更後端 Supabase 資料模型：

### 1.1 工項列展示屬性映射 (`ItemRowPresentation`)

| 介面欄位 | 資料來源 | 對齊方式 | 樣式類別 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **操作** | 靜態按鈕 | 置中 | `.btn-remove` | 24x24 微型圓角按鈕 |
| **工項代碼** | `item.code` | 靠左 | `.item-code` | 等寬加粗字體 |
| **工作項目規格** | `item.name`, `item.unit` | 靠左 | `.item-name-group` | 標題 + 淺灰單位標籤 |
| **本月數量** | `target.target_quantity` | 靠右 | `.input-number` | 等寬加粗數值輸入框 |
| **單價** | `item.unit_price` | 靠右 | `.item-price` | 格式化千分位文字 |
| **本月金額** | `target_quantity * unit_price` | 靠右 | `.item-amount` | 格式化千分位深藍高亮 |
| **備註** | `target.note` | 靠左 | `.input-note` | 多行尺寸算式輸入框 |
| **每日數量** | `daily_quantities.quantity` | 靠右 | `.input-day-qty` | 橫向日曆滾動輸入格 |

---

## 2. 每日分配狀態計算流轉 (Allocation Status)

```
allocated = sum(每日數量)
remaining = 本月數量 - allocated

當 remaining === 0:
  狀態標籤: "✓ 已完全分配" (綠色，.status-exact)

當 remaining < 0:
  狀態標籤: "超出 {abs(remaining)}" (紅色，.status-over)

當 remaining > 0:
  狀態標籤: "尚可分配 {remaining}" (灰色，.status-rem)
```
