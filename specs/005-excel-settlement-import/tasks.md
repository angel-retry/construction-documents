# Tasks: 上傳與匯入 Excel 結算單功能 (Excel Settlement Import)

**Input**: Design documents from `specs/005-excel-settlement-import/` (spec.md, plan.md, research.md, data-model.md, contracts/)  
**Prerequisites**: plan.md (架構規劃), spec.md (使用者故事), research.md, data-model.md, contracts/

---

## 任務清單格式說明

- **[P]**：可平行執行之獨立任務（無直接相依檔案）
- **[Story]**：所屬使用者故事（US1、US2、US3）
- 任務皆包含明確的目標檔案路徑與功能範圍

---

## Phase 1: Setup (共用基礎設置)

**目的**：初始化匯入功能之型別定義與契約檔案

- [ ] T001 [P] 建立匯入資料模型與型別合約定義於 `web/lib/excel-import-types.ts`
- [ ] T002 [P] 檢視並確認 Python 執行環境與 `openpyxl` 依賴相容性

---

## Phase 2: Foundational (核心解析基礎設施)

**目的**：完成核心試算表解析與跨進程調用通道，為後續使用者故事提供穩定基礎

**⚠️ 關鍵阻礙**：本階段未完成前，無法進行後續資料寫入與畫面互動

- [ ] T003 建立 Python Excel 逆向解析 Worker 於 `migration_tools/web_excel_importer.py`（移植 `jin02` 解析規則，支援 `stdin` 二進位讀取與 `stdout` JSON 輸出）
- [ ] T004 建立 Node.js 子行程呼叫橋接模組於 `web/lib/excel-import-worker.ts`（支援串流管道、30MB 大小限制、60 秒逾時控制與 `USER_ERROR:` 錯誤處理）

**檢核點**：基礎設施就緒，可透過命令列或單元測試成功解析 `.xlsx` 輸出 JSON。

---

## Phase 3: User Story 1 - 自動建立申報期程與施工路段 (Priority: P1) 🎯 MVP

**目標**：使用者上傳結算單 Excel 後，系統自動辨識期程年月，並在資料庫建立或更新期程與該月的施工路段清單。

**獨立驗收條件**：於標案頁面觸發匯入後，進入 `/projects/[id]/sites` 可看見解析出的路段項次、路段名稱、施工日期區間與備註。

### Implementation for User Story 1

- [ ] T005 [US1] 於 `web/app/projects/[id]/import-actions.ts` 建立基礎 Server Action 架構與身份驗證（`requireUser`）
- [ ] T006 [US1] 於 `import-actions.ts` 實作申報期程（`reporting_periods`）自動判定與新建邏輯（比對 `period_start` / `period_end`）
- [ ] T007 [US1] 於 `import-actions.ts` 實作施工路段（`monthly_sites`）批次 Upsert 寫入邏輯（依項次 `item_number` 寫入名稱、工期與備註）
- [ ] T008 [US1] 驗證 US1 核心流程：確認 Excel 路段表資料可完整解析並寫入 Supabase 資料庫

**檢核點**：User Story 1 具備獨立完整功能與資料持久化能力。

---

## Phase 4: User Story 2 - 批次寫入每日工項數量與尺寸計算備註 (Priority: P1)

**目標**：自動自「04.數量分析」提取工項代碼、每日實作數量（1~31日）、目標數量與尺寸計算式備註，批次寫入資料庫。

**獨立驗收條件**：切換至 `/projects/[id]/quantities`，確認畫面正確顯示對應路段之每日施作量與工項尺寸備註。

### Implementation for User Story 2

- [ ] T009 [US2] 於 `import-actions.ts` 實作標案契約工項查詢（`contract_items`）與 `work_order_items` 關聯比對
- [ ] T010 [US2] 於 `import-actions.ts` 實作 `item_period_targets` 批次寫入邏輯（目標數量與尺寸備註）
- [ ] T011 [US2] 於 `import-actions.ts` 實作 `daily_quantities` 每日數量批次轉換與寫入邏輯（轉為 `YYYY-MM-DD`，Chunk 200 筆批次 Upsert）
- [ ] T012 [US2] 驗證 US2 核心流程：確認每日工項數量與計算備註完整對齊且無遺漏

**檢核點**：User Story 1 與 User Story 2 均可正常運作，完成結算資料全量入庫。

---

## Phase 5: User Story 3 - 上傳檢核防護機制與格式警示回饋 (Priority: P2)

**目標**：防範錯誤檔案類型（跨工程類型錯置、損毀試算表），並將未知工項代碼或日期異常彙整為繁體中文警告呈現給使用者。

**獨立驗收條件**：故意上傳錯誤類型或損毀檔案時，系統能主動阻擋並提示錯誤；上傳未知工項時彈出警示清單。

### Implementation for User Story 3

- [ ] T013 [US3] 於 `web_excel_importer.py` 與 `import-actions.ts` 加入標案類型嚴格防呆（公園 vs 雨水，不符時中斷匯入）
- [ ] T014 [US3] 於 `import-actions.ts` 彙整未知工項代碼與日期不吻合之警示清單（`warnings`）
- [ ] T015 [US3] 開發前端上傳彈出對話框元件 `web/app/projects/[id]/import-modal.tsx`（支援檔案拖曳、大小與副檔名檢查、載入進度與結果呈現）
- [ ] T016 [US3] 於標案主頁 `web/app/projects/[id]/page.tsx` 掛載「📥 匯入結算單 Excel」操作按鈕與彈窗連動
- [ ] T017 [US3] 驗證 US3 錯誤情境：測試跨類型阻擋、非 Excel 檔案防呆與警告提示窗呈現

**檢核點**：全流程具備完整的錯誤防禦、資料庫原子性保護與使用者操作回饋。

---

## Phase 6: Polish & Cross-Cutting Concerns (整體拋光與驗收)

**目的**：型別導出整理、程式碼整潔與端對端全流程驗收

- [ ] T018 [P] 統一整理與導出型別至 `web/lib/types.ts`
- [ ] T019 依據 `quickstart.md` 執行全流程端對端瀏覽器操作驗收

---

## Dependencies & Execution Order (相依性與執行順序)

### 階段相依性
1. **Phase 1 (Setup)**：無相依，可直接執行。
2. **Phase 2 (Foundational)**：相依於 Phase 1，為後續所有 User Story 的核心阻塞條件。
3. **Phase 3 (User Story 1 - MVP)**：相依於 Phase 2 完成。
4. **Phase 4 (User Story 2)**：相依於 Phase 3 完成（需要先有期程與路段基礎）。
5. **Phase 5 (User Story 3)**：相依於 Phase 4 完成（介面與完整防呆整合）。
6. **Phase 6 (Polish)**：相依於所有 User Story 完成。

### 平行執行機會
- T001 與 T002 可平行進行。
- T015（前端介面開發）與 T009~T011（後端數量寫入）可在介面合約（`excel-import.ts`）確立後平行開發。
