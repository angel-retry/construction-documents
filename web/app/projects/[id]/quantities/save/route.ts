import { saveItem } from "../actions";

export async function POST(request: Request) {
	// Unlike Server Actions, Route Handlers need their own same-origin check.
	const origin = request.headers.get("origin");
	let sameOrigin = false;
	try {
		sameOrigin =
			!!origin && new URL(origin).host === request.headers.get("host");
	} catch {}
	if (!sameOrigin) {
		return Response.json(
			{ ok: false, message: "請從原網站重試儲存。" },
			{ status: 403 },
		);
	}
	try {
		const result = await saveItem({ message: "" }, await request.formData());
		return Response.json(result, { headers: { "Cache-Control": "no-store" } });
	} catch {
		return Response.json(
			{ ok: false, message: "無法儲存，請確認登入與連線後重試；輸入仍保留。" },
			{ status: 500 },
		);
	}
}
