export const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ProjectSettings = {
	id: string;
	org_id: string;
	code: string;
	name: string;
	kind: "park" | "rainwater";
	owner: string;
	contractor: string;
	supervisor: string;
	location: string;
	contract_amount: string | null;
	revision: string;
	status: string;
};
export function validateSettings(form: FormData) {
	const id = String(form.get("id") || "");
	const revision = String(form.get("revision") || "");
	const fields = {
		name: String(form.get("name") || "").trim(),
		owner: String(form.get("owner") || "").trim(),
		contractor: String(form.get("contractor") || "").trim(),
		supervisor: String(form.get("supervisor") || "").trim(),
		location: String(form.get("location") || "").trim(),
	};
	const amount = String(form.get("contract_amount") || "").trim();
	if (!uuidPattern.test(id) || !/^[1-9]\d{0,17}$/.test(revision))
		return { error: "資料識別或版本不正確，請重新載入頁面。" } as const;
	if (!fields.name || Object.values(fields).some((v) => v.length > 500))
		return { error: "請填寫工程名稱，各文字欄位限500字以內。" } as const;
	if (amount && !/^\d{1,18}(\.\d{1,2})?$/.test(amount))
		return {
			error: "契約金額請填非負數，最多18位整數及2位小數；未確認可留空。",
		} as const;
	return { id, revision, fields, amount: amount || null } as const;
}
