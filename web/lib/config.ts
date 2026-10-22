export function appMode(): "local-preview" | "supabase" {
	const mode = process.env.APP_MODE || "local-preview";
	if (mode !== "local-preview" && mode !== "supabase")
		throw new Error("Unknown APP_MODE");
	return mode;
}
export function supabaseConfig() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) return null;
	try {
		const parsed = new URL(url);
		if (
			parsed.protocol !== "https:" &&
			!(
				parsed.protocol === "http:" &&
				["localhost", "127.0.0.1"].includes(parsed.hostname)
			)
		)
			return null;
	} catch {
		return null;
	}
	// Only modern publishable keys. Secret/service-role keys must never reach the client.
	if (!key.startsWith("sb_publishable_")) return null;
	return { url, key };
}
