"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { appMode, supabaseConfig } from "../../lib/config";
export type LoginState = { message: string };
export async function login(
	_previous: LoginState,
	form: FormData,
): Promise<LoginState> {
	if (appMode() !== "supabase" || !supabaseConfig())
		return { message: "目前尚未連接登入服務。" };
	const email = String(form.get("email") || "").trim();
	const password = String(form.get("password") || "");
	if (!email || !password || email.length > 254 || password.length > 1024)
		return { message: "請輸入有效的電子郵件與密碼。" };
	try {
		const client = await createClient();
		const { error } = await client.auth.signInWithPassword({ email, password });
		if (error) {
			// Log only diagnostic codes. Never log credentials, tokens, or request bodies.
			console.warn("[login failed]", {
				code: error.code || "unknown",
				status: error.status,
			});
			if (error.code === "invalid_credentials")
				return {
					message:
						"帳號或密碼不正確。請使用施工系統帳號的密碼（可能與 Supabase 管理網站的密碼不同）。",
				};
			if (error.code === "email_not_confirmed")
				return { message: "此帳號尚未完成 Email 驗證，請先確認帳號驗證狀態。" };
			if (error.status === 429)
				return { message: "登入嘗試太頻繁，請稍後再試。" };
			if (error.status === 0 || error.name === "AuthRetryableFetchError")
				return { message: "目前無法連接登入服務，請稍後再試。" };
			return {
				message:
					"登入服務回報錯誤，請告知管理員檢查。代碼：" +
					(error.code || String(error.status || "unknown")),
			};
		}
	} catch {
		console.warn("[login failed] connection or server error");
		return { message: "目前無法連接登入服務，請稍後再試。" };
	}
	redirect("/projects");
}
export async function logout() {
	if (appMode() === "supabase" && supabaseConfig()) {
		const client = await createClient();
		const { error } = await client.auth.signOut({ scope: "local" });
		if (error) redirect("/projects?logout=failed");
	}
	redirect("/login");
}
