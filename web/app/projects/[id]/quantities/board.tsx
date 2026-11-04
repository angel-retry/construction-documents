"use client";
import {
	useActionState,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { addItem } from "./actions";
import { ItemCombobox } from "./item-combobox";
import { workDatesToDays } from "../../../../lib/legacy-work-dates";
import { itemAmount, monthQuantity } from "../../../../lib/quantity-math";
import {
	QuantitySaveQueue,
	type QuantityDraft,
	type QuantityPatch,
} from "../../../../lib/quantity-save-queue";
const money = (n: number) =>
	n.toLocaleString("zh-TW", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
export default function QuantityBoard({
	sites,
	targets: initialTargets,
	daily,
	catalog,
	year,
	month,
	editable,
}: any) {
	const [amounts, setAmounts] = useState<Record<string, number>>({});
	const [saved, setSaved] = useState<Record<string, any>>({});
	const status = useRef<Record<string, boolean>>({});
	const onAmount = useCallback(
		(id: string, value: number) =>
			setAmounts((a) => (a[id] === value ? a : { ...a, [id]: value })),
		[],
	);
	const onStatus = useCallback((id: string, unsafe: boolean) => {
		status.current[id] = unsafe;
	}, []);
	const onSaved = useCallback(
		(id: string, draft: QuantityDraft, revision: number, removed: boolean) => {
			setSaved((s) => ({
				...s,
				[id]: {
					target_quantity: draft.target,
					note: draft.note,
					revision,
					removed,
				},
			}));
			if (removed)
				setAmounts((a) => {
					const next = { ...a };
					delete next[id];
					return next;
				});
		},
		[],
	);
	const targets = initialTargets
		.map((t: any) =>
			saved[t.id]?.revision >= t.revision ? { ...t, ...saved[t.id] } : t,
		)
		.filter((t: any) => !t.removed);
	const total = targets.reduce(
		(sum: number, t: any) =>
			sum +
			(amounts[t.id] ??
				itemAmount(
					Number(t.target_quantity),
					Number(t.work_order_items.contract_items.unit_price),
				)),
		0,
	);
	useEffect(() => {
		const unsafe = () => Object.values(status.current).some(Boolean);
		const unload = (e: BeforeUnloadEvent) => {
			if (unsafe()) e.preventDefault();
		};
		const click = (e: MouseEvent) => {
			const a = (e.target as Element).closest?.("a[href]");
			if (
				a &&
				unsafe() &&
				!window.confirm("仍有未儲存或儲存中的工項，確定離開？")
			) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		const submit = (e: SubmitEvent) => {
			if (
				(e.target as HTMLFormElement).querySelector("[name=year]") &&
				unsafe() &&
				!window.confirm("仍有未儲存或儲存中的工項，確定切換月份？")
			) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener("beforeunload", unload);
		document.addEventListener("click", click, true);
		document.addEventListener("submit", submit, true);
		return () => {
			window.removeEventListener("beforeunload", unload);
			document.removeEventListener("click", click, true);
			document.removeEventListener("submit", submit, true);
		};
	}, []);
	return (
		<div className="quantity-board">
			<div className="quantity-headings">
				<h2>帳務總覽</h2>
				<h2>每日完成數量</h2>
			</div>
			<p className="old-caption">
				左側填本月數量與備註，備註框可拖曳右下角調整大小；右側分配每日完成數量。離開輸入框或按 Enter 鍵會在背景自動儲存，可連續流暢填報。顯示日期只篩選畫面，隱藏日期仍計入合計。
			</p>
			{!editable && <p>此標案或月份為唯讀。</p>}
			{sites.map((site: any) => (
				<SiteBlock
					key={site.id}
					{...{
						site,
						targets,
						daily,
						catalog,
						year,
						month,
						editable,
						onAmount,
						onSaved,
						onStatus,
					}}
				/>
			))}
			<h3>本月合計（含畫面試算）：{money(total)} 元</h3>
		</div>
	);
}
function SiteBlock({
	site,
	targets,
	daily,
	catalog,
	year,
	month,
	editable,
	onAmount,
	onSaved,
	onStatus,
}: any) {
	const [filter, setFilter] = useState<number[]>([]);
	const [code, setCode] = useState("");
	const [resetKey, setResetKey] = useState(0);
	const [addState, addAction, adding] = useActionState(addItem, {
		message: "",
	});
	useEffect(() => {
		if (addState.ok) {
			setCode("");
			setResetKey((k) => k + 1);
		}
	}, [addState]);
	const count = new Date(Date.UTC(year + 1911, month, 0)).getUTCDate();
	const all = Array.from({ length: count }, (_, i) => i + 1);
	const workDays = workDatesToDays(site.work_dates, year + 1911, month);
	// 若有設定施工日則僅提供施工日勾選，未設定時退回顯示整月
	const selectableDays = workDays && workDays.length > 0 ? workDays : all;
	const isCustom = filter.length > 0;
	const currentSelection = isCustom ? filter : selectableDays;
	const visible = filter.length ? filter : selectableDays;
	const isAllSelected =
		selectableDays.length === currentSelection.length &&
		selectableDays.every((d) => currentSelection.includes(d));
	const filterSummary = isCustom
		? `自訂篩選中（已選 ${filter.length}/${selectableDays.length} 天，點擊可調整）`
		: workDays && workDays.length > 0
			? `依施工路段連動（共 ${workDays.length} 天）`
			: "未選擇時依原設定顯示，可複選日期";
	const rows = targets
		.filter(
			(t: any) =>
				t.work_order_items.work_order_site_id === site.work_order_site_id,
		)
		.sort(
			(a: any, b: any) =>
				a.work_order_items.contract_items.seq -
				b.work_order_items.contract_items.seq,
		);
	const used = new Set(
		rows.map((t: any) => t.work_order_items.contract_items.code),
	);
	const available = catalog.filter((c: any) => !used.has(c.code));
	const subtotal = rows.reduce(
		(sum: number, t: any) =>
			sum +
			itemAmount(
				Number(t.target_quantity),
				Number(t.work_order_items.contract_items.unit_price),
			),
		0,
	);
	return (
		<details open className="quantity-site">
			<summary>
				{site.item_number}　{site.name}　{site.work_dates}
			</summary>
			<div className="quantity-site-body">
				<div className="quantity-pair quantity-tools">
					<form action={addAction}>
						<input type="hidden" name="site" value={site.id} />
						<fieldset
							disabled={!editable || adding}
							style={{ border: 0, padding: 0 }}
						>
							<div className="quantity-add">
								<label className="old-field">
									加入工項（可搜尋）
									<ItemCombobox
										availableItems={available}
										name="code"
										disabled={!editable || adding}
										resetKey={resetKey}
										onSelectChange={setCode}
									/>
								</label>
								<button className="old-primary" disabled={!code || adding}>
									{adding ? "加入中…" : "加入"}
								</button>
							</div>
						</fieldset>
						<p role="status">{addState.message}</p>
					</form>
					<div>
						<span className="quantity-filter-label">顯示日期</span>
						<details className="day-filter">
							<summary>{filterSummary}</summary>
							<div className="quantity-days">
								{selectableDays.map((day) => (
									<label key={day}>
										<input
											type="checkbox"
											checked={currentSelection.includes(day)}
											onChange={(e) => {
												const next = e.target.checked
													? [...currentSelection, day].sort((a, b) => a - b)
													: currentSelection.filter((d) => d !== day);
												setFilter(next);
											}}
										/>
										{month}/{day}
									</label>
								))}
							</div>
							<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
								<button
									type="button"
									onClick={() => setFilter([])}
									disabled={!isCustom}
								>
									依施工日期顯示
								</button>
								{workDays && workDays.length > 0 && (
									<button
										type="button"
										onClick={() => setFilter([...selectableDays])}
										disabled={isAllSelected}
									>
										選取所有施工日
									</button>
								)}
							</div>
						</details>
					</div>
				</div>
				<div className="quantity-pair quantity-column-head">
					<div className="quantity-account">
						<span />
						<span>工項代碼</span>
						<span>工作項目規格</span>
						<span className="text-right">本月數量</span>
						<span className="text-right">單價</span>
						<span className="text-right">本月金額</span>
						<span style={{ paddingLeft: "4px" }}>備註 / 尺寸算式</span>
					</div>
					<div className="quantity-daily-head">
						<span>每日完成數量（橫向捲動填報）</span>
						<span className="quantity-daily-hint">可橫向捲動查看日期 ➔</span>
					</div>
				</div>
				{!rows.length ? (
					<div className="quantity-empty-state">
						<p>目前尚未加入任何工項，請從上方搜尋並加入契約工項。</p>
					</div>
				) : (
					<div className="quantity-rows-container">
						{rows.map((t: any) => (
							<ItemRow
								key={`${t.id}:${site.revision}`}
								target={t}
								site={site}
								daily={daily.filter(
									(d: any) => d.work_order_item_id === t.work_order_item_id,
								)}
								{...{ year, month, visible, editable, onAmount, onSaved, onStatus }}
								singleDay={workDays?.length === 1 ? workDays[0] : null}
							/>
						))}
					</div>
				)}
				<p>已儲存小計：{money(subtotal)} 元</p>
			</div>
		</details>
	);
}
function ItemRow({
	target,
	site,
	daily,
	year,
	month,
	visible,
	editable,
	singleDay,
	onAmount,
	onSaved,
	onStatus,
}: any) {
	const item = target.work_order_items.contract_items;
	const [, render] = useState(0);
	const form = useRef<HTMLFormElement>(null);
	const callbacks = useRef({ onSaved, onStatus });
	callbacks.current = { onSaved, onStatus };
	const [queue] = useState(
		() =>
			new QuantitySaveQueue(
				{
					target: String(target.target_quantity),
					note: target.note,
					days: Object.fromEntries(
						daily.map((d: any) => [d.work_date, String(d.quantity)]),
					),
				},
				target.revision,
				async (patch: QuantityPatch, revision: number, remove: boolean) => {
					const data = new FormData();
					data.set("site", site.id);
					data.set("id", target.id);
					data.set("revision", String(revision));
					data.set("site_revision", String(site.revision));
					if (patch.target !== undefined) data.set("target", patch.target);
					if (patch.note !== undefined) data.set("note", patch.note);
					for (const [day, qty] of Object.entries(patch.days))
						data.set(`day:${day}`, qty);
					if (remove) data.set("operation", "remove");
					const response = await fetch(
						`/projects/${site.project_id}/quantities/save`,
						{ method: "POST", body: data },
					);
					if (!response.ok) throw Error("save failed");
					return await response.json();
				},
				() => {
					render((n) => n + 1);
					callbacks.current.onStatus(
						target.id,
						queue.dirty || queue.busy || queue.failed,
					);
				},
				(draft, revision, removed) =>
					callbacks.current.onSaved(target.id, draft, revision, removed),
			),
	);
	const { target: qty, note, days: values } = queue.draft;
	const edit = (patch: Partial<QuantityDraft>) =>
		queue.edit({ ...queue.draft, ...patch });
	const date = (day: number) =>
		`${year + 1911}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	const amount = itemAmount(Number(qty) || 0, Number(item.unit_price));
	const allocated = singleDay ? Number(qty) || 0 : monthQuantity(values);
	const remaining = (Number(qty) || 0) - allocated;
	useEffect(() => {
		onAmount(target.id, amount);
	}, [amount, target.id, onAmount]);
	useEffect(
		() => () => callbacks.current.onStatus(target.id, false),
		[target.id],
	);
	const syncNeeded =
		singleDay &&
		!queue.hasSaved &&
		(Number(values[date(singleDay)] || 0) !== Number(qty) ||
			Object.entries(values).some(
				([d, q]) => d !== date(singleDay) && Number(q) !== 0,
			));
	return (
		<form
			ref={form}
			method="post"
			className="quantity-item"
			onSubmit={(e) => {
				e.preventDefault();
				void queue.submit(false, !!syncNeeded);
			}}
			onBlur={(e) => {
				if (
					(queue.dirty || queue.busy) &&
					!e.currentTarget.contains(e.relatedTarget as Node) &&
					form.current?.checkValidity()
				)
					void queue.submit();
			}}
		>
			<fieldset
				disabled={!editable || queue.removing}
				style={{ border: 0, padding: 0 }}
			>
				<div className="quantity-pair">
					<div className="quantity-account">
						<button
							type="button"
							disabled={queue.busy}
							className="quantity-remove-btn"
							aria-label={`移除工項 ${item.code}（可恢復）`}
							title="移除工項（可恢復）"
							onClick={() => void queue.submit(true)}
						>
							×
						</button>
						<span className="item-code font-mono">{item.code}</span>
						<div className="item-name-group">
							<div className="item-title" title={item.name}>{item.name}</div>
							<div className="item-unit">單位：{item.unit}</div>
						</div>
						<label>
							<span className="quantity-mobile-label">本月數量</span>
							<input
								aria-label={`${item.code} 本月數量`}
								type="number"
								name="target"
								min="0"
								max="999999999999.9999"
								step="0.0001"
								value={qty}
								className="font-mono text-right"
								onChange={(e) => edit({ target: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.currentTarget.blur();
									}
								}}
							/>
						</label>
						<span className="item-price font-mono">
							<span className="quantity-mobile-label">單價</span>
							{money(Number(item.unit_price))}
						</span>
						<span className="item-amount font-mono">
							<span className="quantity-mobile-label">本月金額</span>
							{money(amount)}
						</span>
						<label>
							<span className="quantity-mobile-label">備註</span>
							<textarea
								className="quantity-note"
								aria-label={`${item.code} 備註`}
								name="note"
								rows={2}
								title="尺寸算式..."
								placeholder="尺寸算式..."
								maxLength={2000}
								value={note}
								onChange={(e) => edit({ note: e.target.value })}
							/>
						</label>
					</div>
					<div>
						<div className="old-table-scroll">
							<table>
								<thead>
									<tr>
										{visible.map((d: number) => (
											<th key={d}>{d}日</th>
										))}
									</tr>
								</thead>
								<tbody>
									<tr>
										{visible.map((d: number) => (
											<td key={d}>
												<input
													aria-label={`${item.code} ${d}日數量`}
													className="quantity-day-input"
													type="number"
													min="0"
													max="999999999999.9999"
													step="0.0001"
													disabled={!!singleDay}
													value={
														singleDay
															? d === singleDay
																? qty
																: "0"
															: values[date(d)] || "0"
													}
													onChange={(e) =>
														edit({
															days: { ...values, [date(d)]: e.target.value },
														})
													}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.currentTarget.blur();
														}
													}}
												/>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
						<div className="quantity-allocated-summary">
							<span>每日合計：<strong className="font-mono">{allocated.toFixed(4)}</strong></span>
							<span className={remaining < 0 ? "quantity-status-over" : remaining === 0 ? "quantity-status-exact" : "quantity-status-rem"}>
								{remaining < 0 ? `超出 ${(-remaining).toFixed(4)}` : remaining === 0 ? "✓ 已完全分配" : `尚可分配 ${remaining.toFixed(4)}`}
							</span>
						</div>
					</div>
				</div>
			</fieldset>
			{(queue.busy || queue.failed || queue.dirty || queue.message) && (
				<div
					role="status"
					className={`quantity-status-bar ${queue.failed ? "is-error" : ""}`}
				>
					<span>
						{queue.busy
							? "儲存中…"
							: queue.failed
								? `儲存失敗：${queue.message}`
								: queue.message}
						{queue.dirty ? "（有未儲存的變更）" : ""}
					</span>
					{queue.failed && (
						<button
							type="button"
							className="quantity-retry-btn"
							onClick={() => void queue.submit()}
						>
							點此重試儲存
						</button>
					)}
				</div>
			)}
		</form>
	);
}
