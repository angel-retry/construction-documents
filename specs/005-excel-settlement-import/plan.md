# Implementation Plan: 上傳與匯入 Excel 結算單功能 (Excel Settlement Import)

**Branch**: `005-excel-settlement-import` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-excel-settlement-import/spec.md`

---

## Summary

本功能旨在提供使用者上傳既有 Excel 結算單（`.xlsx`），自動由試算表中逆向解析申報年月、施工路段清單（`施工路段表`）、每日工項施作數量及尺寸計算備註（`04.數量分析`），並自動對齊與批次寫入 Supabase 關聯式資料庫中。
技術方案承襲原舊系統（`jin02`）在 `openpyxl` 的成熟解析規則，並遵循現行專案之 Python Worker 架構，由 Next.js Server Action 安全呼叫子行程，提供高準確度、高容錯性與完善防呆提示之匯入功能。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router) / React 19 / Python 3.10+  
**Primary Dependencies**: Next.js Server Actions, openpyxl, Supabase JS Client  
**Storage**: Supabase PostgreSQL (`reporting_periods`, `monthly_sites`, `work_order_items`, `item_period_targets`, `daily_quantities`)  
**Testing**: Python Worker 獨立單元驗證、瀏覽器端對端完整流程驗收  
**Target Platform**: Web (Desktop Chrome / Edge / Firefox)  
**Project Type**: Fullstack Web Application with Background Python Worker  
**Performance Goals**: 單份包含 18 個路段及上千筆數量之結算單，完整解析與入庫時間 < 5 秒  
**Constraints**: 
1. 僅允許 `.xlsx` 格式，單一檔案上限 30MB。
2. 必須以 `data_only=True` 唯讀模式開啟 Excel，杜絕巨集與公式執行風險。
3. 嚴格比對工程類型（公園／雨水），禁止跨類型匯入。
4. 交易完整性：遇致命格式錯誤時不寫入任何資料。  
**Scale/Scope**: 適用所有「公園工程」與「雨水工程」之月度結算單匯入作業。

---

## Constitution Check

*GATE: 依據 `.specify/memory/constitution.md` 逐項檢核：*

| 憲章原則 | 檢核結果 | 說明 |
| :--- | :--- | :--- |
| **Principle I: SDD 優先** | **PASS** | 嚴格依循 Specify → Plan → Tasks 順序，於動工前完成架構設計與資料模型規範。 |
| **Principle II: App Router 分工** | **PASS** | 前端為客戶端上傳元件，持久化與權限檢查全數封裝於後端 Server Action（`importSettlementExcel`）。 |
| **Principle III: 領域演算法獨立** | **PASS** | 核心試算表解析邏輯集中於獨立之 Python Importer Worker，具備獨立測試與呼叫能力。 |
| **Principle IV: 繁體中文與註釋規範** | **PASS** | 程式碼註釋、提交訊息與文件 100% 使用繁體中文，且程式碼內無裝飾性符號。 |
| **Principle V: 安全性與最小權限** | **PASS** | 實作檔案大小上限檢查、MIME 驗證、身份驗證與工作表特徵檢驗，杜絕惡意檔案與髒資料寫入。 |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-excel-settlement-import/
├── spec.md              # 需求規格書
├── plan.md              # 技術實作計畫（本檔案）
├── research.md          # Phase 0: 架構調研與決策
├── data-model.md        # Phase 1: 資料模型與契約映射
├── contracts/           # Phase 1: 型別定義與合約
│   └── excel-import.ts
├── quickstart.md        # Phase 1: 驗收與測試指引
├── checklists/
│   └── requirements.md  # 規格品質檢核表
└── tasks.md             # Phase 2: 任務清單（由 /speckit-tasks 生成）
```

### Source Code (affected & new areas)

```text
migration_tools/
└── web_excel_importer.py                 # [新增] 獨立 Python Excel 逆向解析 Worker

web/
├── lib/
│   ├── excel-import-worker.ts            # [新增] Node.js 調用 Python Importer 之子行程封裝
│   └── types.ts                          # [擴充] 匯入結果與解析型別定義
├── app/
│   └── projects/
│       └── [id]/
│           ├── actions.ts                # [擴充] 新增 importSettlementExcel Server Action
│           ├── import-modal.tsx          # [新增] 檔案上傳與匯入結果呈現對話框元件
│           └── page.tsx                  # [調整] 整合「匯入結算單 Excel」操作按鈕
```

---

## Detailed Design & Phases

### Phase 0: Research (Completed)
- 評估並確認採用獨立 Python Worker 沿用 `jin02` 的解析引擎。
- 確立 Supabase 批次寫入流程與錯誤隔離機制。

### Phase 1: Data Contracts & Design (Completed)
- 產出 `research.md`、`data-model.md`、`contracts/excel-import.ts` 與 `quickstart.md`。
- 確認資料庫欄位映射與型別契約無缺漏。

### Phase 2: Implementation Outline (for `/speckit-tasks`)
1. **建立 Python 逆向解析 Worker (`migration_tools/web_excel_importer.py`)**：
   - 移植並整合 `jin02/app/importer.py` 的工作表驗證與資料讀取演算法。
   - 支援接收 `stdin` 二進位串流，並輸出結構化 JSON 至 `stdout`。
2. **建立 Node.js 呼叫封裝 (`web/lib/excel-import-worker.ts`)**：
   - 封裝 `spawn` 子行程呼叫、設定 60 秒逾時、監聽 `USER_ERROR:`。
3. **實作 Server Action 業務邏輯 (`web/app/projects/[id]/actions.ts`)**：
   - 身份驗證（`requireUser`）。
   - 檔案格式與標案類型校驗。
   - 批次寫入 `reporting_periods`、`monthly_sites`、`work_order_items`、`item_period_targets` 與 `daily_quantities`。
4. **開發前端 UI 上傳互動元件 (`web/app/projects/[id]/import-modal.tsx`)**：
   - 建立浮層對話框，提供拖曳/選取檔案介面。
   - 處理載入中狀態與呈現匯入成功統計清單及警示。
5. **整合與驗收**：
   - 於標案主頁面掛載觸發按鈕，依據 `quickstart.md` 進行端對端驗收。
