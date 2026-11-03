<!--
Sync Impact Report:
- Version change: Unversioned/Template -> 1.0.0
- List of modified principles: Initial ratification of project architecture principles
- Added sections: Core Principles, Technical Constraints & Standards, Development & Review Workflow, Governance
- Removed sections: None
- Follow-up TODOs: None
-->

# 工程施工文件系統 (Construction Documents System) Constitution

## Core Principles

### Principle I: Spec-Driven Development (規格驅動開發，非協商原則)
所有新功能或結構性重構在開始撰寫程式碼前，必須嚴格依循規範驅動開發流程（SDD），依序完成或更新規格（`spec.md`）、技術計畫（`plan.md`）與任務清單（`tasks.md`）。
* 禁止未經架構規劃與任務拆解的直接編碼（No vibe coding）。
* 程式碼修改前必須先在對話中說明問題點與規劃處理步驟，並取得使用者確認同意後方可動工。

### Principle II: App Router & Server Actions Architecture (職責邊界與伺服器端優先)
系統前端採用 Next.js 16 App Router、React 19 與 TypeScript，落實清晰的架構職責分工：
* **伺服器端元件 (Server Components, RSC)**：優先負責頁面結構載入、身分驗證與初始資料擷取。
* **客戶端元件 (Client Components)**：嚴格限制於表單輸入、局部狀態維護與使用者互動層。
* **資料持久化**：資料變更統一透過後端 Server Actions（如 `saveSite`）提交至 Supabase PostgreSQL，後端必須執行資料校驗與授權確認，禁止前端直接繞過權限操作資料庫。

### Principle III: Domain Logic & Algorithm Isolation (業務領域演算法獨立性)
核心業務邏輯（如連續施工日期區間化合併、歷史字串反向解析、工程數量統計等）必須設計為純函式（Pure Functions），並集中封裝於 `web/lib/` 或獨立領域模組中：
* 演算法函式必須具備高度內聚性、零副作用，並能脫離 UI 元件單獨進行單元驗證。
* 元件層僅負責調用並呈現結果，不侵入核心業務演算法細節。

### Principle IV: Traditional Chinese & Documentation Integrity (繁體中文註釋與文檔嚴肅性)
專案文檔與原始碼必須維護一致的繁體中文溝通標準：
* 所有新增或修改的原始碼註釋、提交訊息（Commit Message）及架構文件，一律使用繁體中文。
* 程式碼註釋中不得使用表情符號（Emoji）或裝飾性符號。
* 嚴格維護既有註釋與 JSDoc/TSDoc 的完整性，非任務必要範圍不擅自刪改或重構。

### Principle V: Security-First & Minimal Privileges (安全性優先與最小權限)
系統各層級均落實安全性防護與最小操作權限：
* 嚴禁硬編碼任何 API Key、Token、密碼或連線金鑰，統一透過環境變數管理。
* 嚴格防範 SQL/Shell/Command Injection、XSS 及越權操作；所有外部輸入均視為不可信資料。
* 除非使用者明確指示，否則不主動執行 `build`、`test`、`run`、`lint` 或正式環境部署指令。

## Technical Constraints & Standards

* **技術堆疊**：Next.js 16 (App Router)、React 19、TypeScript、Supabase (PostgreSQL)、Python 3 (`openpyxl` 報表引擎)、Docker。
* **樣式標準**：純 CSS 原生模組與 CSS Variables，維持與既有 `legacy.css` 主題視覺的一致性。
* **套件與依賴**：
  * 前端套件依賴統一使用 `pnpm` 進行管理。
  * Python 報表引擎若有新增依賴，統一透過 `requirements.txt` 明確鎖定版本，不隨意引入來源不明之第三方套件。

## Development & Review Workflow

* **SDD 生命週期**：新功能開發需依序走完 `/speckit-specify`（需求定義）→ `/speckit-clarify`（邊界釐清）→ `/speckit-plan`（技術方案）→ `/speckit-tasks`（任務拆解）→ `/speckit-implement`（實作編碼）。
* **變更範圍限制**：編輯既有檔案時僅修改完成任務所必要的最小範圍，避免無關的格式重整或過度重構。
* **驗收檢核標準**：核心演算法需備妥驗證腳本；端對端頁面互動與後端資料持久化驗證由使用者於瀏覽器親自操作確認。

## Governance

* 本憲章為專案所有規格產出、技術規劃（特別是 `/speckit-plan`）及程式碼編寫之最高準則。
* 所有規劃中的技術方案均必須通過本憲章之原則檢驗，若有衝突必須以本憲章為準。
* **版本修訂程序**：
  * **MAJOR（主版號）**：重大架構原則移除、核心架構體系調整或不相容之治理變更。
  * **MINOR（次版號）**：新增核心架構原則、技術約束或擴展工作流程。
  * **PATCH（修訂號）**：文字潤飾、錯字修正或非語意性之細節微調。

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
