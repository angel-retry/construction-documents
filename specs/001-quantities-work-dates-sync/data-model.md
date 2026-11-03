# Data Model & State Design: 數量看板顯示日期與施工路段連動

## 1. 資料實體 (Data Entities)

### `MonthlySite` (既有實體 `monthly_sites`)
* `id`: string (UUID)
* `period_id`: string (UUID)
* `item_number`: number (項次)
* `name`: string (路段名稱)
* `work_dates`: string (民國年施工日期，如 `"115/9/5、115/9/10~115/9/12"`)

---

## 2. 前端狀態介面 (Component State Interface)

在 `SiteBlock` 元件中的狀態派生：

```typescript
export interface SiteDateState {
  /** 該月份所有天數 [1, 2, ..., count] */
  allDays: number[];
  
  /** 依據 site.work_dates 解析出的施工日陣列，若無設定或格式錯誤則為 null */
  workDays: number[] | null;
  
  /** 使用者手動自訂篩選的天數清單，為空時代表遵循預設 */
  customFilter: number[];
  
  /** 最終用於表格欄位渲染的有效日期清單 */
  effectiveDays: number[];
  
  /** 是否處於自訂篩選狀態 (customFilter.length > 0) */
  isCustomFiltered: boolean;
}
```

---

## 3. 狀態流轉規則 (State Flow Rules)

1. **初始狀態**：
   * `customFilter = []`
   * `effectiveDays = workDays && workDays.length ? workDays : allDays`
2. **使用者手動勾選**：
   * 點選特定日期 ➔ `customFilter` 更新 ➔ `effectiveDays = customFilter`
3. **使用者點擊「還原依施工日期顯示」**：
   * 重設 `customFilter = []` ➔ `effectiveDays` 自動復原為 `workDays`。
4. **外部資料變更 (Props 更新)**：
   * 若父層傳入的 `site.work_dates` 發生變動，重新計算 `workDays`，無自訂篩選時即時反映於表格。
