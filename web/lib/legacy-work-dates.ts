// Port of the baseline app/models.py date rules. Does not mutate quantities.
export const WORK_DATES_HINT = "115/6/1、115/6/1-115/6/2 或 115/7/2、115/7/10";
const pattern =
	/^(\d{2,3}\/\d{1,2}\/\d{1,2})(?:[-~](\d{2,3}\/\d{1,2}\/\d{1,2}))?$/;
function rocDate(text: string): number | null {
	const [roc, month, day] = text.split("/").map(Number);
	const year = roc + 1911;
	const value = Date.UTC(year, month - 1, day);
	const date = new Date(value);
	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
		? value
		: null;
}
function ranges(value: string): {
	error: string | null;
	values: [number, number][];
} {
	const text = value.trim();
	if (!text) return { error: null, values: [] };
	const parts = text
		.split("、")
		.map((p) => p.trim())
		.filter(Boolean);
	const invalid = `施工日期格式錯誤，請使用：${WORK_DATES_HINT}`;
	if (!parts.length) return { error: invalid, values: [] };
	const values: [number, number][] = [];
	for (const part of parts) {
		const match = pattern.exec(part);
		if (!match) return { error: invalid, values: [] };
		const start = rocDate(match[1]),
			end = rocDate(match[2] || match[1]);
		if (start === null || end === null)
			return { error: "施工日期無效，請確認年月日是否正確", values: [] };
		if (end < start) return { error: "結束日不可早於開始日", values: [] };
		values.push([start, end]);
	}
	return { error: null, values };
}
export function validateWorkDates(value: string): string | null {
	return ranges(value).error;
}
// Gregorian year, as in the original Python function. Empty/invalid/outside
// the selected month returns null, NOT an empty date selection.
export function workDatesToDays(
	value: string,
	year: number,
	month: number,
): number[] | null {
	const result = ranges(value);
	if (result.error || !result.values.length) return null;
	const days: number[] = [];
	const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
	for (let day = 1; day <= count; day++) {
		const date = Date.UTC(year, month - 1, day);
		if (result.values.some(([start, end]) => date >= start && date <= end))
			days.push(day);
	}
	return days.length ? days : null;
}

/**
 * 將勾選的日期陣列轉換為民國年連續區間字串。
 * 例如：年 115、月 9、日期 [5, 10, 11, 12, 27, 28, 29]
 * 輸出："115/9/5、115/9/10~115/9/12、115/9/27~115/9/29"
 */
export function formatDaysToRange(
	year: number,
	month: number,
	days: number[],
): string {
	if (!days || !days.length) return "";
	const sorted = Array.from(new Set(days.filter((d) => d >= 1 && d <= 31))).sort(
		(a, b) => a - b,
	);
	if (!sorted.length) return "";

	const groups: { start: number; end: number }[] = [];
	let current = { start: sorted[0], end: sorted[0] };

	for (let i = 1; i < sorted.length; i++) {
		const day = sorted[i];
		if (day === current.end + 1) {
			current.end = day;
		} else {
			groups.push(current);
			current = { start: day, end: day };
		}
	}
	groups.push(current);

	return groups
		.map((g) => {
			if (g.start === g.end) {
				return `${year}/${month}/${g.start}`;
			}
			return `${year}/${month}/${g.start}~${year}/${month}/${g.end}`;
		})
		.join("、");
}

