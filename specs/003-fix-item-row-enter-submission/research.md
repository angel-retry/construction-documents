# 架構調研與技術決策 (Research): 修復工項數量輸入按 Enter 誤觸移除按鈕問題

**功能**: `003-fix-item-row-enter-submission`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 調研主題 1: HTML 表單隱含提交 (Implicit Submission) 機制與按鈕語意

### 背景與根本原因分析
依據 W3C HTML5 規範 4.10.21.2 節（Implicit Submission）：
> 當表單使用者代理（瀏覽器）支援讓使用者在文字/數值輸入控制項（如 `<input>`）中按下 `Enter` 鍵提交表單時，必須觸發該表單中樹狀結構順序（Tree Order）的第一個可提交按鈕（Submit Button）。

在既有的 `web/app/projects/[id]/quantities/board.tsx` 之 `ItemRow` 元件中：
```html
<form className="quantity-item" onSubmit={...}>
  <div className="quantity-account">
    <!-- 第一個 submit 按鈕：移除按鈕！ -->
    <button type="submit" name="operation" value="remove">×</button>
    ...
    <input name="target" type="number" ... />
  </div>
  ...
  <!-- 第二個 submit 按鈕：儲存工項 -->
  <button type="submit" className="quantity-save">儲存工項</button>
</form>
```
當使用者在 `input` 填入數量並按下 `Enter` 鍵時，瀏覽器依法規預設選取**第一個** submit 按鈕（即 `value="remove"` 的移除按鈕）作為 submitter，導致 `onSubmit` 判定 `remove = true`，直接發送移除請求將工項標記為已刪除，使工項自畫面上消失。

### 決策方案 (Decision)
1. **調整「×」按鈕類型**：
   - 將最左側的「×」按鈕從 `type="submit"` 改為標準按鈕 `type="button"`。
   - 點擊時以原生點擊事件處理：`onClick={() => void queue.submit(true)}`。
2. **鎖定表單唯一提交目標**：
   - 表單內部僅保留底部的「儲存工項」按鈕為唯一 `type="submit"` 按鈕。
   - 如此一來，任何鍵盤 Enter 觸發之隱含提交，其目標 100% 必然指向正常的儲存動作（`remove = false`）。
3. **輸入框 Enter 體驗最佳化**：
   - 在本月數量與日期數量輸入框加入 `onKeyDown` 監聽：若使用者按下 `Enter` 鍵，主動呼叫 `e.currentTarget.blur()`。
   - 這能確保觸發正常的 `onBlur` 失焦差量儲存流程，提供流暢的輸入回饋。

### 評估方案比較 (Alternatives Considered)
- **方案 A：僅在 `onSubmit` 中忽略非按鈕點擊的 Enter 鍵**：
  - 缺點：依賴脆弱的事件屬性偵測，不同瀏覽器對 `submitter` 在 Enter 時的實作稍有差異，存在邊界風險。
- **方案 B：語意分離 + 明確按鈕職責 (獲選)**：
  - 將破壞性操作（移除）從 submit 按鈕降級為純按鈕（`type="button"`），使表單提交語意回歸單純的「儲存數據」，從結構底層徹底杜絕誤觸風險。

---

## 調研主題 2: 自動儲存體驗與冗餘儲存按鈕的移除

### 背景
既有架構已包含完整的失焦自動儲存（`onBlur` 呼叫 `queue.submit(false)`）與 Enter 自動失焦機制。每一列工項底部常態顯示「儲存工項」按鈕不僅佔用版面垂直空間，且容易造成使用者「是否需要每一筆都手動點儲存」的認知負擔。

### 決策方案
1. **移除每列常態儲存按鈕**：
   - 移除工項行底部預設顯示的 `.quantity-save` 按鈕。
   - 所有輸入框（本月數量、各施工日數量、備註）於失焦或按 Enter 時皆能穩定觸發非同步背景儲存。
2. **失敗容錯重試（Fallback）**：
   - 當非同步儲存失敗（例如網路異常）時，`queue.failed` 狀態為 `true`，此時在狀態列（`.quantity-status`）中動態渲染微型按鈕「點此重試儲存」（`.quantity-retry-btn`），確保使用者在異常時有明確的主動復原途徑。

---

## 調研主題 3: 全站主按鈕主題色統一 (Primary Color Alignment)

### 背景
系統全站共用樣式檔 `web/app/legacy.css` 中的 `.old-primary` 原本定義為珊瑚紅（`#ff4b4b`），與現代工程報表專業風格（深藍/科技藍）產生視覺衝突。

### 決策方案
- 將 `.old-primary` 統一更新為藍色調：
  - 背景色：`#0284c7`（Sky-600）
  - 懸停色（Hover）：`#0369a1`（Sky-700）
  - 點擊色（Active）：`#075985`（Sky-800）
- 影響範圍涵蓋「加入工項」按鈕與路段儲存按鈕，實現全站主視覺色彩的一致性。
