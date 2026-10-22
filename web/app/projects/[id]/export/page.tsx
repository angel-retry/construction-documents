import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import { parsePeriod, monthMinimum } from "../../../../lib/reporting-period";
import { exportSnapshot } from "../../../../lib/export-data";
import { legacyProject } from "../../../../lib/export-snapshot";
import PeriodMemory from "../sites/period-memory";
import ExportForm from "./form";
export const dynamic = "force-dynamic";
export default async function ExportPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { client, user } = await requireUser();
	const { id } = await params;
	if (!uuidPattern.test(id)) notFound();
	const { data: p } = await client
		.from("projects")
		.select("id,code,name,kind")
		.eq("id", id)
		.maybeSingle();
	if (!p) notFound();
	const query = await searchParams;
	const period = parsePeriod(query.year, query.month, p.kind);
	const suffix = period ? `?year=${period.rocYear}&month=${period.month}` : "";
	let data: any = null,
		hash = "",
		model: any = null,
		error = "";
	if (period)
		try {
			const result = await exportSnapshot(client, id, period.start, period.end);
			data = result.snapshot;
			hash = result.hash;
			model = legacyProject(data);
		} catch (e) {
			error = e instanceof Error ? e.message : "無法讀取資料。";
		}
	const daily = model?.quantities.filter((q: any) => q.quantity > 0) || [];
	const missing = model
		? Object.entries(model.item_targets)
				.filter(
					([key, qty]) =>
						Number(qty) > 0 &&
						!daily.some((q: any) => `${q.site_id}|${q.item_code}` === key),
				)
				.map(([key]) => key)
		: [];
	return (
		<main style={{ maxWidth: 1300, margin: "auto", padding: "32px 24px" }}>
			<PeriodMemory
				user={user.id}
				project={id}
				kind={p.kind}
				year={period?.rocYear}
				month={period?.month}
				restore={query.year === undefined && query.month === undefined}
				page="export"
			/>
			<Link href="/projects">← 標案列表</Link>
			<h1 className="system-title">
				{p.kind === "park" ? "公園" : "雨水"}工程施工文件系統
			</h1>
			<p>
				{p.code}｜{p.name}
			</p>
			<div className="old-tabs">
				<Link href={`/projects/${id}`}>基本設定</Link>
				<Link href={`/projects/${id}/sites${suffix}`}>施工路段</Link>
				<Link href={`/projects/${id}/quantities${suffix}`}>
					每日數量與帳務總覽
				</Link>
				<Link href={`/projects/${id}/prior${suffix}`}>前期累計</Link>
				<button aria-current="page">匯出 Excel</button>
			</div>
			<form method="get" key={period?.start || "unselected"}>
				<div className="old-grid two">
					<label className="old-field">
						民國年
						<input
							name="year"
							type="number"
							min="10"
							max="999"
							required
							defaultValue={period?.rocYear || 115}
						/>
					</label>
					<label className="old-field">
						月份
						<select
							name="month"
							defaultValue={period?.month || monthMinimum(p.kind)}
						>
							{Array.from(
								{ length: 13 - monthMinimum(p.kind) },
								(_, i) => i + monthMinimum(p.kind),
							).map((m) => (
								<option key={m} value={m}>
									{m} 月
								</option>
							))}
						</select>
					</label>
				</div>
				<button>切換月份</button>
			</form>
			<h2>
				匯出 Excel{period ? `｜${period.rocYear}年${period.month}月` : ""}
			</h2>
			{!period ? (
				<p>請先選擇月份。</p>
			) : error ? (
				<p role="alert">{error}</p>
			) : (
				model && (
					<>
						<p>
							本月份 {model.sites.length} 個路段、{daily.length}{" "}
							筆每日施工數量、{Object.keys(model.prior_cumulative).length}{" "}
							筆前期累計。
						</p>
						<ul>
							<li>施工日誌：全月路段共用一份。</li>
							<li>
								{p.kind === "park"
									? "結算單：上旬、下旬及獨立派工合併為一份活頁簿。"
									: "竣工單：一般派工彙整一份，每個獨立派工案各一份。"}
							</li>
						</ul>
						<p className="old-caption">
							沿用原範本及分類規則：手動指定優先，否則依每日數量金額達 150,000
							元判為獨立派工。匯出只採已儲存的每日數量。
						</p>
						{!!missing.length && (
							<p role="alert">
								以下路段／工項只有本月目標，尚無每日量：{missing.join("、")}。
								{p.kind === "park"
									? "請先分配每日數量。"
									: "原版匯出不包含這些未分配工項。"}
							</p>
						)}
						{!daily.length && <p>請先到每日數量頁填寫並儲存施工數量。</p>}
						<ExportForm
							project={id}
							period={data.period.id}
							year={period.rocYear}
							month={period.month}
							hash={hash}
							ready={
								daily.length > 0 && !(p.kind === "park" && missing.length > 0)
							}
						/>
						<p className="old-caption">
							Excel 保留原公式，開啟後請讓 Excel
							完成重算，再檢查列印預覽。前期進度沿用原範本的直接工程費設定。
						</p>
					</>
				)
			)}
		</main>
	);
}
