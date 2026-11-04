# Implementation Plan: 修復工項數量輸入按 Enter 誤觸移除按鈕問題 (Fix Item Row Enter Submission Bug)

**Branch**: `003-fix-item-row-enter-submission` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-fix-item-row-enter-submission/spec.md`

---

## Summary

本功能旨在徹底消除 `/quantities` 頁面中，使用者在工項列（`ItemRow`）輸入數量並按下 Enter 鍵時，因 HTML 表單隱含提交預設觸發最左側「×（移除）」按鈕而導致工項被誤刪除消失的嚴重問題。
同時精簡表單互動架構：
1. 將移除按鈕重構為獨立的 `type="button"`（以專屬 `onClick` 呼叫 `queue.submit(true)`），使表單提交語意回歸單純的「儲存工項」，並在數量輸入框加入 Enter 鍵平順失焦處理。
2. 移除每列常態顯示的冗餘「儲存工項」按鈕，全面交由失焦與 Enter 自動儲存；並在發生儲存失敗（`queue.failed`）時動態提供微型「點此重試儲存」按鈕做為容錯入口。
3. 全站共用主按鈕（`.old-primary`）由珊瑚紅升級為科技藍（`#0284c7`），維持全站介面視覺一致。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router) / React 19  
**Primary Dependencies**: React Client Components (`board.tsx`)  
**Storage**: Supabase PostgreSQL (`item_period_targets`)，本次無資料庫結構變更  
**Testing**: 瀏覽器手動驗收（參照 `quickstart.md`）  
**Target Platform**: Web (Desktop Chrome / Edge)  
**Project Type**: Next.js Fullstack Web Application  
**Performance Goals**: 鍵盤回應延遲 < 16ms，無多餘重渲染  
**Constraints**: 僅調整前端 DOM 屬性與事件處理，不破壞後端 `save_monthly_item` RPC 契約  
**Scale/Scope**: 單頁所有工項列之表單按鈕與事件  

---

## Constitution Check

*GATE: 依據 `.specify/memory/constitution.md` 逐項檢核：*

| 憲章原則 | 檢核結果 | 說明 |
| :--- | :--- | :--- |
| **Principle I: SDD 優先** | **PASS** | 嚴格依循 Specify → Plan → Tasks 順序，於動工前完成架構設計。 |
| **Principle II: App Router 分工** | **PASS** | 變更嚴格限於 Client Component（`board.tsx: ItemRow`），Server Action 維持原貌。 |
| **Principle III: 領域演算法獨立** | **PASS** | 數量計算與差量比對演算法保持獨立，無副作用。 |
| **Principle IV: 繁體中文無裝飾** | **PASS** | 文件、註釋與 UI 提示 100% 採用純繁體中文，無表情符號。 |
| **Principle V: 安全性與最小變更** | **PASS** | 僅調整按鈕屬性與鍵盤事件，變更範圍小且針對性高。 |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-item-row-enter-submission/
├── spec.md              # 需求規格與驗收條件
├── plan.md              # 技術實作計畫（本檔案）
├── research.md          # 架構調研與技術決策 (Phase 0)
├── data-model.md        # 狀態介面與資料模型 (Phase 1)
├── quickstart.md        # 驗收與快速測試指引 (Phase 1)
├── checklists/          # 需求品質檢核表
│   └── requirements.md
└── tasks.md             # 任務檢核表（由 /speckit-tasks 生成）
```

### Source Code (affected areas)

```text
web/
└── app/
    ├── legacy.css                  # 全站樣式：.old-primary 主按鈕色彩升級為科技藍
    └── projects/
        └── [id]/
            └── quantities/
                └── board.tsx       # 核心修改：移除按鈕改 type="button"、Enter 失焦、移除常態儲存鈕、動態失敗重試鈕
```

---

## Detailed Design & Phases

### Phase 0: Research (Completed)
- 釐清 HTML5 隱含提交規範與既有 `ItemRow` 兩個 `type="submit"` 按鈕的順序衝突。
- 確立「將移除按鈕改為 `type="button"`」、「輸入框 Enter 平順失焦」的解法。
- 確立「移除每列常態儲存按鈕，改為失敗動態重試」與「全站主按鈕色彩對齊科技藍」的決策。

### Phase 1: Data Contracts & Design (Completed)
- 產出 `data-model.md` 與 `quickstart.md`。

### Phase 2: Implementation Outline (for `/speckit-tasks`)
1. **重構 `ItemRow` 移除按鈕 (`board.tsx`)**：
   - 將 `<button type="submit" name="operation" value="remove">` 改為 `<button type="button" onClick={() => void queue.submit(true)}>`。
2. **優化數量輸入框 Enter 事件**：
   - 在 `target` 及日期數量輸入框加入 `onKeyDown`，按下 Enter 時執行 `e.preventDefault(); e.currentTarget.blur();`。
3. **移除每列常態儲存按鈕與建立失敗重試機制**：
   - 移除工項行底部常態的 `.quantity-save` 按鈕。
   - 在 `queue.failed` 為真時，於狀態提示區渲染 `<button type="button" className="quantity-retry-btn" onClick={() => void queue.submit(false, !!syncNeeded)}>點此重試儲存</button>`。
4. **全站按鈕主題色統一 (`legacy.css`)**：
   - 將 `.old-primary` 升級為藍色系 `#0284c7`（hover `#0369a1`、active `#075985`）。
5. **驗收與回歸測試**：
   - 依據 `quickstart.md` 驗證按 Enter 儲存不會消失、失焦自動儲存、錯誤重試按鈕與手動移除仍正常運作。
