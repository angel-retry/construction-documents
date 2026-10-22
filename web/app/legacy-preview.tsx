"use client";
import { useState } from "react";
import type { Site, Snapshot } from "../lib/types";
import "./legacy.css";

const tabs = [
  "基本設定",
  "施工路段",
  "每日數量與帳務總覽",
  "前期累計",
  "匯出 Excel",
];
function Field({ name, value }: { name: string; value: string | number }) {
  return (
    <label className="old-field">
      {name}
      <input aria-label={name} readOnly value={value} />
    </label>
  );
}
function Exports({ data }: { data: Snapshot }) {
  return (
    <section>
      <h2>匯出 Excel</h2>
      <p>沿用原範本、原匯出程式產生的文件：</p>
      <ul>
        {data.downloads.map((f) => (
          <li key={f.key}>{f.filename}</li>
        ))}
      </ul>
      <p className="old-info">
        目前下載的是115年8月既有參考輸出，檔案內容未改動；尚未完成 Excel
        原生重算及列印驗收。即時產生新文件尚未接上。
      </p>
      <button type="button" disabled>
        產生 Excel（尚未接上）
      </button>

      <div className="old-grid two old-downloads">
        {data.downloads.map((f) => (
          <a key={f.key} className="old-button" href={`/download/${f.key}`}>
            下載{f.key === "log" ? "施工日誌" : "結算單"}（參考檔）
          </a>
        ))}
      </div>
    </section>
  );
}
function AccountingSite({ s, data }: { s: Site; data: Snapshot }) {
  const [days, setDays] = useState<number[]>([]);
  const shown = days.length
    ? days
    : s.work_days.length
      ? s.work_days
      : Array.from({ length: 31 }, (_, i) => i + 1);
  const items = data.totals.filter(
    (t) => Number(t.site_id) === s.legacy_site_id,
  );
  return (
    <details className="old-expander" open>
      <summary>
        {s.legacy_site_id}　{s.name}　{s.work_dates_raw}
      </summary>
      <div className="old-expander-body">
        <div className="old-grid two accounting-tools">
          <div>
            <label className="old-field">
              加入工項（可搜尋）
              <div className="old-inline">
                <input
                  disabled
                  aria-label={`加入工項 ${s.legacy_site_id}`}
                  placeholder="唯讀預覽，尚未開放加入"
                />
                <button disabled>加入</button>
              </div>
            </label>
          </div>
          <details className="day-filter">
            <summary>
              顯示日期{" "}
              {days.length ? `（已選 ${days.length} 天）` : "（依施工日期）"}
            </summary>
            <div className="day-options">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={days.includes(d)}
                    onChange={(e) =>
                      setDays((prev) =>
                        e.target.checked
                          ? [...prev, d].sort((a, b) => a - b)
                          : prev.filter((v) => v !== d),
                      )
                    }
                  />
                  {`8/${d}`}
                </label>
              ))}
            </div>
            <button onClick={() => setDays([])}>清除日期選擇</button>
          </details>
        </div>
        <div className="old-grid two accounting-head">
          <div className="acct-left">
            <span />
            <span>工項代碼</span>
            <span>工作項目</span>
            <span>本月數量</span>
            <span>單價</span>
            <span>本月金額</span>
            <span>備註</span>
          </div>
          <div>每日完成數量（各工項與左側同列，可橫向捲動日期）</div>
        </div>
        {items.map((t) => (
          <div
            className="old-grid two acct-row"
            key={t.item_code}
            data-item={t.item_code}
          >
            <div className="acct-left">
              <button disabled aria-label="移除此工項">
                ×
              </button>
              <strong>{t.item_code}</strong>
              <span>
                {t.item_name}（{t.unit}）
              </span>
              <label className="acct-value">
                <small>本月數量</small>
                <input
                  readOnly
                  aria-label={`本月數量 ${s.legacy_site_id} ${t.item_code}`}
                  value={t.target_display}
                />
              </label>
              <span className="acct-value">
                <small>單價</small>
                {t.price_display}
              </span>
              <span className="acct-value">
                <small>本月金額</small>
                {t.amount_display}
              </span>
              <label className="acct-value">
                <small>備註</small>
                <input
                  readOnly
                  aria-label={`備註 ${s.legacy_site_id} ${t.item_code}`}
                  value={t.note}
                />
              </label>
            </div>
            <div
              className="daily-scroll"
              tabIndex={0}
              aria-label={`${s.legacy_site_id} ${t.item_code} 每日數量`}
            >
              <table className="daily-table">
                <thead>
                  <tr>
                    {shown.map((d) => (
                      <th key={d}>{d}日</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {shown.map((d) => {
                      const r = data.daily.find(
                        (r) =>
                          r.site_id === s.legacy_site_id &&
                          r.item_code === t.item_code &&
                          Number(r.work_date.slice(-2)) === d,
                      );
                      return (
                        <td key={d}>
                          {Number(r?.quantity_exact || 0).toFixed(4)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <p className="old-caption">
          小計{" "}
          {s.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          元
        </p>
      </div>
    </details>
  );
}
export default function LegacyPreview({ data }: { data: Snapshot }) {
  const [tab, setTab] = useState(0),
    [sidebar, setSidebar] = useState(false),
    [search, setSearch] = useState("");
  const settings = data.settings;
  const sites = data.sites.filter((s) =>
    (s.name + " " + s.legacy_site_id)
      .normalize("NFKC")
      .includes(search.trim().normalize("NFKC")),
  );
  return (
    <div className="legacy-app">
      <button
        className="old-sidebar-toggle"
        aria-expanded={sidebar}
        onClick={() => setSidebar(!sidebar)}
      >
        ☰ 公園專案存檔
      </button>
      <aside className={`old-sidebar ${sidebar ? "is-open" : ""}`}>
        <h3>公園專案存檔</h3>
        <p className="old-caption">資料會依「民國年／月份」分別存檔。</p>
        <p>115年8月 · 來源副本</p>
        <a className="old-button full" href="/download/json">
          匯出 JSON
        </a>
        <label className="old-field">
          匯入 JSON
          <div className="upload-placeholder">
            <button disabled>↑ Upload</button>
            <small>唯讀預覽，匯入尚未接上</small>
          </div>
        </label>
        <hr />
        <p className="old-caption">從既有 公園結算單 匯入</p>
        <label className="old-field">
          匯入 Excel
          <div className="upload-placeholder">
            <button disabled>↑ Upload</button>
            <small>唯讀預覽，匯入尚未接上</small>
          </div>
        </label>
        <hr />
        <p className="old-caption">
          原版欄位排列預覽
          <br />
          不會自動寫入或修改原始存檔。
        </p>
      </aside>
      <main className="old-main">
        <div className="old-kind">
          <label>
            <input type="radio" checked readOnly name="kind" /> 公園
          </label>
          <label title="雨水資料尚未接入此預覽">
            <input type="radio" disabled name="kind" /> 雨水
          </label>
          <span>唯讀預覽</span>
        </div>
        <h1>公園工程施工文件系統</h1>
        <p className="old-caption old-period">
          目前：115年8月｜原版欄位及表格排列
        </p>
        <div className="old-tabs" role="tablist" aria-label="原系統分頁">
          {tabs.map((t, i) => (
            <button
              key={t}
              id={`tab-${i}`}
              role="tab"
              aria-selected={tab === i}
              aria-controls="old-panel"
              tabIndex={tab === i ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const n = (i + (e.key === "ArrowRight" ? 1 : 4)) % 5;
                  setTab(n);
                  document.getElementById(`tab-${n}`)?.focus();
                }
              }}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="old-readonly">
          欄位排列比照原版；目前僅供查閱。新增、修改、儲存與即時匯出尚未接上。
        </div>
        <div role="tabpanel" id="old-panel" aria-labelledby={`tab-${tab}`}>
          {tab === 0 && (
            <section>
              <h2>工程基本設定</h2>
              <div className="old-grid three">
                <Field name="民國年" value={settings.roc_year} />
                <Field name="月份" value={settings.month} />
                <Field name="契約金額" value={settings.contract_amount} />
              </div>
              <Field name="工程名稱" value={settings.project_name} />
              <div className="old-grid two">
                <Field name="主辦單位" value={settings.owner} />
                <Field name="施工地點" value={settings.location} />
              </div>
              <div className="old-grid two">
                <Field name="承攬廠商" value={settings.contractor} />
                <Field name="監造單位" value={settings.supervisor} />
              </div>
              <hr />
              <h3>工程費小計歷程（原契約／變更設計）</h3>
              <p className="old-caption">
                原版用於記錄直接工程費小計、生效日期及完成百分率分母。此處保留原存檔內容。
              </p>
              <div className="old-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>項目</th>
                      <th>直接工程費小計金額</th>
                      <th>生效日期(YYYY-MM-DD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.contract_revisions.length ? (
                      settings.contract_revisions.map((r, i) => (
                        <tr key={i}>
                          <td>{r.label}</td>
                          <td>{r.amount}</td>
                          <td>{r.effective_date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>原存檔未填工程費小計歷程</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 1 && (
            <section>
              <h2>施工路段</h2>
              <p className="old-caption">
                ↑ ↓
                調整匯出順序。單筆達150,000元自動歸類為獨立派工並分開匯出，可手動調整類別。（本預覽不開放修改）
              </p>
              <label className="old-field old-search">
                搜尋路段
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="路段名稱或項次"
                />
              </label>
              <div className="old-table-scroll">
                <table className="old-sites">
                  <thead>
                    <tr>
                      <th>↑</th>
                      <th>↓</th>
                      <th>項次</th>
                      <th>路段名稱</th>
                      <th>施工日期</th>
                      <th>備註</th>
                      <th>案件類別</th>
                      <th>刪除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr key={s.legacy_site_id}>
                        <td>
                          <button disabled>↑</button>
                        </td>
                        <td>
                          <button disabled>↓</button>
                        </td>
                        <td>{s.legacy_site_id}</td>
                        <td>{s.name}</td>
                        <td>{s.work_dates_raw}</td>
                        <td>{s.note}</td>
                        <td>
                          {s.case_override === "independent"
                            ? "獨立派工"
                            : s.case_override === "normal"
                              ? "一般派工"
                              : "自動判斷"}
                        </td>
                        <td>
                          <button disabled>刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sites.length && <p role="status">沒有符合的路段</p>}
              <p className="old-caption" role="status">
                共 {sites.length} 個路段；僅篩選畫面，不改動原始資料。
              </p>
              <hr />
              <h3>新增路段</h3>
              <div className="old-grid three">
                <Field name="新項次" value="" />
                <Field name="新路段名稱" value="" />
                <Field name="施工日期" value="" />
              </div>
              <button disabled>新增路段</button>
            </section>
          )}
          {tab === 2 && (
            <section>
              <div className="old-grid two">
                <h2>帳務總覽</h2>
                <h2>每日完成數量</h2>
              </div>
              <p className="old-caption">
                即時試算各路段工項金額（數量 × 單價），不需匯出
                Excel。前期累計數量不分路段，故獨立列示於下方。僅供內部估算，正式金額仍以匯出的結算單／竣工單為準。「本月數量」是月目標；顯示日期只改變畫面，隱藏日期的數量仍保留。
              </p>
              {data.sites.map((s) => (
                <AccountingSite s={s} data={data} key={s.legacy_site_id} />
              ))}
              <details className="old-expander">
                <summary>
                  前期累計（不分路段）　｜　小計 {data.amounts[1]} 元
                </summary>
                <div className="old-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "工項代碼",
                          "工作項目",
                          "單位",
                          "前期累計數量",
                          "單價",
                          "前期累計金額",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.prior.map((r) => (
                        <tr key={r.code}>
                          <td>{r.code}</td>
                          <td>{r.name}</td>
                          <td>{r.unit}</td>
                          <td>{r.quantity}</td>
                          <td>{r.price}</td>
                          <td>{r.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <hr />
              <div className="old-grid three old-metrics">
                {["本月合計", "前期累計", "累計總金額"].map((n, i) => (
                  <div key={n}>
                    {n}
                    <strong>{data.amounts[i]} 元</strong>
                  </div>
                ))}
              </div>
              <hr />
              <Exports data={data} />
            </section>
          )}
          {tab === 3 && (
            <section>
              <h2>前期累計數量</h2>
              <p className="old-caption">
                匯出至公園施工日誌「詳細表連結」E6:E447，按工項代碼對應；分類標題列不填數量。
              </p>
              <h4>從 Excel 批次貼上</h4>
              <p className="old-caption">
                兩欄可分開複製，請選取相同起訖列，保留空白列。數量空白或「－」會略過，後面的工項不會往前錯位。
              </p>
              <div className="old-grid two">
                <label className="old-field">
                  ① 貼上工項代碼（項次）
                  <textarea disabled placeholder="唯讀預覽，貼上尚未接上" />
                </label>
                <label className="old-field">
                  ② 貼上上個月的累計完成數量
                  <textarea disabled placeholder="唯讀預覽，貼上尚未接上" />
                </label>
              </div>
              <button disabled>套用並儲存</button>
              <hr />
              <label className="old-field">
                新增工項前期累計
                <select disabled>
                  <option>尚未開放新增</option>
                </select>
              </label>
              <div className="old-inline">
                <Field name="前期累計數量" value="0.0000" />
                <button disabled>加入</button>
              </div>
              <div className="old-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>工項</th>
                      <th>前期累計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.prior.map((r) => (
                      <tr key={r.code}>
                        <td>{r.code}</td>
                        <td>{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button disabled>清除全部前期累計</button>
            </section>
          )}
          {tab === 4 && <Exports data={data} />}
        </div>
      </main>
    </div>
  );
}
