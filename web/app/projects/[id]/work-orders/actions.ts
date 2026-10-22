"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
export type OrderState = {
	message: string;
	ok?: boolean;
	revision?: number;
	id?: string;
};
export async function saveOrder(
	previous: OrderState,
	form: FormData,
): Promise<OrderState> {
	const { client } = await requireUser();
	const value = (key: string) => String(form.get(key) || "").trim();
	const project = value("project"),
		id = value("id"),
		number = value("number"),
		title = value("title"),
		status = value("status"),
		kind = value("case_override"),
		issued = value("issued_on"),
		due = value("due_on"),
		revision = Number(value("revision"));
	const failure = (message: string) => ({ ...previous, ok: false, message });
	if (
		!uuidPattern.test(project) ||
		(id && !uuidPattern.test(id)) ||
		!number ||
		number.length > 80 ||
		!title ||
		title.length > 500 ||
		!["draft", "active", "closed"].includes(status) ||
		!["", "normal", "independent"].includes(kind) ||
		(id && (!Number.isInteger(revision) || revision < 1))
	)
		return failure("請確認派工單編號、名稱及狀態。");
	const validDate = (date: string) =>
		!date ||
		(/^\d{4}-\d{2}-\d{2}$/.test(date) &&
			!Number.isNaN(Date.parse(date)) &&
			new Date(date).toISOString().slice(0, 10) === date);
	if (!validDate(issued) || !validDate(due) || (issued && due && due < issued))
		return failure("請確認日期，預定完成日不可早於派工日期。");
	try {
		const { data, error } = await client.rpc("save_work_order", {
			p_project: project,
			p_id: id || null,
			p_revision: revision || 1,
			p_number: number,
			p_title: title,
			p_issued: issued || null,
			p_due: due || null,
			p_status: status,
			p_case: kind || null,
		});
		if (error)
			return failure(
				error.code === "23505"
					? "此標案已有相同派工單編號。"
					: error.code === "40001"
						? "資料已被更新，未覆寫。請保留輸入並重新開啟核對。"
						: error.code === "42501"
							? "此標案已封存或你沒有編輯權限。"
							: error.code === "PGRST202"
								? "派工單雲端設定尚未完成，資料尚未儲存。"
								: "儲存失敗，請稍後再試；目前輸入仍保留。",
			);
		revalidatePath(`/projects/${project}/work-orders`);
		return {
			ok: true,
			message: "已儲存派工單。",
			id: data,
			revision: id ? revision + 1 : 1,
		};
	} catch {
		return failure("目前無法連線，輸入仍保留，請稍後再試。");
	}
}
