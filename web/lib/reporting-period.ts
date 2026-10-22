export function monthMinimum(kind: string) {
	return kind === "park" ? 2 : 4;
}
export function parsePeriod(year: unknown, month: unknown, kind: string) {
	const y = String(year ?? ""),
		m = String(month ?? "");
	if (!/^\d{2,3}$/.test(y) || !/^\d{1,2}$/.test(m)) return null;
	const rocYear = Number(y),
		monthNumber = Number(m);
	if (rocYear < 1 || monthNumber < monthMinimum(kind) || monthNumber > 12)
		return null;
	const gregorian = rocYear + 1911;
	const start = `${gregorian}-${String(monthNumber).padStart(2, "0")}-01`;
	const days = new Date(Date.UTC(gregorian, monthNumber, 0)).getUTCDate();
	return {
		rocYear,
		month: monthNumber,
		start,
		end: `${gregorian}-${String(monthNumber).padStart(2, "0")}-${days}`,
	};
}
