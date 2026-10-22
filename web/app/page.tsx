import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Preview from "./legacy-preview";
import type { Snapshot } from "../lib/types";
import { appMode } from "../lib/config";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
	if (appMode() === "supabase") redirect("/projects");
	const data: Snapshot = JSON.parse(
		await readFile(
			path.join(process.cwd(), ".local-data", "snapshot.json"),
			"utf8",
		),
	);
	return <Preview data={data} />;
}
