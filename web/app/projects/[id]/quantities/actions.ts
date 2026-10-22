"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import catalogs from "../../../../lib/legacy-catalog.json";
export type QuantityState = {
	ok?: boolean;
	message: string;
	revision?: number;
};
function errorMessage(code: string) {
	return code === "23505"
		? "此月份已加入這個工項。"
		: code === "40001"
			? "施工日期或工項已被更新，未覆寫；請保留輸入並重新載入核對。"
			: code === "42501"
				? "月份已關閉、標案已封存或沒有編輯權限。"
				: code === "PGRST202" || code === "42703"
					? "雲端數量功能尚未啟用。"
					: code === "22023"
						? "工項清單、契約版本或數量格式不符，未保存。"
						: "儲存失敗，請稍後重試。";
}
export async function addItem(
	previous: QuantityState,
	form: FormData,
): Promise<QuantityState> {
	const { client } = await requireUser();
	const site = String(form.get("site") || ""),
		code = String(form.get("code") || "");
	if (!uuidPattern.test(site) || !code)
		return { message: "請先選擇工項。", ok: false };
	const { data: s } = await client
		.from("monthly_sites")
		.select("project_id")
		.eq("id", site)
		.maybeSingle();
	const { data: p } = s
		? await client
				.from("projects")
				.select("kind")
				.eq("id", s.project_id)
				.maybeSingle()
		: { data: null };
	if (!p) return { message: "無法讀取施工路段。", ok: false };
	try {
		const { error } = await client.rpc("add_monthly_item", {
			p_site: site,
			p_code: code,
			p_catalog: catalogs[p.kind as keyof typeof catalogs],
		});
		if (error) return { message: errorMessage(error.code), ok: false };
		revalidatePath(`/projects/${s.project_id}/quantities`);
		return { ok: true, message: "工項已加入；若曾移除，已恢復原數量。" };
	} catch {
		return { ok: false, message: "無法連線，請稍後重試。" };
	}
}
export async function saveItem(
	previous: QuantityState,
	form: FormData,
): Promise<QuantityState> {
	const { client } = await requireUser();
	const v = (key: string) => String(form.get(key) || "");
	const site = v("site"),
		id = v("id"),
		revision = Number(v("revision")),
		siteRevision = Number(v("site_revision"));
	if (
		!uuidPattern.test(site) ||
		!uuidPattern.test(id) ||
		!Number.isInteger(revision) ||
		revision < 1 ||
		!Number.isInteger(siteRevision) ||
		siteRevision < 1
	)
		return { ...previous, ok: false, message: "資料版本無效，請重新載入。" };
	const numeric = /^\d{1,12}(\.\d{1,4})?$/;
	let target = form.has("target") ? v("target") || "0" : undefined;
	let note = form.has("note") ? v("note") : undefined;
	const days: Record<string, string> = {};
	for (const [key, value] of form.entries())
		if (key.startsWith("day:")) {
			const q = String(value) || "0";
			if (!numeric.test(q))
				return {
					...previous,
					ok: false,
					message: "每日數量須為非負數，最多四位小數。",
				};
			days[key.slice(4)] = q;
		}
	if (
		(target !== undefined && !numeric.test(target)) ||
		(note !== undefined && note.length > 2000)
	)
		return {
			...previous,
			ok: false,
			message: "本月數量須為非負數，最多四位小數；備註最多 2000 字。",
		};
	try {
		// Resolve omitted scalars from this row only. The RPC still checks both revisions
		// under its transaction locks, so a concurrent writer cannot be overwritten.
		if (target === undefined || note === undefined) {
			const { data: current, error } = await client
				.from("item_period_targets")
				.select("target_quantity,note,revision")
				.eq("id", id)
				.maybeSingle();
			if (error || !current)
				return {
					...previous,
					ok: false,
					message: "無法讀取工項，輸入仍保留，請重試。",
				};
			if (current.revision !== revision)
				return { ...previous, ok: false, message: errorMessage("40001") };
			target ??= String(current.target_quantity);
			note ??= current.note;
		}
		const { data, error } = await client.rpc("save_monthly_item", {
			p_site: site,
			p_id: id,
			p_revision: revision,
			p_site_revision: siteRevision,
			p_target: target,
			p_note: note,
			p_days: days,
			p_remove: v("operation") === "remove",
		});
		if (error)
			return { ...previous, ok: false, message: errorMessage(error.code) };
		// The caller applies this acknowledgement locally; do not reload the month.
		return {
			ok: true,
			message:
				v("operation") === "remove" ? "已移除，可從加入工項恢復。" : "已儲存。",
			revision: data,
		};
	} catch {
		return { ...previous, ok: false, message: "無法連線，輸入仍保留。" };
	}
}
