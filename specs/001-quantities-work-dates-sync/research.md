# Research & Clarifications: 數量看板顯示日期與施工路段連動

## 1. 現況架構分析 (Current State Analysis)

* **資料來源**：
  * `/sites` 透過 `saveSite` Server Action 將施工日期字串（格式如 `115/9/5、115/9/10~115/9/12`）寫入 `monthly_sites.work_dates`。
  * `/quantities/page.tsx` 透過 `read("monthly_sites", ...)` 撈取當期所有路段記錄，並作為 `sites` 傳遞給 `QuantityBoard`。
* **日期計算與欄位解析**：
  * 在 `board.tsx` 的 `SiteBlock` 中：
    ```ts
    const workDays = workDatesToDays(site.work_dates, year + 1911, month);
    const visible = filter.length ? filter : workDays || all;
    ```
  * `workDatesToDays` 能將字串正確解析為整數陣列（例如 `[5, 10, 11, 12]`）。
* **發現的關鍵使用者體驗問題**：
  1. **篩選器勾選狀態不一致**：
     在 `board.tsx` 中，篩選選單（`details.day-filter`）的核取方塊綁定的是 `filter.includes(day)`。由於初始時 `filter = []`，打開「顯示日期」下拉選單時，畫面呈現「全未勾選」，使用者無法直觀看出目前是根據哪些施工日期在顯示。
  2. **缺少施工日標籤與狀態回饋**：
     下拉選單列出當月所有天數（1~30 日），卻未區分哪些是 `/sites` 所配置的「施工日」，使用者若欲臨時多選非施工日，容易迷失。
  3. **元件 Key 與即時刷新**：
     `SiteBlock` 目前 `key={site.id}`，當 `site.work_dates` 更新後若沒有適度連動 reset `filter`，舊的手動篩選可能遮蔽最新設定。

---

## 2. 釐清點決策 (Resolution of Clarifications)

* **決策 1：預設篩選與連動顯示**
  * 當 `filter` 為空時，「顯示日期」選單標題呈現：`依施工日期顯示（共 N 天：M/D、...）`。
  * 選單中的各個日期標籤加入視覺標註：若該日屬於 `/sites` 施工日，標記 `[施工日]` 標籤與特定樣式。
* **決策 2：選單快速切換操作**
  * 提供「一鍵全選施工日」、「一鍵還原連動（清空篩選）」功能。
* **決策 3：與憲章（Constitution）的相符性**
  * **Principle II (App Router)**：純前端狀態與顯示層改善，不變更後端 API 與 Supabase 存取模型。
  * **Principle III (Domain Logic)**：繼續使用 `web/lib/legacy-work-dates.ts` 的純函式演算法，不重複造輪子。
  * **Principle IV (Traditional Chinese)**：UI 提示與標籤一律繁體中文。
