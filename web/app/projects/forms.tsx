"use client";
import { useActionState, useState, useEffect } from "react";
import { createProject, saveSettings } from "./actions";
import type { ProjectSettings } from "../../lib/project-validation";
export function NewProjectForm({
	organizations,
}: {
	organizations: { id: string; name: string }[];
}) {
	const [state, action, pending] = useActionState(createProject, {
		message: "",
	});
	const [draft, setDraft] = useState({
		org_id: organizations[0]?.id || "",
		kind: "park",
		code: "",
		name: "",
	});
	return (
		<form action={action}>
			<div className="old-grid two">
				<label className="old-field">
					公司
					<select
						name="org_id"
						required
						value={draft.org_id}
						onChange={(e) => setDraft({ ...draft, org_id: e.target.value })}
					>
						{organizations.map((o) => (
							<option key={o.id} value={o.id}>
								{o.name}
							</option>
						))}
					</select>
				</label>
				<label className="old-field">
					工程類型
					<select
						name="kind"
						value={draft.kind}
						onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
					>
						<option value="park">公園</option>
						<option value="rainwater">雨水</option>
					</select>
				</label>
			</div>
			<label className="old-field">
				標案編號
				<input
					required
					name="code"
					maxLength={80}
					value={draft.code}
					readOnly={pending}
					onChange={(e) => setDraft({ ...draft, code: e.target.value })}
				/>
			</label>
			<label className="old-field">
				工程名稱
				<input
					required
					name="name"
					maxLength={500}
					value={draft.name}
					readOnly={pending}
					onChange={(e) => setDraft({ ...draft, name: e.target.value })}
				/>
			</label>
			<button disabled={pending}>{pending ? "建立中…" : "新增標案"}</button>
			<p role="status">{pending ? "建立中…" : state.message}</p>
		</form>
	);
}
export function SettingsForm({
	project,
	canEdit,
}: {
	project: ProjectSettings;
	canEdit: boolean;
}) {
	const [state, action, pending] = useActionState(saveSettings, {
		message: "",
		revision: project.revision,
	});
	const [dirty, setDirty] = useState(false);
	const [draft, setDraft] = useState(project);
	useEffect(() => {
		if (state.ok) setDirty(false);
	}, [state]);
	useEffect(() => {
		const protect = (event: BeforeUnloadEvent) => {
			if (dirty) {
				event.preventDefault();
			}
		};
		window.addEventListener("beforeunload", protect);
		return () => window.removeEventListener("beforeunload", protect);
	}, [dirty]);
	const field = (label: string, key: keyof ProjectSettings) => (
		<label className="old-field">
			{label}
			<input
				name={key}
				value={draft[key] ?? ""}
				onChange={(e) => {
					setDraft({ ...draft, [key]: e.target.value });
					setDirty(true);
				}}
				readOnly={!canEdit || pending}
				maxLength={key === "contract_amount" ? 21 : 500}
				required={key === "name"}
				inputMode={key === "contract_amount" ? "decimal" : undefined}
			/>
		</label>
	);
	return (
		<form action={action}>
			<input type="hidden" name="id" value={project.id} />
			<input
				type="hidden"
				name="revision"
				value={state.revision || project.revision}
			/>
			<div className="old-grid two">
				<label className="old-field">
					標案編號
					<input readOnly value={project.code} />
				</label>
				{field("契約金額", "contract_amount")}
			</div>
			{field("工程名稱", "name")}
			<div className="old-grid two">
				{field("主辦單位", "owner")}
				{field("施工地點", "location")}
			</div>
			<div className="old-grid two">
				{field("承攬廠商", "contractor")}
				{field("監造單位", "supervisor")}
			</div>
			<p className="old-caption">
				民國年與月份將由報表期間管理，本頁保存標案共用資料。契約金額未確認時可留空。
			</p>
			{canEdit ? (
				<button disabled={pending}>
					{pending ? "儲存中…" : "儲存基本設定"}
				</button>
			) : (
				<p className="old-info">此標案目前為唯讀。</p>
			)}
			<p role="status">
				{pending ? "儲存中…" : state.message}
				{dirty && !pending ? " 有尚未儲存的變更。" : ""}
			</p>
		</form>
	);
}
