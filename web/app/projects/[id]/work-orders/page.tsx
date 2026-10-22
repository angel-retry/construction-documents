import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../lib/supabase/session";
import { uuidPattern } from "../../../../lib/project-validation";
import OrderForm from "./form";
export const dynamic = "force-dynamic";
export default async function OrdersPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ q?: string }>;
}) {
	const { client, user } = await requireUser();
	const { id } = await params;
	if (!uuidPattern.test(id)) notFound();
	const { data: project, error: projectError } = await client
		.from("projects")
		.select("id,org_id,code,name,status")
		.eq("id", id)
		.maybeSingle();
	if (projectError)
		return (
			<main>
				<p role="alert">無法讀取標案，請稍後再試。</p>
			</main>
		);
	if (!project) notFound();
	const [orders, org, member] = await Promise.all([
		client
			.from("work_orders")
			.select("id,number,title,issued_on,due_on,status,case_override,revision")
			.eq("project_id", id)
			.not("number", "like", "monthly:%")
			.order("number"),
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
	const editable =
		project.status === "active" &&
		org.data?.status === "active" &&
		(["owner", "admin"].includes(org.data.role) ||
			(member.data?.status === "active" &&
				["manager", "office"].includes(member.data.role)));
	const q = String((await searchParams).q || "")
		.trim()
		.slice(0, 200);
	const rows = (orders.data || []).filter((o) =>
		`${o.number} ${o.title}`.includes(q),
	);
	return (
		<main style={{ maxWidth: 1300, margin: "auto", padding: "40px 24px" }}>
			<Link href="/projects">← 標案列表</Link>
			<h1 className="system-title">工程施工文件系統</h1>
			<p>
				{project.code}｜{project.name}
			</p>
			<div className="old-tabs">
				<Link href={`/projects/${id}`}>基本設定</Link>
				<Link href={`/projects/${id}/sites`}>施工路段</Link>
				<Link href={`/projects/${id}/quantities`}>每日數量與帳務總覽</Link>
				<Link href={`/projects/${id}/prior`}>前期累計</Link>
				<Link href={`/projects/${id}/export`}>匯出 Excel</Link>
			</div>
			<h2>既有派工資料</h2>
			<Link href={`/projects/${id}/sites`}>前往年度／月份施工路段</Link>
			<p className="old-caption">
				這裡保留先前建立的派工資料；請到年度／月份施工路段選擇月份，再將既有派工單歸入。歸入後原派工單仍保留。
			</p>
			{orders.error ? (
				<p role="alert">派工單資料尚無法讀取，請確認雲端設定已完成。</p>
			) : (
				<>
					<form method="get">
						<label className="old-field">
							搜尋派工單
							<input
								name="q"
								defaultValue={q}
								maxLength={200}
								placeholder="派工單編號或名稱"
							/>
						</label>
						<button>查詢</button>
					</form>
					<div className="old-table-scroll">
						<table>
							<thead>
								<tr>
									{[
										"派工單編號",
										"派工名稱",
										"派工日期",
										"預定完成日",
										"狀態",
										"案件類別",
									].map((h) => (
										<th key={h}>{h}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rows.map((o) => (
									<tr key={o.id}>
										<td>{o.number}</td>
										<td>
											{o.title}
											{editable && (
												<details className="old-expander">
													<summary>修改派工單</summary>
													<OrderForm project={id} order={o} />
												</details>
											)}
										</td>
										<td>{o.issued_on || "—"}</td>
										<td>{o.due_on || "—"}</td>
										<td>
											{{ draft: "草稿", active: "施作中", closed: "已結案" }[
												o.status as string
											] || o.status}
										</td>
										<td>
											{o.case_override === "independent"
												? "獨立派工"
												: o.case_override === "normal"
													? "一般派工"
													: "未指定"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p>
						共 {rows.length} 筆{!rows.length ? "，目前沒有符合的派工單。" : ""}
					</p>
					{editable ? (
						<details className="old-expander">
							<summary>新增派工單</summary>
							<OrderForm project={id} />
						</details>
					) : (
						<p>此標案目前為唯讀。</p>
					)}
				</>
			)}
		</main>
	);
}
