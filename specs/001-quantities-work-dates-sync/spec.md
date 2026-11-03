# Feature Specification: 數量看板顯示日期與施工路段設定連動 (Quantities Page Work Dates Sync)

**Feature Branch**: `001-quantities-work-dates-sync`  
**Created**: 2026-11-02  
**Status**: Draft  
**Input**: [皇喆營造｜施工文件](http://127.0.0.1:3100/projects/f3c19986-aa58-47b9-b6f3-01e8545c49a0/quantities?year=115&month=9) 這個網頁的顯示日期 應該是根據/sites的施工日期渲染，他會跟著這邊設定連動。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 依施工路段設定自動渲染數量欄位日期 (Priority: P1)

作為工程核銷與監工人員，在查看「每日數量與帳務總覽」（`/quantities`）時，我希望每個施工路段所呈現的「每日完成數量」日期欄位，能夠自動精確反映該路段在「施工路段」（`/sites`）中所設定的施工日期（如 115/9/5、115/9/10~9/12），避免每次都需要在龐大的整月 30 天表格中捲動尋找。

**Why this priority**: 數量看板的每日填報與核算高度依賴實際施工日。直接與路段設定連動能大幅減少輸入錯誤與頁面冗餘欄位。

**Independent Test**:
進入特定標案的 `/sites` 頁面設定施工日期（例如 `115/9/5、115/9/10~115/9/12`），隨後切換至 `/quantities` 頁面，該路段的橫向日期欄位預設僅顯示 9/5、9/10、9/11、9/12 這 4 天。

**Acceptance Scenarios**:
1. **Given** 某路段在 `/sites` 設定了施工日期 `115/9/5、115/9/10~115/9/12`，  
   **When** 使用者進入 `/quantities?year=115&month=9` 展開該路段時，  
   **Then** 「每日完成數量」表格預設僅顯示 9/5、9/10、9/11、9/12 之輸入欄位。
2. **Given** 某路段在 `/sites` 尚未設定施工日期（空白），  
   **When** 使用者進入 `/quantities?year=115&month=9` 時，  
   **Then** 系統優雅退回（Fallback）預設顯示該月份完整天數（例如 9 月共 30 天）。

---

### User Story 2 - 「顯示日期」自訂篩選與預設連動 (Priority: P2)

作為填報人員，當我展開路段內的「顯示日期」收合面板時，我希望面板內僅列出該路段已設定的施工日核取方塊（Checkbox），不顯示非施工日，避免誤選到範圍外日期；並提供一鍵全選施工日與一鍵還原連動之功能。

**Why this priority**: 避免使用者勾選到非施工日期造成資料不一致，同時保留在多個施工日中聚焦查看特定幾天的彈性。

**Independent Test**:
路段設定為 9/5、9/10~9/12 時，展開「顯示日期」面板，僅看見 9/5、9/10、9/11、9/12 之 Checkbox，無其他非施工日；取消勾選部分日期後，點擊「選取所有施工日」或「依施工日期顯示」，可立即恢復顯示完整施工日。

**Acceptance Scenarios**:
1. **Given** 某路段設定了施工日期 `115/9/5、115/9/10~115/9/12`，  
   **When** 使用者展開該路段「顯示日期」面板，  
   **Then** 面板內僅列出 9/5、9/10、9/11、9/12 之 Checkbox，不顯示其他月份天數。
2. **Given** 使用者在「顯示日期」中僅勾選部分施工日（例如僅勾選 9/5），  
   **When** 點擊「依施工日期顯示」或「選取所有施工日」，  
   **Then** 表格立即恢復顯示該路段之全部施工日。
3. **Given** 某路段未設定施工日期（空白），  
   **When** 展開「顯示日期」面板，  
   **Then** 安全退回顯示該月份整月份天數之 Checkbox。

---

### Edge Cases

- **跨月或非當月日期**：若 `/sites` 的施工日期包含非當前瀏覽月份的日期（例如在 9 月頁面包含 10/1），系統必須透過 `workDatesToDays` 過濾，只渲染屬於該指定月份（9 月）的天數。
- **施工日期格式異常**：若資料庫內存在歷史手填無效字串，系統不得引發前端崩潰，應安全退回顯示整月。
- **單一施工日自動填報機制**：若該路段僅有單一施工日（例如 `115/9/5`），填寫本月數量時維持既有的自動同步填入當天數值邏輯。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `/quantities` 頁面在渲染路段卡片時，必須直接讀取 `monthly_sites.work_dates` 並透過反向解析工具取得合規日期陣列。
- **FR-002**: 表格「每日完成數量」欄位在無手動篩選時，預設顯示集（`visible`）必須嚴格綁定 `workDatesToDays(site.work_dates)`。
- **FR-003**: 路段標題（`summary`）顯示的施工日期字串必須與 `/sites` 維持即時一致。
- **FR-004**: 「顯示日期」收合面板內的核取方塊（Checkbox）選項來源必須嚴格限制為該路段之施工日期陣列；僅在路段未設定施工日時，才退回顯示整月天數。
- **FR-005**: 當使用者於 `/sites` 更新施工日期並返回 `/quantities` 時，頁面資料必須即時反映最新連動結果。

### Key Entities

- **MonthlySite (`monthly_sites`)**: 施工路段月度資料，核心連動欄位為 `work_dates`（格式如 `115/9/5、115/9/10~115/9/12`）。
- **DailyQuantity (`daily_quantities`)**: 各工項在特定工作日（`work_date`）的實際施工數量。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 路段設定有施工日期時，`/quantities` 橫向日期欄位精確對齊該設定，排除未施工日的冗餘空白欄位。
- **SC-002**: 使用者在 `/sites` 儲存新的施工日期後，切換回 `/quantities` 無需清除快取即可看到連動後的新日期欄位。
- **SC-003**: 反向解析與欄位過濾運算於客戶端 16ms 內（60fps）完成，無卡頓感。

---

## Assumptions

- 專案維持現有 Next.js 16 App Router 與 Supabase 架構。
- 施工日期解析沿用 `web/lib/legacy-work-dates.ts` 中的 `workDatesToDays` 驗證與解析規格。
- 本次連動著重於前端渲染與狀態一致性，不破壞後端現有 `daily_quantities` 之資料庫存取契約。
