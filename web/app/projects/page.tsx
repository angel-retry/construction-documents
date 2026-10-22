import Link from "next/link";
import { requireUser } from "../../lib/supabase/session";
import { logout } from "../login/actions";
import { NewProjectForm } from "./forms";
export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
	const { client, user } = await requireUser();
	const [projects, orgs, members] = await Promise.all([
		client
			.from("projects")
			.select("id,code,name,kind,status")
			.order("created_at", { ascending: false }),
		client.from("organizations").select("id,name"),
		client
			.from("organization_members")
			.select("org_id,role,status")
			.eq("user_id", user.id),
	]);
	if (projects.error || orgs.error || members.error)
		return (
			<main style={{ padding: 32 }}>
				<h1>標案管理</h1>
				<p role="alert">
					目前無法讀取標案。請確認連線及資料表設定，尚未變更任何資料。
				</p>
				<form action={logout}>
					<button>登出</button>
				</form>
			</main>
		);
	const adminOrgs = (orgs.data || []).filter((o) =>
		(members.data || []).some(
			(m) =>
				m.org_id === o.id &&
				m.status === "active" &&
				["owner", "admin"].includes(m.role),
		),
	);
	return (
		<main style={{ maxWidth: 1200, margin: "auto", padding: "40px 24px" }}>
			<div className="old-inline" style={{ justifyContent: "space-between" }}>
				<h1 className="system-title">工程施工文件系統</h1>
				<form action={logout}>
					<button>登出</button>
				</form>
			</div>
			<p className="old-caption">{user.email} · 僅顯示你有權限的標案</p>
			<h2>標案管理</h2>
			{projects.data?.length ? (
				<div className="old-table-scroll">
					<table>
						<thead>
							<tr>
								<th>標案編號</th>
								<th>工程名稱</th>
								<th>類型</th>
								<th>狀態</th>
							</tr>
						</thead>
						<tbody>
							{projects.data.map((p) => (
								<tr key={p.id}>
									<td>{p.code}</td>
									<td>
										<Link href={`/projects/${p.id}`}>{p.name}</Link>
									</td>
									<td>{p.kind === "park" ? "公園" : "雨水"}</td>
									<td>{p.status === "active" ? "使用中" : "已封存"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="old-info">
					目前沒有可查看的標案。請由公司管理員建立標案或設定成員權限。
				</p>
			)}
			{adminOrgs.length > 0 && (
				<details className="old-expander">
					<summary>新增標案</summary>
					<div className="old-expander-body">
						<NewProjectForm organizations={adminOrgs} />
					</div>
				</details>
			)}
		</main>
	);
}
