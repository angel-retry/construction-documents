import Link from "next/link";
import { appMode, supabaseConfig } from "../../lib/config";
import LoginForm from "./form";
export const dynamic = "force-dynamic";
export default function LoginPage() {
	const ready = appMode() === "supabase" && !!supabaseConfig();
	return (
		<main style={{ maxWidth: 520, margin: "8vh auto", padding: 24 }}>
			<h1>工程施工文件系統</h1>
			<h2>登入</h2>
			{ready ? (
				<>
					<p className="old-caption">
						請使用公司核發的帳號。登入後僅顯示你有權限的標案。
					</p>
					<LoginForm />
				</>
			) : (
				<div className="old-info">
					<strong>登入服務尚未連接</strong>
					<p>
						目前仍可查看原版格式的本機預覽。連接公司帳號服務後，這裡才會開放登入與保存資料。
					</p>
				</div>
			)}
			{appMode() === "local-preview" && (
				<p>
					<Link href="/">返回本機預覽</Link>
				</p>
			)}
		</main>
	);
}
