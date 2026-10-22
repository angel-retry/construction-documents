"use client";
import { useState } from "react";
import type { Snapshot } from "../lib/types";
const tabs = ["工程總覽", "施工路段", "數量查詢"] as const;
export default function Preview({ data }: { data: Snapshot }) {
	const [tab, setTab] = useState<string>(tabs[0]);
	const [query, setQuery] = useState("");
	const [site, setSite] = useState("");
	const [date, setDate] = useState("");
	const [detail, setDetail] = useState<number | null>(null);
	const normalize = (s: string) => s.normalize("NFKC").toLocaleLowerCase();
	const match = (s: string) => normalize(s).includes(normalize(query.trim()));
	const records = data.daily.filter(
		(r) =>
			(!site || String(r.site_id) === site) &&
			(!date || r.work_date === date) &&
			match(r.site_name + r.item_code + r.item_name),
	);
	const sites = data.sites.filter((s) => match(s.name + s.legacy_site_id));
	const dates = [...new Set(data.daily.map((r) => r.work_date))].sort();
	const selected = data.sites.find((s) => s.legacy_site_id === detail);
	const go = (t: string) => {
		setTab(t);
		setQuery("");
		setDetail(null);
	};
	return (
		<div className="shell">
			<aside>
				<a className="brand" href="/" aria-label="回工程總覽">
					<span className="mark">皇</span>
					<span>
						皇喆營造<small>施工文件管理</small>
					</span>
				</a>
				<div className="nav-caption">工作空間</div>
				<nav aria-label="主要功能">
					{tabs.map((t, i) => (
						<button
							key={t}
							onClick={() => go(t)}
							aria-current={tab === t ? "page" : undefined}
						>
							<span className="nav-number">0{i + 1}</span>
							{t}
						</button>
					))}
				</nav>
				<div className="aside-foot">
					<span className="dot" /> 本機資料預覽
					<small>公園工程 · 115 年 8 月</small>
				</div>
			</aside>
			<div className="workspace">
				<header>
					<span>
						工程管理 <b>/</b> 公園工程
					</span>
					<span className="badge">唯讀預覽</span>
				</header>
				<main>
					<div className="heading">
						<div>
							<p className="eyebrow">PROJECT WORKSPACE / 115.08</p>
							<h1>{selected ? "路段明細" : tab}</h1>
							<p className="muted">
								{tab === "工程總覽"
									? "把施工路段、每日數量與文件來源放在一起。"
									: tab === "施工路段"
										? "依原始資料查看路段與對應工項。"
										: "依日期、施工路段與工項，查閱本月施工紀錄。"}
							</p>
						</div>
						<div className="period">
							<span>資料期間</span>
							<strong>115 年 8 月</strong>
						</div>
					</div>
					{tab === "工程總覽" ? (
						<>
							<section className="hero">
								<div>
									<span className="chip">公園工程</span>
									<h2>每一筆施作，都有依據。</h2>
									<p>本月施工資料已彙整，可從路段追查每日數量。</p>
									<button className="primary" onClick={() => go("施工路段")}>
										查看施工路段 <span>↗</span>
									</button>
								</div>
								<div className="hero-side">
									<span>資料涵蓋日期</span>
									<strong>
										{dates[0]?.slice(5).replace("-", " / ")} —{" "}
										{dates.at(-1)?.slice(5).replace("-", " / ")}
									</strong>
									<small>依現有紀錄顯示，非工程起訖日</small>
								</div>
							</section>
							<section className="stats" aria-label="資料摘要">
								{[
									["施工路段", data.sites.length, "個路段"],
									["每日數量", data.daily.length, "筆紀錄"],
									["月目標", data.totals.length, "組地點工項"],
									[
										"數量對帳",
										data.totals.filter((t) => Number(t.target_minus_raw) === 0)
											.length,
										"組一致",
									],
								].map(([label, n, unit]) => (
									<article key={label}>
										<span>{label}</span>
										<strong>
											{n}
											<small>{unit}</small>
										</strong>
									</article>
								))}
							</section>
							<div className="two-col">
								<section className="panel">
									<div className="panel-heading">
										<h2>本月施工路段</h2>
										<button
											className="text-button"
											onClick={() => go("施工路段")}
										>
											查看全部 →
										</button>
									</div>
									{data.sites.slice(0, 4).map((s) => (
										<button
											className="site-row"
											key={s.legacy_site_id}
											onClick={() => {
												setTab("施工路段");
												setDetail(s.legacy_site_id);
											}}
										>
											<span className="site-no">{s.legacy_site_id}</span>
											<span>
												<strong>{s.name}</strong>
												<small>{s.work_dates_raw}</small>
											</span>
											<span>›</span>
										</button>
									))}
								</section>
								<section className="panel notes">
									<span className="eyebrow">DATA REVIEW</span>
									<h2>資料核對備忘</h2>
									<div className="note">
										<span className="status">數量一致</span>
										<p>
											69 組月目標與日量合計一致，沒有非零日量因施工日期被排除。
										</p>
									</div>
									<div className="note">
										<span className="status amber">範本待核對</span>
										<p>
											4
											個職安工項在結算範本未找到對應碼。本月日量及前期量未使用這些碼。
										</p>
									</div>
									<p className="muted">
										此預覽不是核定估驗資料，Excel 重算與列印格式仍待驗收。
									</p>
								</section>
							</div>
						</>
					) : (
						<>
							{selected ? (
								<section className="panel detail">
									<button
										className="text-button"
										onClick={() => setDetail(null)}
									>
										← 返回路段清單
									</button>
									<h2>{selected.name}</h2>
									<p className="muted">
										原項次 {selected.legacy_site_id} · 施工日期{" "}
										{selected.work_dates_raw}
									</p>
									<p>正式派工單與施工地點的拆分對應：待確認</p>
									<button
										className="primary"
										onClick={() => {
											setSite(String(selected.legacy_site_id));
											setDate("");
											go("數量查詢");
										}}
									>
										查閱此路段每日數量 →
									</button>
									<h3>月目標與每日量合計</h3>
									<div className="item-grid">
										{data.totals
											.filter((t) => Number(t.site_id) === detail)
											.map((t) => (
												<article className="item" key={t.item_code}>
													<small>{t.item_code}</small>
													<h3>{t.item_name}</h3>
													<dl>
														<div>
															<dt>月目標</dt>
															<dd>
																{t.target_quantity_exact} {t.unit}
															</dd>
														</div>
														<div>
															<dt>日量合計</dt>
															<dd>
																{t.raw_daily_sum_exact} {t.unit}
															</dd>
														</div>
													</dl>
												</article>
											))}
									</div>
								</section>
							) : (
								<>
									<section className="filters" aria-label="查詢條件">
										<label className="search">
											搜尋
											<input
												aria-label="搜尋"
												value={query}
												onChange={(e) => setQuery(e.target.value)}
												placeholder={
													tab === "施工路段"
														? "輸入路段名稱或原項次"
														: "輸入路段、工項名稱或代碼"
												}
											/>
										</label>
										{tab === "數量查詢" && (
											<>
												<label>
													施工路段
													<select
														aria-label="施工路段"
														value={site}
														onChange={(e) => setSite(e.target.value)}
													>
														<option value="">全部路段</option>
														{data.sites.map((s) => (
															<option
																key={s.legacy_site_id}
																value={s.legacy_site_id}
															>
																{s.legacy_site_id} · {s.name}
															</option>
														))}
													</select>
												</label>
												<label>
													施工日期
													<select
														aria-label="施工日期"
														value={date}
														onChange={(e) => setDate(e.target.value)}
													>
														<option value="">全月日期</option>
														{dates.map((d) => (
															<option key={d}>{d}</option>
														))}
													</select>
												</label>
											</>
										)}
										<button
											className="clear"
											onClick={() => {
												setQuery("");
												setSite("");
												setDate("");
											}}
										>
											清除條件
										</button>
									</section>
									<div className="results" role="status">
										共{" "}
										{tab === "施工路段"
											? sites.length + " 個施工路段"
											: records.length + " 筆施工紀錄"}
										<span>篩選只影響畫面，不會改動資料</span>
									</div>
									{tab === "施工路段" ? (
										<div className="site-grid">
											{sites.map((s) => (
												<button
													className="site-card"
													key={s.legacy_site_id}
													onClick={() => setDetail(s.legacy_site_id)}
												>
													<div>
														<span className="site-no">
															原項次 {s.legacy_site_id}
														</span>
														<span className="status">一般</span>
													</div>
													<h2>{s.name}</h2>
													<p>{s.work_dates_raw}</p>
													<footer>
														<span>
															{
																data.totals.filter(
																	(t) => Number(t.site_id) === s.legacy_site_id,
																).length
															}{" "}
															個工項
														</span>
														<span>查看明細 ↗</span>
													</footer>
												</button>
											))}
										</div>
									) : (
										<div className="table-wrap">
											<table>
												<caption className="sr-only">每日施工數量</caption>
												<thead>
													<tr>
														<th>日期</th>
														<th>施工路段</th>
														<th>工項</th>
														<th className="num">施工數量</th>
													</tr>
												</thead>
												<tbody>
													{records.map((r) => (
														<tr key={r.source_json_key}>
															<td data-label="日期">{r.work_date}</td>
															<td data-label="施工路段">{r.site_name}</td>
															<td data-label="工項">
																<small>{r.item_code}</small>
																{r.item_name}
															</td>
															<td className="num" data-label="施工數量">
																<strong>{r.quantity_exact}</strong>{" "}
																<span>{r.unit}</span>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
									{(tab === "施工路段" ? sites.length : records.length) ===
										0 && (
										<div className="empty">
											<h2>沒有符合的紀錄</h2>
											<p>請調整關鍵字，或清除查詢條件。</p>
										</div>
									)}
								</>
							)}
						</>
					)}
					<footer className="page-foot">
						資料來源：公園 115 年 8 月存檔副本 · 目前僅開放查詢
					</footer>
				</main>
			</div>
		</div>
	);
}
