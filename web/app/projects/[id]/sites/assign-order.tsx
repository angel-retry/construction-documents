"use client";
import { useActionState, useState } from "react";
import { assignOrder } from "./actions";
type Order = {
	id: string;
	number: string;
	title: string;
	case_override: string | null;
	revision: number;
};
export default function AssignOrder({
	project,
	year,
	month,
	orders,
}: {
	project: string;
	year: number;
	month: number;
	orders: Order[];
}) {
	const [chosen, setChosen] = useState("");
	const order = orders.find((o) => o.id === chosen);
	const [state, action, pending] = useActionState(assignOrder, { message: "" });
	return (
		<section>
			<h3>將既有派工單歸入本月</h3>
			<p className="old-caption">
				歸入 {year} 年 {month}{" "}
				月，沿用原編號、名稱與案件類別。施工日期可先留空，之後再填；不會以預定完成日代填。
			</p>
			<form action={action}>
				<input type="hidden" name="project" value={project} />
				<input type="hidden" name="year" value={year} />
				<input type="hidden" name="month" value={month} />
				<input type="hidden" name="revision" value={order?.revision || ""} />
				<fieldset disabled={pending} style={{ border: 0, padding: 0 }}>
					<div className="old-grid two">
						<label className="old-field">
							既有派工單
							<select
								required
								name="order"
								value={chosen}
								onChange={(e) => setChosen(e.target.value)}
							>
								<option value="">請選擇派工單</option>
								{orders.map((o) => (
									<option key={o.id} value={o.id}>
										{o.number}｜{o.title}
									</option>
								))}
							</select>
						</label>
						<label className="old-field">
							施工日期
							<input
								name="work_dates"
								maxLength={2000}
								placeholder="115/9/4、115/9/8-115/9/10"
							/>
						</label>
					</div>
					{order && (
						<p>
							項次：{order.number}｜{order.title}｜
							{order.case_override === "normal"
								? "一般派工"
								: order.case_override === "independent"
									? "獨立派工"
									: "自動判斷"}
						</p>
					)}
					<button disabled={!order} type="submit">
						{pending ? "歸入中…" : `歸入 ${year} 年 ${month} 月`}
					</button>
				</fieldset>
				<p role="status">{state.message}</p>
			</form>
		</section>
	);
}
