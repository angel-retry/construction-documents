"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveSite } from "./actions";
export type MonthlySite = {
	id: string;
	item_number: number;
	name: string;
	work_dates: string;
	note: string;
	case_override: string | null;
	revision: number;
};
export default function SiteEditor({
	project,
	year,
	month,
	row,
	onCreated,
	onBusy,
	defaultNumber = 1,
}: {
	project: string;
	year: number;
	month: number;
	row?: MonthlySite;
	onCreated?: (id: string) => void;
	onBusy?: (key: string, busy: boolean) => void;
	defaultNumber?: number;
}) {
	const [state, action, pending] = useActionState(saveSite, {
		message: "",
		revision: row?.revision || 1,
		id: row?.id,
	});
	const [draft, setDraft] = useState({
		item_number: String(row?.item_number || defaultNumber),
		name: row?.name || "",
		work_dates: row?.work_dates || "",
		note: row?.note || "",
		case_override: row?.case_override || "",
	});
	const [dirty, setDirty] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (state.ok) {
			setDirty(false);
			if (!row && state.id) onCreated?.(state.id);
		}
	}, [state, onCreated]);
	useEffect(() => {
		const guard = (e: BeforeUnloadEvent) => {
			if (dirty || pending) e.preventDefault();
		};
		window.addEventListener("beforeunload", guard);
		return () => window.removeEventListener("beforeunload", guard);
	}, [dirty, pending]);
	useEffect(() => {
		const key = row?.id || "new";
		onBusy?.(key, dirty || pending);
		return () => onBusy?.(key, false);
	}, [dirty, pending, row?.id, onBusy]);
	const change = (key: string, value: string) => {
		setDraft((d) => ({ ...d, [key]: value }));
		setDirty(true);
	};
	const submit = () => {
		if (row && dirty && !pending) form.current?.requestSubmit();
	};
	return (
		<form
			className="compact-site-editor"
			aria-label={row ? `路段 ${row.item_number}` : "新增路段"}
			ref={form}
			action={action}
		>
			<input type="hidden" name="project" value={project} />
			<input type="hidden" name="year" value={year} />
			<input type="hidden" name="month" value={month} />
			<input type="hidden" name="id" value={row ? state.id || row.id : ""} />
			<input type="hidden" name="revision" value={state.revision} />
			<fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}>
				<div className="legacy-site-row">
					<label className="old-field">
						項次
						<input
							required
							name="item_number"
							type="number"
							min="1"
							max="2147483647"
							step="1"
							value={draft.item_number}
							onChange={(e) => change("item_number", e.target.value)}
							onBlur={submit}
						/>
					</label>
					<label className="old-field">
						路段名稱
						<input
							required
							name="name"
							maxLength={500}
							value={draft.name}
							onChange={(e) => change("name", e.target.value)}
							onBlur={submit}
						/>
					</label>
					<label className="old-field">
						施工日期
						<input
							name="work_dates"
							maxLength={2000}
							placeholder="115/6/1、115/6/1-115/6/2、115/7/2、115/7/10"
							value={draft.work_dates}
							onChange={(e) => change("work_dates", e.target.value)}
							onBlur={submit}
						/>
					</label>
					<label className="old-field">
						備註
						<input
							name="note"
							maxLength={2000}
							value={draft.note}
							onChange={(e) => change("note", e.target.value)}
							onBlur={submit}
						/>
					</label>
					<label className="old-field">
						案件類別
						<select
							name="case_override"
							value={draft.case_override}
							onChange={(e) => change("case_override", e.target.value)}
							onBlur={submit}
						>
							<option value="">自動判斷（依金額）</option>
							<option value="normal">一般派工</option>
							<option value="independent">獨立派工（≥150,000）</option>
						</select>
					</label>
				</div>
				<button type="submit" className="old-primary">
					{row ? "儲存" : "新增"}
				</button>
			</fieldset>
			{(pending || state.message || dirty) && (
				<p role="status">
					{pending ? "儲存中…" : state.message}
					{dirty && !pending ? " 有尚未儲存的變更。" : ""}
				</p>
			)}
		</form>
	);
}
