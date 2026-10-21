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

系統預設運行於 `supabase` 模式，啟動容器時必須提供以下環境變數：

| 變數名稱 | 說明 | 範例 / 格式 |
| :--- | :--- | :--- |
| `APP_MODE` | 系統模式（預設為 `supabase`，另有 `local-preview`） | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 API 網址 | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 發布金鑰 | 需以 `sb_publishable_` 開頭 |

## 執行與啟動指引 (Docker)

本機需先安裝並啟動 Docker Desktop。

### 1. 建置映像檔

```bash
docker build -t construction-documents .
```

### 2. 啟動容器

帶入 Supabase 連線資訊啟動容器：

```bash
docker run -d -p 10000:10000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_key_here" \
  --name construction-app construction-documents
```

*(Windows PowerShell 換行請使用反引號 `` ` `` 取代 `\`)*

### 3. 開啟網頁

在瀏覽器造訪：
```
http://localhost:10000
```

## 注意事項與使用限制

1. **資料庫連線依賴**：本專案未隨附資料庫建立腳本（SQL Schema / Migrations）。若無有效 Supabase 專案連線資訊，進入系統將顯示「登入服務尚未連接」，無法進行登入與操作標案。
2. **帳號管理**：登入驗證需使用由管理員建立於 Supabase Auth 之公司核發帳號。
