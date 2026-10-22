import catalogs from "./legacy-catalog.json";
export function legacyProject(snapshot: any) {
	const {
		project: p,
		period: r,
		sites,
		targets,
		daily,
		balances,
		versions,
	} = snapshot;
	const catalog: any[] = JSON.parse(catalogs[p.kind as keyof typeof catalogs]);
	const lookup = new Map(catalog.map((i) => [i.code, i]));
	const check = (i: any) => {
		const c = lookup.get(i?.code);
		if (
			!c ||
			c.name !== i.name ||
			c.unit !== i.unit ||
			Number(c.price) !== Number(i.unit_price)
		)
			throw Error("契約工項與原版範本清單不同，請先核對契約版本。");
		return i.code;
	};
	const result: any = {
		kind: p.kind,
		roc_year: Number(r.period_start.slice(0, 4)) - 1911,
		month: Number(r.period_start.slice(5, 7)),
		project_name: p.name,
		owner: p.owner,
		contractor: p.contractor,
		supervisor: p.supervisor,
		location: p.location,
		contract_amount: Number(p.contract_amount || 0),
		sites: [],
		quantities: [],
		prior_cumulative: {},
		item_targets: {},
		item_notes: {},
		site_items: {},
		contract_revisions: [],
	};
	const siteMap = new Map<string, number>();
	for (const s of [...sites].sort(
		(a, b) => a.sort_order - b.sort_order || a.item_number - b.item_number,
	)) {
		siteMap.set(s.work_order_site_id, s.item_number);
		result.sites.push({
			site_id: s.item_number,
			name: s.name,
			work_dates: s.work_dates,
			note: s.note,
			uid: s.id,
			case_override: s.case_override || "",
		});
	}
	const itemMap = new Map<string, { sid: number; code: string }>();
	for (const t of targets) {
		if (t.removed) continue;
		const w = t.work_order_items;
		const sid = siteMap.get(w.work_order_site_id);
		if (sid === undefined) throw Error("工項未對應本月份路段。");
		const code = check(w.contract_items);
		itemMap.set(t.work_order_item_id, { sid, code });
		const key = `${sid}|${code}`;
		result.item_targets[key] = Number(t.target_quantity);
		result.item_notes[key] = t.note;
		(result.site_items[String(sid)] ??= []).push(code);
	}
	for (const d of daily) {
		const item = itemMap.get(d.work_order_item_id);
		if (!item || d.status === "void") continue;
		result.quantities.push({
			site_id: item.sid,
			item_code: item.code,
			day: Number(d.work_date.slice(8, 10)),
			quantity: Number(d.quantity),
		});
	}
	for (const b of balances) {
		const code = check(b.contract_items);
		if (Object.hasOwn(result.prior_cumulative, code))
			throw Error("前期累計存在多個契約版本，請先核對。");
		result.prior_cumulative[code] = Number(b.quantity);
	}
	for (const v of versions) {
		if (v.template_profile !== "legacy-20260920")
			throw Error("尚未支援此契約版本範本。");
		if (v.direct_cost_subtotal !== null)
			result.contract_revisions.push({
				label: v.label,
				amount: Number(v.direct_cost_subtotal),
				effective_date: v.effective_date || "",
			});
	}
	return result;
}
