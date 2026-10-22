"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/supabase/session";
import { uuidPattern, validateSettings } from "../../lib/project-validation";
export type FormState = { message: string; ok?: boolean; revision?: string };
export async function createProject(
	_previous: FormState,
	form: FormData,
): Promise<FormState> {
	const { client } = await requireUser();
	const org = String(form.get("org_id") || ""),
		code = String(form.get("code") || "").trim(),
		name = String(form.get("name") || "").trim(),
		kind = String(form.get("kind") || "");
	if (
		!uuidPattern.test(org) ||
		!code ||
		code.length > 80 ||
		!name ||
		name.length > 500 ||
		!["park", "rainwater"].includes(kind)
	)
		return { message: "請填寫公司、標案編號、名稱與工程類型。" };
	const { data, error } = await client.rpc("create_project", {
		p_org: org,
		p_code: code,
		p_name: name,
		p_kind: kind,
	});
	if (error)
		return {
			message:
				error.code === "23505"
					? "此公司已有相同標案編號。"
					: error.code === "42501"
						? "你沒有新增此公司標案的權限。"
						: "新增失敗，請確認連線與資料庫設定。",
		};
	revalidatePath("/projects");
	redirect(`/projects/${data}`);
}
export async function saveSettings(
	previous: FormState,
	form: FormData,
): Promise<FormState> {
	const { client } = await requireUser();
	const input = validateSettings(form);
	if ("error" in input)
		return { message: input.error, revision: previous.revision };
	const { error } = await client.rpc("save_project_settings", {
		p_id: input.id,
		p_revision: input.revision,
		p_name: input.fields.name,
		p_owner: input.fields.owner,
		p_contractor: input.fields.contractor,
		p_supervisor: input.fields.supervisor,
		p_location: input.fields.location,
		p_contract_amount: input.amount,
	});
	if (error)
		return {
			revision: input.revision,
			message:
				error.code === "40001"
					? "這筆資料已被其他人更新。本次未覆寫；請保留目前輸入，重新載入後核對。"
					: error.code === "42501"
						? "此標案已封存或你沒有編輯權限。"
						: "儲存失敗，請確認連線；目前輸入仍保留。",
		};
	revalidatePath(`/projects/${input.id}`);
	revalidatePath("/projects");
	return {
		ok: true,
		message: "已儲存。",
		revision: (BigInt(input.revision) + BigInt(1)).toString(),
	};
}
