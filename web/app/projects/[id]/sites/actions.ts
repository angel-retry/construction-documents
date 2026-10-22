"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import { parsePeriod } from "../../../../lib/reporting-period";
import { validateWorkDates } from "../../../../lib/legacy-work-dates";
export type SiteState = {
	message: string;
	ok?: boolean;
	id?: string;
	revision: number;
};
export async function reorderSites(
	project: string,
	year: number,
	month: number,
	expected: string[],
	ordered: string[],
) {
	const { client } = await requireUser();
	if (
		!uuidPattern.test(project) ||
		!Number.isInteger(year) ||
		year < 10 ||
		year > 999 ||
		!Number.isInteger(month) ||
		month < 1 ||
		month > 12 ||
		!Array.isArray(expected) ||
		!Array.isArray(ordered) ||
		!expected.length ||
		expected.length !== ordered.length ||
		!expected.every((id) => uuidPattern.test(id)) ||
		!ordered.every((id) => uuidPattern.test(id))
	)
		return { message: "順序資料無效，請重新載入。" };
	const { error } = await client.rpc("reorder_monthly_sites", {
		p_project: project,
		p_year: year,
		p_month: month,
		p_expected: expected,
		p_order: ordered,
	});
	if (error)
		return {
			message:
				error.code === "40001"
					? "清單已被其他操作更新，請重新載入後再調整。"
					: error.code === "42501"
						? "月份已關閉或沒有修改權限。"
						: error.code === "PGRST202"
							? "排序功能尚未完成啟用，未變更順序。"
							: "順序儲存失敗，請重試。",
		};
	for (const page of ["sites", "quantities", "export"])
		revalidatePath(`/projects/${project}/${page}`);
	return { message: "順序已儲存，匯出將沿用此順序。" };
}
export async function saveSite(
	previous: SiteState,
	form: FormData,
): Promise<SiteState> {
	const { client } = await requireUser();
	const v = (key: string) => String(form.get(key) || "");
	const project = v("project"),
		id = v("id"),
		revision = Number(v("revision")),
		number = Number(v("item_number"));
	const fail = (message: string) => ({ ...previous, ok: false, message });
	if (
		!uuidPattern.test(project) ||
		(id && !uuidPattern.test(id)) ||
		!Number.isInteger(revision) ||
		revision < 1 ||
		!Number.isInteger(number) ||
		number < 1 ||
		number > 2147483647
	)
		return fail("請確認項次及資料版本。");
	const { data: p, error: pe } = await client
		.from("projects")
		.select("kind")
		.eq("id", project)
		.maybeSingle();
	if (pe || !p) return fail("無法讀取此標案。");
	const period = parsePeriod(v("year"), v("month"), p.kind);
	if (!period) return fail("請選擇有效的民國年及月份。");
	const name = v("name").trim(),
		dates = v("work_dates"),
		note = v("note"),
		kind = v("case_override");
	if (
		!name ||
		name.length > 500 ||
		dates.length > 2000 ||
		note.length > 2000 ||
		!["", "normal", "independent"].includes(kind)
	)
		return fail("請填寫路段名稱並確認欄位長度。");
	const dateError = validateWorkDates(dates);
	if (dateError) return fail(dateError);
	try {
		const { data, error } = await client.rpc("save_monthly_site", {
			p_project: project,
			p_year: period.rocYear,
			p_month: period.month,
			p_id: id || null,
			p_revision: revision,
			p_number: number,
			p_name: name,
			p_dates: dates,
			p_note: note,
			p_case: kind || null,
		});
		if (error)
			return fail(
				error.code === "23505"
					? "此月份已有相同項次，請使用不同項次。"
					: error.code === "40001"
						? "此路段已被更新，未覆寫；請保留輸入並重新載入核對。"
						: error.code === "42501"
							? "本月份已關閉、標案已封存或你沒有編輯權限。"
							: error.code === "PGRST202"
								? "雲端施工路段設定尚未完成。"
								: "保存失敗，目前輸入仍保留，請重試。",
			);
		revalidatePath(`/projects/${project}/sites`);
		return {
			ok: true,
			message: "已自動存檔。",
			id: data,
			revision: id ? revision + 1 : 1,
		};
	} catch {
		return fail("目前無法連線，輸入仍保留，請重試。");
	}
}

export async function assignOrder(
	previous: { message: string; ok?: boolean },
	form: FormData,
): Promise<{ message: string; ok?: boolean }> {
	const { client } = await requireUser();
	const v = (key: string) => String(form.get(key) || "");
	const project = v("project"),
		order = v("order"),
		revision = Number(v("revision"));
	const fail = (message: string) => ({ ok: false, message });
	if (
		!uuidPattern.test(project) ||
		!uuidPattern.test(order) ||
		!Number.isInteger(revision) ||
		revision < 1
	)
		return fail("請選擇既有派工單。");
	const { data: p } = await client
		.from("projects")
		.select("kind")
		.eq("id", project)
		.maybeSingle();
	const period = p && parsePeriod(v("year"), v("month"), p.kind);
	if (!period) return fail("請選擇有效的民國年及月份。");
	const dates = v("work_dates");
	if (dates.length > 2000) return fail("施工日期文字過長。");
	const invalid = validateWorkDates(dates);
	if (invalid) return fail(invalid);
	try {
		const { error } = await client.rpc("assign_work_order_to_month", {
			p_project: project,
			p_order: order,
			p_revision: revision,
			p_year: period.rocYear,
			p_month: period.month,
			p_dates: dates,
		});
		if (error)
			return fail(
				error.code === "23505"
					? "此派工單已歸入本月，或本月已有相同項次；未重複建立或覆寫。"
					: error.code === "40001"
						? "派工單已被修改，請重新載入核對後再歸入。"
						: error.code === "42501"
							? "月份已關閉、標案已封存或沒有編輯權限。"
							: error.code === "PGRST202"
								? "雲端歸入月份功能尚未啟用。"
								: error.code === "22023"
									? "此派工單無法直接歸入：請確認為正整數編號、名稱不超過 500 字，且沒有多個施工地點。"
									: "歸入失敗，請稍後重試。",
			);
		revalidatePath(`/projects/${project}/sites`);
		revalidatePath(`/projects/${project}/work-orders`);
		return {
			ok: true,
			message: `已歸入 ${period.rocYear} 年 ${period.month} 月，原派工單編號與內容保留。`,
		};
	} catch {
		return fail("目前無法連線，請稍後重試。");
	}
}
