import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import { monthMinimum, parsePeriod } from "../../../../lib/reporting-period";
import SiteManager from "./site-manager";
import PeriodMemory from "./period-memory";
export const dynamic = "force-dynamic";
export default async function SitesPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { client, user } = await requireUser();
	const { id } = await params;
	if (!uuidPattern.test(id)) notFound();
	const { data: p, error } = await client
		.from("projects")
		.select("id,org_id,code,name,kind,status")
		.eq("id", id)
		.maybeSingle();
	if (error)
		return (
			<main>
				<p role="alert">無法讀取標案，請稍後再試。</p>
			</main>
		);
	if (!p) notFound();
	const query = await searchParams;
	const period = parsePeriod(query.year, query.month, p.kind);
	const [org, member, periods] = await Promise.all([
		client
			.from("organization_members")
			.select("role,status")
			.eq("org_id", p.org_id)
			.eq("user_id", user.id)
			.maybeSingle(),
		client
			.from("project_members")
			.select("role,status")
			.eq("project_id", id)
			.eq("user_id", user.id)
			.maybeSingle(),
		client
			.from("reporting_periods")
			.select("id,period_start,status")
			.eq("project_id", id)
			.order("period_start", { ascending: false }),
	]);
	const selected = periods.data?.find((r) => r.period_start === period?.start);
	const canEdit =
		p.status === "active" &&
		selected?.status !== "closed" &&
		org.data?.status === "active" &&
		(["owner", "admin"].includes(org.data.role) ||
			(member.data?.status === "active" &&
				["manager", "office"].includes(member.data.role)));
	const rows = selected
		? await client
				.from("monthly_sites")
				.select("id,item_number,name,work_dates,note,case_override,revision")
				.eq("project_id", id)
				.eq("period_id", selected.id)
				.order("sort_order")
		: { data: [], error: null };
	const min = monthMinimum(p.kind);
	return (
		<main
			className="compact-sites-page"
			style={{ maxWidth: 1500, margin: "auto", padding: "20px 24px" }}
		>
			<PeriodMemory
				user={user.id}
				project={id}
				kind={p.kind}
				year={period?.rocYear}
				month={period?.month}
				restore={query.year === undefined && query.month === undefined}
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
				<button aria-selected="true">施工路段</button>
				<Link href={`/projects/${id}/quantities`}>每日數量與帳務總覽</Link>
				<Link href={`/projects/${id}/prior`}>前期累計</Link>
				<Link href={`/projects/${id}/export`}>匯出 Excel</Link>
			</div>
			<form method="get" key={period?.start || "unselected"}>
				<div className="old-grid two">
					<label className="old-field">
						民國年
						<input
							type="number"
							name="year"
							required
							min="10"
							max="999"
							defaultValue={period?.rocYear || 115}
						/>
					</label>
					<label className="old-field">
						月份
						<select name="month" defaultValue={period?.month || min}>
							{Array.from({ length: 13 - min }, (_, i) => i + min).map((m) => (
								<option key={m} value={m}>
									{m} 月
								</option>
							))}
						</select>
					</label>
				</div>
				<button>切換月份</button>
			</form>
			{periods.error ? (
				<p role="alert">無法讀取月份資料，請稍後再試。</p>
			) : (
				<>
					<p className="old-caption">
						已建立月份：
						{periods.data?.length
							? periods.data.map((r) => (
									<Link
										key={r.id}
										style={{ marginRight: 12 }}
										href={`?year=${Number(r.period_start.slice(0, 4)) - 1911}&month=${Number(r.period_start.slice(5, 7))}`}
									>
										{Number(r.period_start.slice(0, 4)) - 1911}年
										{Number(r.period_start.slice(5, 7))}月
									</Link>
								))
							: "尚無"}
					</p>
					{!period ? (
						<p className="old-info">請先選擇民國年及月份，再新增路段。</p>
					) : (
						<>
							<h2>
								施工路段｜{period.rocYear}年{period.month}月
							</h2>
							<p className="old-caption">
								直接修改清單，最後一列新增。↑ ↓
								調整匯出順序；既有路段離開欄位自動儲存。施工日期可填民國日期、多日或區間。
							</p>
							{rows.error ? (
								<p role="alert">本月份路段無法讀取，請確認雲端設定。</p>
							) : (
								<>
									{canEdit ? (
										<SiteManager
											key={`site-manager-${period.start}`}
											project={id}
											year={period.rocYear}
											month={period.month}
											rows={rows.data || []}
										/>
									) : (
										<>
											{rows.data?.map((row) => (
												<p key={row.id}>
													{row.item_number}｜{row.name}｜{row.work_dates}｜
													{row.note}｜{row.case_override || "自動判斷"}
												</p>
											))}
											<p>此標案或月份目前為唯讀。</p>
										</>
									)}
								</>
							)}
						</>
					)}
				</>
			)}
		</main>
	);
}
