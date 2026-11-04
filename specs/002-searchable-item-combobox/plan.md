# Implementation Plan: 整合式可搜尋工項下拉選單 (Searchable Item Combobox)

**Branch**: `002-searchable-item-combobox` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-searchable-item-combobox/spec.md`

---

## Summary

本功能旨在重構「每日數量與帳務總覽」（`/quantities`）頁面中各路段加入工項的輸入介面。
將原先分開的「搜尋工項文字框」與「原生 `<select>` 下拉選單」整合成單一原生的 Combobox 元件（`ItemCombobox`）：
點擊展開浮層清單、輸入關鍵字即時模糊過濾（contains filter）、點選項目後同步隱藏欄位 `code`，並在成功加入後自動重置狀態，且下拉清單採用懸浮絕對定位（Overlay），徹底防止展開時推擠或破壞下方日期數量表格。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router) / React 19  
**Primary Dependencies**: React Client Components, CSS Modules / `legacy.css`  
**Storage**: Supabase PostgreSQL (`monthly_items`, `contract_items`)，本次無資料表結構變更  
**Testing**: 瀏覽器端對端驗收（參照 `quickstart.md`）  
**Target Platform**: Web (Desktop Chrome / Edge)  
**Project Type**: Next.js Fullstack Web Application  
**Performance Goals**: 關鍵字篩選延遲 < 50ms，下拉展開下方網格 0 像素位移  
**Constraints**: 不引入第三方大型 UI 函式庫，維持原生 React 19 與純 CSS 實作  
**Scale/Scope**: 各路段可用工項清單約 10~200 項，整頁約 1~20 個施工路段  

---

## Constitution Check

*GATE: 依據 `.specify/memory/constitution.md` 逐項檢核：*

| 憲章原則 | 檢核結果 | 說明 |
| :--- | :--- | :--- |
| **Principle I: SDD 優先** | **PASS** | 嚴格依循 Specify → Plan → Tasks 流程，完成架構設計後方進入任務拆解。 |
| **Principle II: App Router 分工** | **PASS** | 改動局限於 Client Component（`board.tsx` / `ItemCombobox`），Server Action (`addItem`) 維持既有後端驗證與授權機制。 |
| **Principle III: 領域演算法獨立** | **PASS** | 包含關鍵字比對與字串格式化邏輯封裝為純函式，不破壞業務領域隔離。 |
| **Principle IV: 繁體中文無裝飾** | **PASS** | 規格、文件與原始碼註釋 100% 採用純繁體中文，無表情符號。 |
| **Principle V: 安全性與最小變更** | **PASS** | 不更動任何資料庫存取金鑰與環境變數，維持最小必要之 UI 檔案變更。 |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-searchable-item-combobox/
├── spec.md              # 需求規格與驗收條件
├── plan.md              # 技術實作計畫（本檔案）
├── research.md          # 架構調研與技術決策 (Phase 0)
├── data-model.md        # 狀態介面與資料模型 (Phase 1)
├── contracts/           # 前端合約與型別定義 (Phase 1)
│   └── combobox-contract.ts
├── quickstart.md        # 驗收與快速測試指引 (Phase 1)
├── checklists/          # 需求品質檢核表
│   └── requirements.md
└── tasks.md             # 任務檢核表（由 /speckit-tasks 生成）
```

### Source Code (affected areas)

```text
web/
├── app/
│   ├── legacy.css                               # 新增 Combobox 浮層與選項 hover 樣式
│   └── projects/
│       └── [id]/
│           └── quantities/
│               ├── board.tsx                    # 替換 SiteBlock 內部加入工項結構
│               └── item-combobox.tsx (或於 board.tsx 內抽取) # 封裝可搜尋下拉元件
```

---

## Detailed Design & Phases

### Phase 0: Research (Completed)
- 確立採用原生 React 19 Client Component，不依賴任何外部套件（見 `research.md`）。
- 確立下拉選單使用 `position: absolute` 浮層，確保展開時下方日期網格達成 0 位移。
- 確立與 Server Action `addItem` 表單提交流程及重置生命週期之連動機制。

### Phase 1: Data Contracts & Design (Completed)
- 產出 `data-model.md` 與 `contracts/combobox-contract.ts`。
- 產出端對端驗收清單 `quickstart.md`。

### Phase 2: Implementation Outline (for `/speckit-tasks`)
1. **編寫 `ItemCombobox` 元件與樣式**：
   - 封裝整合式輸入框、下拉浮層、contains 即時比對與點擊外部關閉（Click outside）。
   - 在 `legacy.css` 中設定浮層絕對定位、陰影、滾動條與選項懸停樣式。
2. **整合至 `board.tsx` (`SiteBlock`)**：
   - 移除原先分開的「搜尋工項 input」與原生 `<select>`。
   - 嵌入 `ItemCombobox`，維持 `site` 與 `code` 表單 Hidden 欄位提交，相容 `addItem`。
3. **成功加入後狀態重置**：
   - 依據 `addState.ok` 自動重置 Combobox 內部狀態。
4. **驗收與手動驗證**：
   - 依據 `quickstart.md` 指引進行功能驗收。
