import "server-only";
import { createHash } from "node:crypto";
export async function exportSnapshot(
	client: any,
	projectId: string,
	start: string,
	end: string,
) {
	const rows = async (
		table: string,
		columns: string,
		filter: (q: any) => any = (q: any) => q,
	) => {
		const result: any[] = [];
		for (let offset = 0; ; offset += 500) {
			const { data, error } = await filter(
				client.from(table).select(columns).eq("project_id", projectId),
			)
				.order("id")
				.range(offset, offset + 499);
			if (error) throw Error("無法讀取匯出資料，請稍後重試。");
			result.push(...data);
			if (data.length < 500) return result;
		}
	};
	const { data: project, error } = await client
		.from("projects")
		.select("*")
		.eq("id", projectId)
		.maybeSingle();
	if (error || !project) throw Error("無法讀取標案或沒有存取權限。");
	const { data: period, error: pe } = await client
		.from("reporting_periods")
		.select("*")
		.eq("project_id", projectId)
		.eq("period_start", start)
		.maybeSingle();
	if (pe || !period) throw Error("本月份尚未建立。");
	const asOf = new Date(Date.parse(start + "T00:00:00Z") - 86400000)
		.toISOString()
		.slice(0, 10);
	const [sites, targets, daily, balances, versions] = await Promise.all([
		rows("monthly_sites", "*", (q) => q.eq("period_id", period.id)),
		rows(
			"item_period_targets",
			"*,work_order_items!inner(work_order_site_id,contract_items(*))",
			(q) => q.eq("period_id", period.id),
		),
		rows("daily_quantities", "*", (q) =>
			q.gte("work_date", start).lte("work_date", end),
		),
		rows("opening_balances", "*,contract_items!inner(*)", (q) =>
			q.eq("as_of_date", asOf),
		),
		rows("contract_versions", "*"),
	]);
	const snapshot = {
		project,
		period,
		sites,
		targets,
		daily,
		balances,
		versions,
	};
	return {
		snapshot,
		hash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
	};
}
