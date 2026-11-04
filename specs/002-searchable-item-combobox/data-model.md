# 資料與狀態模型 (Data Model): 整合式可搜尋工項下拉選單

**功能**: `002-searchable-item-combobox`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 1. 實體模型 (Entities)

### 1.1 契約工項選項實體 (`CatalogItemOption`)
代表標案合約中核定的工項項目，由父層傳入可用工項清單：

| 欄位名稱 | 型別 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| `code` | `string` | 工項唯一編號（契約代碼） | `"一.(一).1"` |
| `name` | `string` | 工項名稱或工作項目描述 | `"瀝青混凝土鋪設"` |
| `unit` | `string` | 計價單位 | `"M2"`, `"M3"`, `"式"` |
| `seq` | `number` | 契約原始排序序號 | `10` |

---

## 2. 前端元件狀態模型 (Component State Model)

### 2.1 Combobox 內部狀態 (`ItemComboboxState`)

| 狀態名稱 | 型別 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `query` | `string` | `""` | 使用者在輸入框中打字的搜尋關鍵字 |
| `isOpen` | `boolean` | `false` | 下拉浮層是否處於展開顯示狀態 |
| `selectedCode` | `string` | `""` | 使用者目前已明確點選選定的工項代碼 |
| `selectedLabel` | `string` | `""` | 選定工項後於輸入框中顯示的完整標籤（`代碼｜名稱（單位）`） |

---

## 3. 狀態流轉與生命週期 (State Transitions)

```
[初始狀態]
  query: "", selectedCode: "", isOpen: false
       │
       │ 使用者聚焦 / 點擊輸入框
       ▼
[展開選單狀態]
  isOpen: true, 列出所有可用工項
       │
       │ 使用者輸入關鍵字（例如 "瀝青"）
       ▼
[即時篩選狀態]
  query: "瀝青", 依 contains 過濾可用工項清單
       │
       ├─────────────────────────────────┐
       │ 使用者點擊外部區域 / 按 Esc 鍵   │ 使用者點選特定工項
       ▼                                 ▼
[收合選單]                           [工項選定狀態]
  isOpen: false                       selectedCode: "一.(一).1"
                                      selectedLabel: "一.(一).1｜瀝青混凝土鋪設（M2）"
                                      hidden input name="code" 更新
                                      右側「加入」按鈕啟用 (disabled = false)
                                           │
                                           │ 點擊「加入」送出表單
                                           ▼
                                      [加入成功回傳 (addState.ok = true)]
                                           │
                                           ▼
                                      [自動重置為初始狀態]
                                      query: "", selectedCode: "", isOpen: false
```
