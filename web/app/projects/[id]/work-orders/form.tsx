"use client";
import { useActionState, useState, useEffect } from "react";
import { saveOrder } from "./actions";
export type Order = {
	id: string;
	number: string;
	title: string;
	issued_on: string | null;
	due_on: string | null;
	status: string;
	case_override: string | null;
	revision: number;
};
export default function OrderForm({
	project,
	order,
}: {
	project: string;
	order?: Order;
}) {
	const [state, action, pending] = useActionState(saveOrder, {
		message: "",
		id: order?.id,
		revision: order?.revision,
	});
	const [draft, setDraft] = useState({
		number: order?.number || "",
		title: order?.title || "",
		issued_on: order?.issued_on || "",
		due_on: order?.due_on || "",
		status: order?.status || "draft",
		case_override: order?.case_override || "",
	});
	const [dirty, setDirty] = useState(false);
	useEffect(() => {
		if (state.ok) setDirty(false);
	}, [state]);
	useEffect(() => {
		const guard = (e: BeforeUnloadEvent) => {
			if (dirty) e.preventDefault();
		};
		window.addEventListener("beforeunload", guard);
		return () => window.removeEventListener("beforeunload", guard);
	}, [dirty]);
	const change = (key: string, value: string) => {
		setDraft((d) => ({ ...d, [key]: value }));
		setDirty(true);
	};
	return (
		<form action={action}>
			<input type="hidden" name="project" value={project} />
			<input type="hidden" name="id" value={state.id || ""} />
			<input type="hidden" name="revision" value={state.revision || 1} />
			<div className="old-grid two">
				{(["number", "title", "issued_on", "due_on"] as const).map((key, i) => (
					<label className="old-field" key={key}>
						{["派工單編號", "派工名稱", "派工日期", "預定完成日"][i]}
						<input
							name={key}
							type={i > 1 ? "date" : "text"}
							value={draft[key]}
							onChange={(e) => change(key, e.target.value)}
							readOnly={pending}
							required={i < 2}
							maxLength={i === 0 ? 80 : 500}
						/>
					</label>
				))}
				<label className="old-field">
					狀態
					<select
						name="status"
						value={draft.status}
						onChange={(e) => change("status", e.target.value)}
						disabled={pending}
					>
						<option value="draft">草稿</option>
						<option value="active">施作中</option>
						<option value="closed">已結案</option>
					</select>
				</label>
				<label className="old-field">
					案件類別
					<select
						name="case_override"
						value={draft.case_override}
						onChange={(e) => change("case_override", e.target.value)}
						disabled={pending}
					>
						<option value="">未指定</option>
						<option value="normal">一般派工</option>
						<option value="independent">獨立派工</option>
					</select>
				</label>
			</div>
			<button disabled={pending}>{pending ? "儲存中…" : "儲存派工單"}</button>
			<p role="status">
				{state.message}
				{dirty ? " 有尚未儲存的變更。" : ""}
			</p>
		</form>
	);
}
