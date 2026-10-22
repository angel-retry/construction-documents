"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import { parsePriorPaste } from "../../../../lib/prior-paste";
import catalogs from "../../../../lib/legacy-catalog.json";
export type PriorState = {
	ok?: boolean;
	message: string;
	revision?: number;
	codes?: string;
	quantities?: string;
};
export async function savePrior(
	previous: PriorState,
	form: FormData,
): Promise<PriorState> {
	const { client } = await requireUser();
	const period = String(form.get("period") || ""),
		revision = Number(form.get("revision"));
	const codes = String(form.get("codes") || ""),
		quantities = String(form.get("quantities") || "");
	if (!uuidPattern.test(period) || !Number.isInteger(revision) || revision < 1)
		return { message: "月份或版本無效，請重新載入。" };
	try {
		const { data: r } = await client
			.from("reporting_periods")
			.select("project_id")
			.eq("id", period)
			.maybeSingle();
		const { data: p } = r
			? await client
					.from("projects")
					.select("kind")
					.eq("id", r.project_id)
					.maybeSingle()
			: { data: null };
		if (!p) return { message: "無法讀取標案或月份。" };
		const catalog = catalogs[p.kind as keyof typeof catalogs];
		const parsed = parsePriorPaste(codes, quantities, JSON.parse(catalog));
		if (parsed.errors.length || !Object.keys(parsed.values).length)
			return { message: parsed.errors[0] || "沒有可套用的數量。" };
		const values = Object.fromEntries(
			Object.entries(parsed.values).map(([code, n]) => [code, n.toFixed(6)]),
		);
		const { data, error } = await client.rpc("save_prior_balances", {
			p_period: period,
			p_revision: revision,
			p_values: values,
			p_catalog: catalog,
		});
		if (error)
			return {
				ok: false,
				message:
					error.code === "40001"
						? "前期累計已被更新，未覆寫；請保留貼上內容，重新載入後核對。"
						: error.code === "42501"
							? "月份已關閉或沒有編輯權限。"
							: error.code === "PGRST202"
								? "雲端前期累計寫入尚未啟用。"
								: "未儲存，請檢查工項與數量或稍後重試。",
			};
		revalidatePath(`/projects/${r.project_id}/prior`);
		return {
			ok: true,
			message: `已儲存 ${Object.keys(values).length} 筆前期累計數量。`,
			revision: data,
			codes,
			quantities,
		};
	} catch {
		return { ok: false, message: "無法連線，貼上內容仍保留，請稍後重試。" };
	}
}
