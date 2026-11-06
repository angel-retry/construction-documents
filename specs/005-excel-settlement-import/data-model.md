# Phase 1: 資料模型與狀態架構設計 (Data Model & Schema)

**功能名稱**：上傳與匯入 Excel 結算單功能 (Excel Settlement Import)  
**分支**：`005-excel-settlement-import`  
**建立日期**：2026-11-06  

---

## 1. Python Importer 解析輸出中間結構 (Intermediate JSON Schema)

Python Worker 解析 Excel 後，透過 `stdout` 輸出的 JSON 資料契約：

```typescript
export interface ParsedSettlementData {
  kind: "park" | "rainwater";
  roc_year: number;              // 民國年，例如 115
  month: number;                 // 月份 1~12
  project_name: string;          // 工程名稱
  owner: string;                 // 主辦機關
  location: string;              // 施工地點
  sites: ParsedSite[];           // 施工路段清單
  quantities: ParsedQuantity[];  // 每日數量明細
  item_targets: Record<string, number>; // 鍵: "{site_id}|{code}", 值: 目標數量
  item_notes: Record<string, string>;   // 鍵: "{site_id}|{code}", 值: 尺寸計算式備註
  warnings: string[];            // 警示字串清單
}

export interface ParsedSite {
  site_id: number;               // 路段項次 (如 1, 2, 51)
  name: string;                  // 路段名稱
  work_dates: string;            // 施工日期區間字串 (如 "115/8/1~115/8/3")
  note: string;                  // 路段備註
}

export interface ParsedQuantity {
  site_id: number;               // 所屬路段項次
  item_code: string;             // 工項代碼 (如 "一.(一).1")
  day: number;                   // 施工日 (1~31)
  quantity: number;              // 實作數量
}
```

---

## 2. 資料庫實體對應映射 (Database Entity Mapping)

| 來源解析欄位 (Parsed Field) | 目標 Supabase 資料表 | 欄位名稱 | 轉換與寫入規則 |
| :--- | :--- | :--- | :--- |
| `roc_year`, `month` | `reporting_periods` | `period_start`, `period_end` | 轉為西元年月初至月底（例如 `2026-08-01` ~ `2026-08-31`）。若已存在則復用 `id`，不存在則新建。 |
| `site.site_id` | `monthly_sites` | `item_number`, `sort_order` | 項次號碼，保持與試算表一致排序。 |
| `site.name` | `monthly_sites` | `name` | 路段名稱或派工地號。 |
| `site.work_dates` | `monthly_sites` | `work_dates` | 施工日期字串（支援連續區間與頓號分隔）。 |
| `site.note` | `monthly_sites` | `note` | 路段專案備註。 |
| `code` (比對契約) | `work_order_items` | `contract_item_id` | 透過 `contract_items.code` 關聯取得主鍵 ID。 |
| `item_targets["{sid}\|{code}"]` | `item_period_targets` | `target_quantity` | 目標數量（浮點數）。 |
| `item_notes["{sid}\|{code}"]` | `item_period_targets` | `note` | 尺寸規格計算式備註字串。 |
| `q.day`, `q.quantity` | `daily_quantities` | `work_date`, `quantity` | `work_date` 依年月與 `day` 組裝為 `YYYY-MM-DD`；`quantity` 記錄施作數值。 |

---

## 3. 前端呼叫與回饋合約 (Client-Server Contract)

### 請求 (Request)
* 透過 Server Action `importSettlementExcel(formData: FormData)`
* 表單欄位：
  * `projectId`: `string` (UUID)
  * `file`: `File` (Excel 試算表二進位資料)

### 回應 (Response)
```typescript
export interface ImportSettlementResponse {
  success: boolean;
  message: string;
  data?: {
    rocYear: number;
    month: number;
    sitesCount: number;
    quantitiesCount: number;
    warnings: string[];
  };
}
```
