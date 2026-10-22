// Same floor-to-two-decimal rule as baseline exporter.floor2.
export function itemAmount(quantity: number, price: number) {
	return Math.floor(quantity * price * 100) / 100;
}
export function monthQuantity(values: Record<string, string | number>) {
	return Object.values(values).reduce<number>(
		(sum, value) => sum + (Number(value) || 0),
		0,
	);
}
