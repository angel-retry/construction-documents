# 開發步驟與進度檢核表 (TODO & Roadmap)

專案目標：實作施工路段（`/sites`）施工日期月曆多選與連續區間自動格式化功能。

---

## 任務檢核清單

### 階段一：演算法與工具函式實作
- [x] 1.1 實作連續日期合併演算法 `formatDaysToRange(year, month, days)`
- [x] 1.2 撰寫測試或驗證函式，涵蓋：
  - [x] 單一獨立日
  - [x] 雙日連續區間
  - [x] 多組離散與連續混和區間
  - [x] 空選取狀態
- [x] 1.3 驗證反向解析函式相容性（`workDatesToDays`）

### 階段二：多選月曆元件 (DateMultiPicker) 開發
- [x] 2.1 建立 `web/app/projects/[id]/sites/date-picker.tsx` 元件結構
- [x] 2.2 實作民國年月曆視圖：
  - [x] 依民國年與月份計算該月總天數（28~31天）
  - [x] 計算首日星期偏移（日、一、二、三、四、五、六）
- [x] 2.3 實作多選互動與狀態管理：
  - [x] 點選切換（Toggle）高亮狀態
  - [x] 快捷功能：「全選工作日 (週一至週五)」、「全選整月」、「一鍵清空」
- [x] 2.4 浮層開關與點擊外部關閉（Click Outside）處理

### 階段三：編輯器整合 (SiteEditor)
- [x] 3.1 在 `web/app/projects/[id]/sites/editor.tsx` 引入 `DateMultiPicker`
- [x] 3.2 在「施工日期」輸入框旁加入月曆開關按鈕
- [x] 3.3 綁定雙向回寫：月曆選取時即時同步至 `draft.work_dates` 並標記 `dirty`
- [x] 3.4 保持文字框手動編輯相容性 (v1.0)
- [x] 3.5 將施工日期輸入框設為唯讀 (readOnly) 並支援點擊開啟月曆 (v1.1)

### 階段四：相容性與驗收驗證
- [x] 4.1 驗收準則 AC-1 ~ AC-7 測試（建立於 `web/tests/work-dates.test.mjs`）
- [x] 4.2 驗證透過月曆選取儲存後，後端 `saveSite` 能否成功寫入 Supabase（由使用者於瀏覽器驗證）
- [x] 4.3 驗證數量看板（`/quantities`）能否正常讀取該施工日期（由使用者於瀏覽器驗證）
