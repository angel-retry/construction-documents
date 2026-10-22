# 工程施工文件系統 (Construction Documents System)

一套針對工程標案、施工日誌與結算報表管理的網頁系統，具備自動產出 Excel 報表之功能。

## 原始碼與打包機制說明

* 原始程式碼封裝於 `source.tar.gz` 中，供 Docker 多階段建置時於 source 階段自動解壓縮提取。
* `SOURCE_MANIFEST.json` 記錄了原始碼包內所有檔案的路徑與 SHA256 校驗值。
* 原始碼包中未隨附任何環境變數檔（.env）或已儲存的標案資料快照（snapshot.json）。

## 系統架構

* **前端與核心服務 (Web)**：Next.js、TypeScript、pnpm。
* **報表匯出引擎 (Worker)**：Python 3、`openpyxl`，用於產出公園（Park）與雨水（Rainwater）工程之施工日誌與結算 Excel 文件。
* **後端服務 (BaaS)**：Supabase（提供 PostgreSQL 關聯式資料庫及 Auth 使用者驗證）。
* **容器化**：透過 Dockerfile 進行多階段建置與整合運行，對外監聽 Port 10000。

## 必要環境變數

系統預設運行於 `supabase` 模式，啟動時必須提供以下環境變數：

| 變數名稱 | 說明 | 範例 / 格式 |
| :--- | :--- | :--- |
| `APP_MODE` | 系統模式（預設為 `supabase`，另有 `local-preview`） | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 API 網址 | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 發布金鑰 | 需以 `sb_publishable_` 開頭 |

> [!NOTE]
> 在使用 Docker `--env-file .env` 時，變數值切勿加上雙引號（`"`），否則引號會被視為字串的一部分而導致網址與金鑰校驗失敗。

---

## 本機開發指引 (Local Development)

日常進行程式碼撰寫、畫面修改與除錯時，**強烈建議使用本機開發伺服器（pnpm dev）**。此模式支援熱更新（Fast Refresh），存檔後 0.5 秒內即可於瀏覽器看到畫面變化。

### 1. 解壓縮原始碼

在專案根目錄執行以下指令解開程式碼（解出 `web/`、`migration_tools/`、`baselines/`）：

```powershell
tar -xzf source.tar.gz
```

### 2. 安裝套件管理器 (pnpm)

若本機僅安裝 npm，可透過 npm 安裝 pnpm：

```powershell
npm install -g pnpm
```

### 3. 設定本機環境變數

進入 `web` 目錄，建立 `.env.local` 檔案並填入連線金鑰：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```

### 4. 安裝依賴並啟動熱更新伺服器

```powershell
cd web
pnpm install
pnpm dev
```

啟動後，在瀏覽器造訪開發預設網址：
```
http://127.0.0.1:3100
```

---

## 生產打包與驗證 (Docker)

當功能開發完成，準備進行發布或驗證容器隔離環境時，使用 Docker 流程：

### 1. 建置映像檔

```bash
docker build -t construction-documents .
```

### 2. 啟動容器

可透過 `.env` 檔案載入環境變數：

```bash
docker run -d -p 10000:10000 --env-file .env --name construction-app construction-documents
```

*(或直接使用 `-e` 參數帶入環境變數)*

### 3. 開啟網頁

在瀏覽器造訪：
```
http://localhost:10000
```

---

## 開發模式 vs Docker 模式對照

| 比較項目 | 本機開發 (`pnpm dev`) | Docker 容器 (`docker run`) |
| :--- | :--- | :--- |
| **主要用途** | 日常功能開發、畫面排版、快速修復 | 整合驗證、正式環境發布、離線環境部署 |
| **修改程式碼** | 存檔後即時局部更新（Hot Reload） | 需重新 `docker build` 編譯並重啟容器 |
| **預設網址** | `http://127.0.0.1:3100` | `http://localhost:10000` |
| **除錯體驗** | 終端機與瀏覽器直接顯示原始碼錯誤行數 | 需透過 `docker logs` 查詢伺服器輸出 |

---

## 注意事項與使用限制

1. **資料庫連線依賴**：本專案未隨附資料庫建立腳本（SQL Schema / Migrations）。若無有效 Supabase 專案連線資訊，進入系統將顯示「登入服務尚未連接」，無法進行登入與操作標案。
2. **帳號管理**：登入驗證需使用由管理員建立於 Supabase Auth 之公司核發帳號。
