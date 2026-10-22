"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parsePeriod } from "../../../../lib/reporting-period";
// Remember only navigation in this browser tab; never save or assign business data.
export default function PeriodMemory({
	user,
	project,
	kind,
	year,
	month,
	restore,
	page = "sites",
}: {
	user: string;
	project: string;
	kind: string;
	year?: number;
	month?: number;
	restore: boolean;
	page?: "sites" | "quantities" | "prior" | "export";
}) {
	const router = useRouter();
	useEffect(() => {
		const key = `site-period:${user}:${project}`;
		try {
			if (year && month) {
				sessionStorage.setItem(key, `${year}/${month}`);
				return;
			}
			if (!restore) return;
			const [y, m] = (sessionStorage.getItem(key) || "").split("/");
			const saved = parsePeriod(y, m, kind);
			if (saved)
				router.replace(
					`/projects/${project}/${page}?year=${saved.rocYear}&month=${saved.month}`,
				);
		} catch {
			/* Browser storage can be disabled; the month selector remains usable. */
		}
	}, [user, project, kind, year, month, restore, page, router]);
	return null;
}
