import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { appMode } from "../../../lib/config";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  if (appMode() !== "local-preview")
    return new Response("Not found", { status: 404 });
  const { key } = await params;
  if (!["log", "settlement", "json"].includes(key))
    return new Response("Not found", { status: 404 });
  const base = path.join(process.cwd(), ".local-data");
  const manifest: { key: string; filename: string; sha256: string }[] =
    JSON.parse(await readFile(path.join(base, "downloads.json"), "utf8"));
  const entry = manifest.find((f) => f.key === key);
  if (key !== "json" && !entry)
    return new Response("Not found", { status: 404 });
  const bytes = await readFile(
    path.join(base, key === "json" ? "original.json" : `${key}.xlsx`),
  );
  if (
    entry &&
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    return new Response("Reference verification failed", { status: 500 });
  const name = entry?.filename || "公園_115年8月.json";
  return new Response(bytes, {
    headers: {
      "Content-Type":
        key === "json"
          ? "application/json"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
