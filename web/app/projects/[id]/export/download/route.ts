import { requireUser } from "../../../../../lib/supabase/session";
import { uuidPattern } from "../../../../../lib/project-validation";
import { parsePeriod } from "../../../../../lib/reporting-period";
import { exportSnapshot } from "../../../../../lib/export-data";
import { legacyProject } from "../../../../../lib/export-snapshot";
import { excelWorker } from "../../../../../lib/excel-worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Next's internal URL can use localhost while the browser uses 127.0.0.1.
	const origin = request.headers.get("origin");
	let sameOrigin = false;
	try {
		const parsed = new URL(origin ?? "");
		sameOrigin =
			["http:", "https:"].includes(parsed.protocol) &&
			parsed.host === request.headers.get("host") &&
			request.headers.get("sec-fetch-site") !== "cross-site";
	} catch {}
	if (!sameOrigin)
		return Response.json({ message: "請從本站匯出頁操作。" }, { status: 403 });
	const { client } = await requireUser();
	const { id } = await params;
	if (!uuidPattern.test(id)) return new Response("Not found", { status: 404 });
	try {
		const form = await request.formData();
		const { data: p } = await client
			.from("projects")
			.select("kind")
			.eq("id", id)
			.maybeSingle();
		if (!p) return new Response("Not found", { status: 404 });
		const period = parsePeriod(form.get("year"), form.get("month"), p.kind);
		if (!period) throw Error("請選擇有效月份。");
		const first = await exportSnapshot(client, id, period.start, period.end);
		if (first.hash !== form.get("snapshot"))
			return Response.json(
				{ message: "資料已更新，請重新整理匯出頁，核對後再產生。" },
				{ status: 409 },
			);
		const second = await exportSnapshot(client, id, period.start, period.end);
		if (first.hash !== second.hash)
			return Response.json(
				{ message: "有人正在修改本月份資料，請稍後重新整理再匯出。" },
				{ status: 409 },
			);
		const bytes = await excelWorker(legacyProject(second.snapshot));
		const name = `${p.kind === "park" ? "公園" : "雨水"}_${period.rocYear}年${period.month}月施工文件.zip`;
		return new Response(new Uint8Array(bytes), {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (e) {
		return Response.json(
			{ message: e instanceof Error ? e.message : "匯出失敗，請稍後重試。" },
			{ status: 400 },
		);
	}
}
