"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { parsePriorPaste, type PriorItem } from "../../../../lib/prior-paste";
import { savePrior, type PriorState } from "./actions";
export default function PriorEditor({
	period,
	revision,
	items,
	existing,
	editable,
}: {
	period: string;
	revision: number;
	items: PriorItem[];
	existing: Record<string, number>;
	editable: boolean;
}) {
	const [codes, setCodes] = useState(""),
		[quantities, setQuantities] = useState("");
	const [selected, setSelected] = useState(""),
		[single, setSingle] = useState("");
	const [state, action, pending] = useActionState<PriorState, FormData>(
		savePrior,
		{ message: "" },
	);
	const result = useMemo(
		() => parsePriorPaste(codes, quantities, items, existing),
		[codes, quantities, items, existing],
	);
	// FormData may use CRLF while a controlled textarea uses LF.
	const normalizeLines = (value: string | undefined) =>
		(value ?? "").replace(/\r\n?/g, "\n");
	const dirty =
		!!(codes.trim() || quantities.trim()) &&
		!(
			state.ok &&
			normalizeLines(state.codes) === normalizeLines(codes) &&
			normalizeLines(state.quantities) === normalizeLines(quantities)
		);
	useEffect(() => {
		try {
			sessionStorage.setItem(`prior-dirty:${period}`, String(dirty));
		} catch {}
	}, [dirty, period]);
	useEffect(() => {
		const guard = (event: BeforeUnloadEvent) => {
			if (dirty || pending) event.preventDefault();
		};
		const linkGuard = (event: MouseEvent) => {
			const a = (event.target as Element).closest?.("a[href]");
			if (
				a &&
				(dirty || pending) &&
				!window.confirm("前期貼上內容尚未儲存，確定離開？")
			)
				event.preventDefault();
		};
		const formGuard = (event: SubmitEvent) => {
			if (
				!(event.target as HTMLFormElement).querySelector("[name=codes]") &&
				(dirty || pending) &&
				!window.confirm("前期貼上內容尚未儲存，確定切換月份？")
			)
				event.preventDefault();
		};
		window.addEventListener("beforeunload", guard);
		document.addEventListener("click", linkGuard, true);
		document.addEventListener("submit", formGuard, true);
		return () => {
			window.removeEventListener("beforeunload", guard);
			document.removeEventListener("click", linkGuard, true);
			document.removeEventListener("submit", formGuard, true);
		};
	}, [dirty, pending]);
	return (
		<section className="prior-editor">
			<p>
				前期累計依本月份保存，不分施工路段；數量空白或「－」保留原值，明確填 0
				才歸零。
			</p>
			{!editable && (
				<p role="status">
					目前可貼上預覽，但不能儲存；月份已關閉、沒有編輯權限，或雲端寫入尚未啟用。
				</p>
			)}
			<form action={action}>
				<input type="hidden" name="period" value={period} />
				<input
					type="hidden"
					name="revision"
					value={state.revision ?? revision}
				/>
				<fieldset disabled={pending} style={{ border: 0, padding: 0 }}>
					<h3>從 Excel 批次貼上</h3>
					<p className="old-caption">
						分別複製相同起訖列，保留中間空白列。貼上後先逐列核對，再按套用並儲存。
					</p>
					<div className="old-grid two">
						<label className="old-field">
							① 貼上工項代碼（項次）
							<textarea
								name="codes"
								rows={7}
								value={codes}
								onChange={(e) => setCodes(e.target.value)}
								maxLength={100000}
							/>
						</label>
						<label className="old-field">
							② 貼上上個月的累計完成數量
							<textarea
								name="quantities"
								rows={7}
								value={quantities}
								onChange={(e) => setQuantities(e.target.value)}
								maxLength={100000}
							/>
						</label>
					</div>
					{result.errors.map((e, i) => (
						<p role="alert" key={i}>
							{e}
						</p>
					))}
					{!!result.rows.length && (
						<>
							<h3>逐列核對（包含空白列）</h3>
							<p>
								共 {result.rows.length} 列；可套用{" "}
								{Object.keys(result.values).length} 筆。
							</p>
							<div style={{ overflowX: "auto" }}>
								<table>
									<thead>
										<tr>
											{[
												"貼上列序",
												"工項代碼",
												"工項名稱",
												"單位",
												"原數量",
												"貼上原文",
												"將存入數量",
												"差額",
												"處理方式",
											].map((h) => (
												<th key={h}>{h}</th>
											))}
										</tr>
									</thead>
									<tbody>
										{result.rows.map((r) => (
											<tr key={r.line}>
												<td>{r.line}</td>
												<td>{r.code}</td>
												<td>{r.name}</td>
												<td>{r.unit}</td>
												<td>{r.old ?? "—"}</td>
												<td>{r.raw}</td>
												<td>{r.value ?? "—"}</td>
												<td>
													{r.value !== null && r.old !== null
														? Number((r.value - r.old).toFixed(6))
														: "—"}
												</td>
												<td>{r.status}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="old-caption">
								請核對首筆、末筆及空白列前後的工項。兩欄筆數相同仍可能整段錯位。
							</p>
						</>
					)}
					<button
						disabled={
							!editable ||
							pending ||
							!!result.errors.length ||
							!Object.keys(result.values).length ||
							!dirty
						}
					>
						{pending ? "儲存中…" : "套用並儲存"}
					</button>
				</fieldset>
				<p role="status">{state.message}</p>
				{dirty && <p className="old-caption">貼上內容尚未儲存。</p>}
			</form>
			<hr />
			<fieldset disabled={pending} style={{ border: 0, padding: 0 }}>
				<h3>新增／修改單筆前期累計</h3>
				<label className="old-field">
					工項
					<select
						value={selected}
						onChange={(e) => setSelected(e.target.value)}
					>
						<option value="">請選擇工項</option>
						{items.map((i) => (
							<option key={i.code} value={i.code}>
								{i.code}｜{i.name}（{i.unit}）
							</option>
						))}
					</select>
				</label>
				<label className="old-field">
					前期累計數量
					<input
						type="number"
						min="0"
						step="0.000001"
						value={single}
						onChange={(e) => setSingle(e.target.value)}
					/>
				</label>
				<button
					type="button"
					disabled={!selected || !single || dirty}
					onClick={() => {
						setCodes(selected);
						setQuantities(single);
					}}
				>
					帶入上方預覽
				</button>
			</fieldset>
			<h3>已儲存前期累計</h3>
			{!Object.keys(existing).length ? (
				<p>本月份尚無前期累計資料。</p>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table>
						<thead>
							<tr>
								<th>工項</th>
								<th>名稱</th>
								<th>前期累計數量</th>
							</tr>
						</thead>
						<tbody>
							{items
								.filter((i) => Object.hasOwn(existing, i.code))
								.map((i) => (
									<tr key={i.code}>
										<td>{i.code}</td>
										<td>{i.name}</td>
										<td>{existing[i.code]}</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			)}
			<p className="old-caption">
				前期進度百分比不以契約總價代替。匯出施工日誌沿用原範本的直接工程費設定。
			</p>
		</section>
	);
}
