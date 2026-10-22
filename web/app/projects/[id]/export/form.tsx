"use client";
import { useEffect, useState } from "react";
export default function ExportForm({
	project,
	period,
	year,
	month,
	hash,
	ready,
}: {
	project: string;
	period: string;
	year: number;
	month: number;
	hash: string;
	ready: boolean;
}) {
	const [busy, setBusy] = useState(false),
		[message, setMessage] = useState(""),
		[priorDirty, setPriorDirty] = useState(false);
	useEffect(() => {
		try {
			setPriorDirty(sessionStorage.getItem(`prior-dirty:${period}`) === "true");
		} catch {}
	}, [period]);
	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				if (busy || !ready || priorDirty) return;
				try {
					if (sessionStorage.getItem(`prior-dirty:${period}`) === "true") {
						setPriorDirty(true);
						return;
					}
				} catch {}
				setBusy(true);
				setMessage("正在產生施工日誌及結算／竣工單…");
				try {
					const body = new FormData();
					body.set("year", String(year));
					body.set("month", String(month));
					body.set("snapshot", hash);
					const response = await fetch(`/projects/${project}/export/download`, {
						method: "POST",
						body,
					});
					if (
						!response.ok ||
						!response.headers.get("content-type")?.includes("application/zip")
					) {
						const error = await response
							.json()
							.catch(() => ({
								message: "登入已逾時或下載失敗，請重新登入後重試。",
							}));
						throw Error(error.message);
					}
					const url = URL.createObjectURL(await response.blob());
					const a = document.createElement("a");
					a.href = url;
					a.download = decodeURIComponent(
						response.headers.get("content-disposition")?.split("UTF-8''")[1] ||
							"施工文件.zip",
					);
					a.click();
					setTimeout(() => URL.revokeObjectURL(url), 60000);
					setMessage("文件已產生並開始下載 ZIP，解壓縮後可開啟各份 Excel。");
				} catch (error) {
					setMessage(error instanceof Error ? error.message : "下載失敗。");
				} finally {
					setBusy(false);
				}
			}}
		>
			{priorDirty && (
				<p role="alert">
					前期累計仍有未儲存貼上內容。請先回前期累計套用並儲存，或清空不採用的貼上內容。
				</p>
			)}
			<button disabled={busy || !ready || priorDirty}>
				{busy ? "產生中…" : "產生並下載 Excel ZIP"}
			</button>
			<p role="status">{message}</p>
		</form>
	);
}
