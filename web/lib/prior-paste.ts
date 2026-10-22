export type PriorItem = { code: string; name: string; unit: string };
export type PriorRow = {
	line: number;
	code: string;
	name: string;
	unit: string;
	raw: string;
	old: number | null;
	value: number | null;
	status: string;
};
// Excel TSV quoting, including quoted line breaks and escaped quotes. Keep empty rows.
function column(text: string): string[] {
	if (!text) return [];
	const rows: string[] = [];
	let value = "",
		quoted = false,
		closed = false;
	text = text.replace(/\r\n?/g, "\n");
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					value += '"';
					i++;
				} else {
					quoted = false;
					closed = true;
				}
			} else value += ch;
			continue;
		}
		if (ch === "\t")
			throw Error("每個貼上框只能放一欄，請分別複製工項代碼與數量。");
		if (ch === "\n") {
			rows.push(value);
			value = "";
			closed = false;
			continue;
		}
		if (closed)
			throw Error("貼上內容格式無法辨識，請重新複製 Excel 單欄儲存格。");
		if (ch === '"' && !value) {
			quoted = true;
			continue;
		}
		value += ch;
	}
	if (quoted)
		throw Error("貼上內容格式無法辨識，請重新複製 Excel 單欄儲存格。");
	if (!text.endsWith("\n") || closed) rows.push(value);
	return rows;
}
const norm = (s: string) => s.normalize("NFKC").trim();
export function parsePriorPaste(
	codeText: string,
	quantityText: string,
	items: PriorItem[],
	existing: Record<string, number> = {},
) {
	const errors: string[] = [],
		rows: PriorRow[] = [],
		values: Record<string, number> = {};
	if (codeText.length > 100000 || quantityText.length > 100000)
		return { errors: ["貼上內容過長，請分批處理。"], rows, values };
	let codes: string[], quantities: string[];
	try {
		codes = column(codeText);
		quantities = column(quantityText);
	} catch (e) {
		return { errors: [(e as Error).message], rows, values };
	}
	if (codes.length !== quantities.length)
		errors.push(
			`兩欄筆數不同：工項 ${codes.length} 列、數量 ${quantities.length} 列。請複製相同起訖列。`,
		);
	const lookup = new Map(items.map((item) => [norm(item.code), item]));
	for (let i = 0; i < Math.max(codes.length, quantities.length); i++) {
		const code = codes[i] ?? "",
			raw = quantities[i] ?? "",
			item = lookup.get(norm(code));
		const row: PriorRow = {
			line: i + 1,
			code,
			name: item?.name || "",
			unit: item?.unit || "",
			raw,
			old: item ? (existing[item.code] ?? 0) : null,
			value: null,
			status: "略過，保留原值",
		};
		rows.push(row);
		const fail = (msg: string) => {
			errors.push(`第 ${i + 1} 列：${msg}`);
			row.status = "需修正";
		};
		if (i >= codes.length || i >= quantities.length) {
			row.status = "缺少對應列";
			continue;
		}
		if (
			["項次", "工項", "工項代碼"].includes(norm(code)) &&
			["前期累計", "前期累計數量", "數量"].includes(norm(raw))
		) {
			row.status = "標題列";
			continue;
		}
		if (["", "-", "–", "—"].includes(norm(raw))) continue;
		if (!item) {
			fail(`找不到工項代碼「${code}」。`);
			continue;
		}
		if (Object.hasOwn(values, item.code)) {
			fail(`工項「${item.code}」重複，請保留一筆。`);
			continue;
		}
		const normalized = norm(raw).replace(/,/g, "");
		const n = Number(normalized);
		// Database numeric(20,6); do not silently round a source value.
		if (
			!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized) ||
			!Number.isFinite(n) ||
			n < 0 ||
			n >= 1e12 ||
			Number(n.toFixed(6)) !== n
		) {
			fail("數量須為非負數、小於一兆且最多六位小數。");
			continue;
		}
		values[item.code] = n;
		row.value = n;
		row.status = n === row.old ? "不變" : n === 0 ? "歸零" : "更新";
	}
	return { errors, rows, values };
}
