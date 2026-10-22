import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import { access } from "node:fs/promises";
export async function excelWorker(project: any): Promise<Buffer> {
	if (process.env.VERCEL) throw Error("文件服務尚未部署。");
	const python = process.env.EXPORT_PYTHON || "python";
	const worker = path.resolve(
		process.cwd(),
		"../migration_tools/web_excel_worker.py",
	);
	await access(worker);
	return new Promise((resolve, reject) => {
		const child = spawn(/*turbopackIgnore: true*/ python, [worker], {
			windowsHide: true,
			stdio: ["pipe", "pipe", "pipe"],
			env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" },
		});
		const chunks: Buffer[] = [];
		let size = 0,
			errors = "",
			done = false;
		const finish = (error?: Error) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			error ? reject(error) : resolve(Buffer.concat(chunks));
		};
		const timer = setTimeout(() => {
			child.kill();
			finish(Error("產生文件逾時，請減少匯出範圍後重試。"));
		}, 120000);
		child.on("error", () =>
			finish(Error("無法啟動 Excel 文件服務，請檢查 Python 設定。")),
		);
		child.stdout.on("data", (b: Buffer) => {
			size += b.length;
			if (size > 50 * 1024 * 1024) {
				child.kill();
				finish(Error("文件超過下載大小限制。"));
			} else chunks.push(b);
		});
		child.stderr.on("data", (b: Buffer) => {
			errors = (errors + b.toString("utf8")).slice(-8000);
		});
		child.on("close", (code) => {
			if (code === 0) finish();
			else {
				const line = errors
					.split("\n")
					.find((x) => x.startsWith("USER_ERROR:"));
				finish(
					Error(line ? line.slice(11).trim() : "Excel 產生失敗，請稍後重試。"),
				);
			}
		});
		child.stdin.on("error", () => {});
		child.stdin.end(JSON.stringify(project));
	});
}
