export type Site = {
	legacy_site_id: number;
	name: string;
	work_dates_raw: string;
	note: string;
	case_override: string;
	work_days: number[];
	amount: number;
};
export type Record = {
	source_json_key: string;
	site_id: number;
	site_name: string;
	item_code: string;
	work_date: string;
	quantity_exact: string;
	current_export_includes: boolean;
	item_name: string;
	unit: string;
};
export type Total = {
	site_id: string;
	item_code: string;
	item_name: string;
	unit: string;
	target_quantity_exact: string;
	raw_daily_sum_exact: string;
	target_minus_raw: string;
	amount_display: string;
	target_display: string;
	price_display: string;
	note: string;
};
export type Snapshot = {
	sites: Site[];
	daily: Record[];
	totals: Total[];
	sourceHash: string;
	settings: {
		roc_year: number;
		month: number;
		project_name: string;
		owner: string;
		location: string;
		contractor: string;
		supervisor: string;
		contract_amount: number;
		contract_revisions: {
			label: string;
			amount: number;
			effective_date: string;
		}[];
	};
	prior: {
		code: string;
		name: string;
		unit: string;
		quantity: string;
		price: string;
		amount: string;
	}[];
	amounts: string[];
	downloads: { key: string; filename: string; sha256: string }[];
};
