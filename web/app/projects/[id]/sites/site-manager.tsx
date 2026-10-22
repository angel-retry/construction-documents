"use client";
import { useCallback, useState, useTransition } from "react";
import SiteEditor, { type MonthlySite } from "./editor";
import { reorderSites } from "./actions";
export default function SiteManager({
	project,
	year,
	month,
	rows,
}: {
	project: string;
	year: number;
	month: number;
	rows: MonthlySite[];
}) {
	const [generation, setGeneration] = useState(0);
	const [busy, setBusy] = useState<Record<string, boolean>>({});
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState("");
	const created = useCallback(() => setGeneration((n) => n + 1), []);
	const status = useCallback(
		(key: string, value: boolean) =>
			setBusy((old) => (old[key] === value ? old : { ...old, [key]: value })),
		[],
	);
	const blocked = pending || Object.values(busy).some(Boolean);
	const move = (index: number, direction: number) => {
		const original = rows.map((r) => r.id),
			ordered = [...original];
		[ordered[index], ordered[index + direction]] = [
			ordered[index + direction],
			ordered[index],
		];
		startTransition(async () => {
			const result = await reorderSites(
				project,
				year,
				month,
				original,
				ordered,
			);
			setMessage(result.message);
		});
	};
	return (
		<section className="compact-site-list" aria-label="施工路段清單">
			{rows.map((row, index) => (
				<div className="compact-site-line" key={row.id}>
					<div className="site-order">
						<button
							type="button"
							aria-label={`上移路段 ${row.item_number}`}
							disabled={blocked || index === 0}
							onClick={() => move(index, -1)}
						>
							↑
						</button>
						<button
							type="button"
							aria-label={`下移路段 ${row.item_number}`}
							disabled={blocked || index === rows.length - 1}
							onClick={() => move(index, 1)}
						>
							↓
						</button>
					</div>
					<SiteEditor
						project={project}
						year={year}
						month={month}
						row={row}
						onBusy={status}
					/>
				</div>
			))}
			<div className="compact-site-line">
				<span className="site-order" aria-hidden="true">
					＋
				</span>
				<SiteEditor
					key={`new-${generation}`}
					project={project}
					year={year}
					month={month}
					defaultNumber={Math.min(
						2147483647,
						Math.max(0, ...rows.map((r) => r.item_number)) + 1,
					)}
					onCreated={created}
					onBusy={status}
				/>
			</div>
			{(pending || message) && (
				<p role="status">{pending ? "正在儲存順序…" : message}</p>
			)}
		</section>
	);
}
