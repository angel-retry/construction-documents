import "server-only";
import { redirect } from "next/navigation";
import { appMode, supabaseConfig } from "../config";
import { createClient } from "./server";
export async function requireUser() {
	if (appMode() !== "supabase" || !supabaseConfig()) redirect("/login");
	const client = await createClient();
	const { data, error } = await client.auth.getUser();
	if (error || !data.user) redirect("/login");
	return { client, user: data.user };
}
