import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../lib/supabase/session";
import {
	uuidPattern,
	type ProjectSettings,
} from "../../../lib/project-validation";
import { SettingsForm } from "../forms";
import { logout } from "../../login/actions";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { client, user } = await requireUser();
	const { id } = await params;
	if (!uuidPattern.test(id)) notFound();
	const { data, error } = await client
		.from("project_settings_view")
		.select("*")
		.eq("id", id)
		.maybeSingle();
	if (error)
		return (
			<main style={{ padding: 32 }}>
				<h1>暫時無法讀取標案</h1>
				<p>請稍後再試。</p>
				<Link href="/projects">返回標案列表</Link>
			</main>
		);
	if (!data) notFound();
	const project = data as ProjectSettings;
	const [org, member] = await Promise.all([
		client
			.from("organization_members")
			.select("role,status")
			.eq("org_id", project.org_id)
			.eq("user_id", user.id)
			.maybeSingle(),
		client
			.from("project_members")
			.select("role,status")
			.eq("project_id", id)
			.eq("user_id", user.id)
			.maybeSingle(),
	]);
	const canEdit =
		project.status === "active" &&
		org.data?.status === "active" &&
		(["owner", "admin"].includes(org.data.role) ||
			(member.data?.status === "active" &&
				["manager", "office"].includes(member.data.role)));
	return (
		<main style={{ maxWidth: 1300, margin: "auto", padding: "40px 24px" }}>
			<div className="old-inline" style={{ justifyContent: "space-between" }}>
				<Link href="/projects">← 標案列表</Link>
				<form action={logout}>
					<button>登出</button>
				</form>
			</div>
			<h1 className="system-title">
				{project.kind === "park" ? "公園" : "雨水"}工程施工文件系統
			</h1>
			<p className="old-caption">
				{project.code}｜{project.name}
			</p>
			<div className="old-tabs">
				<button aria-current="page" style={{ color: "#ff4b4b" }}>
					基本設定
				</button>
				<Link href={`/projects/${id}/sites`}>施工路段</Link>
				<Link href={`/projects/${id}/quantities`}>每日數量與帳務總覽</Link>
				<Link href={`/projects/${id}/prior`}>前期累計</Link>
				<Link href={`/projects/${id}/export`}>匯出 Excel</Link>
			</div>
			<h2>工程基本設定</h2>
			<SettingsForm project={project} canEdit={!!canEdit} />
			<p className="old-info">
				這裡保存標案基本資料。施工路段分頁依年度／月份管理，數量及前期累計已提供專屬分頁；Excel
				輸出請至匯出分頁，不會自動匯入舊版的工程數量。
			</p>
		</main>
	);
}
