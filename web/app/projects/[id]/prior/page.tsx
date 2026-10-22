import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import { parsePeriod, monthMinimum } from "../../../../lib/reporting-period";
import catalogs from "../../../../lib/legacy-catalog.json";
import PeriodMemory from "../sites/period-memory";
import PriorEditor from "./editor";
export const dynamic = "force-dynamic";
export default async function PriorPage({
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
	if (error) return <main>無法讀取標案。</main>;
	if (!p) notFound();
	const query = await searchParams;
	const period = parsePeriod(query.year, query.month, p.kind);
	const suffix = period ? `?year=${period.rocYear}&month=${period.month}` : "";
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
			.select("*")
			.eq("project_id", id)
			.order("period_start", { ascending: false }),
	]);
	const selected = periods.data?.find((r) => r.period_start === period?.start);
	const editable =
		p.status === "active" &&
		selected?.status === "open" &&
		Number.isInteger(selected?.prior_revision) &&
		org.data?.status === "active" &&
		(["owner", "admin"].includes(org.data.role) ||
			(member.data?.status === "active" &&
				["manager", "office"].includes(member.data.role)));
	const existing: Record<string, number> = {};
	let loadError = false;
	if (selected) {
		const asOf = new Date(
			Date.parse(selected.period_start + "T00:00:00Z") - 86400000,
		)
			.toISOString()
			.slice(0, 10);
		for (let offset = 0; ; offset += 500) {
			const { data, error } = await client
				.from("opening_balances")
				.select("id,quantity,contract_items!inner(code)")
				.eq("project_id", id)
				.eq("as_of_date", asOf)
				.order("id")
				.range(offset, offset + 499);
			if (error) {
				loadError = true;
				break;
			}
			for (const row of data) {
				const item = row.contract_items as unknown as { code: string };
				if (Object.hasOwn(existing, item.code)) {
					loadError = true;
					break;
				}
				existing[item.code] = Number(row.quantity);
			}
			if (loadError || data.length < 500) break;
		}
	}
	return (
		<main style={{ maxWidth: 1500, margin: "auto", padding: "32px 24px" }}>
			<PeriodMemory
				user={user.id}
				project={id}
				kind={p.kind}
				year={period?.rocYear}
				month={period?.month}
				restore={query.year === undefined && query.month === undefined}
				page="prior"
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
				<button aria-current="page">前期累計</button>
				<Link href={`/projects/${id}/export`}>匯出 Excel</Link>
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
				前期累計數量{period ? `｜${period.rocYear}年${period.month}月` : ""}
			</h2>
			{periods.error || loadError ? (
				<p role="alert">無法讀取前期累計，請確認資料及契約版本後重試。</p>
			) : !period ? (
				<p>請先選擇民國年及月份。</p>
			) : !selected ? (
				<p>
					本月份尚未建立，請先到
					<Link href={`/projects/${id}/sites${suffix}`}>施工路段</Link>
					新增或歸入派工單。
				</p>
			) : (
				<PriorEditor
					key={selected.id}
					period={selected.id}
					revision={selected.prior_revision ?? 1}
					items={JSON.parse(catalogs[p.kind as keyof typeof catalogs])}
					existing={existing}
					editable={!!editable}
				/>
			)}
		</main>
	);
}
