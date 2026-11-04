# 架構調研與技術決策 (Research): 整合式可搜尋工項下拉選單

**功能**: `002-searchable-item-combobox`  
**日期**: 2026-11-04  
**狀態**: 完成 (Approved)

---

## 調研主題 1: 原生 React 19 下拉搜尋元件 (Combobox) 實作機制

### 背景與挑戰
在 Streamlit 中，`st.selectbox(..., filter_mode="contains")` 為單一控制元件，可輸入關鍵字即時模糊比對並選取。
目前 Next.js 專案（`board.tsx`）將「搜尋關鍵字 input」與「原生 HTML `<select>`」拆成兩列獨立欄位，操作繁瑣。
本專案堅持極簡架構原則（Principle V），不隨意引入大型外部套件（如 Radix UI、MUI、Downshift 或 react-select），需以原生 React 19 與純 CSS 達成高效 Combobox。

### 決策方案 (Decision)
在 `web/app/projects/[id]/quantities/` 封裝獨立的客戶端元件 `ItemCombobox`（或直接於 `board.tsx` 模組化抽出）：
1. **輸入與顯示雙向連動**：
   - 當未選中工項時，輸入框顯示使用者輸入的搜尋關鍵字，並作為 contains 篩選基準。
   - 當使用者點選某工項後，輸入框顯示格式化標籤（例如 `一.(一).1｜瀝青混凝土鋪設（M2）`），同時將工項代碼同步至 `<input type="hidden" name="code" value={selectedCode} />`。
2. **點擊外部自動收合 (Click Outside)**：
   - 使用 `useRef` 錨定 Combobox 容器元素。
   - 透過 `document.addEventListener("pointerdown", handleClickOutside)` 在點擊外部區域時自動關閉下拉清單。
3. **鍵盤與防呆支援**：
   - 支援 `Escape` 鍵立即收合選單。
   - 若使用者僅打字但未自清單中明確點選工項，隱藏之 `name="code"` 維持空字串，連動外部「加入」按鈕維持停用（`disabled`）。

### 評估方案比較 (Alternatives Considered)
- **方案 A：原生 HTML `<datalist>`**：
  - 優點：完全原生，無需 JavaScript 下拉浮層控制。
  - 缺點：不同瀏覽器（Chrome / Safari / Edge）UI 樣式與寬度極不一致，無法自訂選項格式（代碼與名稱排版），且對 `filter_mode="contains"` 之支援與清單最大高度限制不可控，易造成操作體驗裂化。
- **方案 B：引入第三方套件 (Downshift / react-select)**：
  - 缺點：引入多餘依賴套件（違反 Principle V），增加 bundle 大小與 React 19 相容性風險。
- **方案 C：原生 React 狀態驅動 Combobox (獲選)**：
  - 零額外依賴、完全符合 React 19 標準、自訂 CSS 樣式完全相容既有 `legacy.css`。

---

## 調研主題 2: 浮層視窗 (Dropdown Overlay) 排版與防推擠防跑版

### 背景與挑戰
`/quantities` 頁面下方包含極龐大的每日數量網格與路段工項表格。若下拉選單直接在 DOM 流程中展開（Flow Layout），會導致下方所有輸入欄位與按鈕向下位移，造成視覺閃爍與操作跳躍。

### 決策方案 (Decision)
1. **定位方式**：外層容器設定 `position: relative`，下拉選單本體設定 `position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;`。
2. **滾動與高度限制**：
   - 樣式限制 `max-height: 280px; overflow-y: auto;`。
   - 加上簡潔的邊框與浮層陰影（`box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); border: 1px solid #d0d7de; border-radius: 6px; background: #ffffff;`）。
3. **保證零位移**：選單展開與收合完全不佔據文件常規流空間，下方表格達成 0 像素位移。

---

## 調研主題 3: 與 Server Action (`addItem`) 及生命週期之同步

### 背景與挑戰
工項加入是透過 Next.js Server Action (`addItem`) 完成，使用 React 19 的 `useActionState(addItem, { message: "" })`：
當使用者點擊「加入」按鈕送出表單後，伺服器處理完畢會回傳 `addState`（例如 `{ ok: true, message: "工項已加入；若曾移除，已恢復原數量。" }`）。
成功加入後，輸入框應自動重置回初始空白狀態，以便使用者立即選取下一筆工項。

### 決策方案 (Decision)
1. 表單提交保留原生 `<form action={addAction}>` 機制，由隱藏欄位 `<input type="hidden" name="code" value={code} />` 與 `<input type="hidden" name="site" value={site.id} />` 提供資料。
2. 透過 `useEffect` 監聽 `addState` 與 `adding` 狀態轉變：
   - 當 `addState.ok === true` 且非提交中時，自動觸發重置函式，清空輸入框文字、選中代碼，並收合選單。
3. 提供清除按鈕（`✕`），選取後若使用者改變心意可一鍵清空選取。
