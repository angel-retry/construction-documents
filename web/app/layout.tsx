import "./legacy.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "皇喆營造｜施工文件",
	robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-Hant">
			<body>{children}</body>
		</html>
	);
}
