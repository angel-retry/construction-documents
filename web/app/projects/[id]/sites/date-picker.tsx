"use client";

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	formatDaysToRange,
	workDatesToDays,
} from "../../../../lib/legacy-work-dates";

export interface DateMultiPickerHandle {
	open: () => void;
	close: () => void;
}

interface DateMultiPickerProps {
	year: number;
	month: number;
	value: string;
	onChange: (newValue: string) => void;
	disabled?: boolean;
}

const DateMultiPicker = forwardRef<DateMultiPickerHandle, DateMultiPickerProps>(
	function DateMultiPicker(
		{ year, month, value, onChange, disabled = false },
		ref,
	) {
		const [isOpen, setIsOpen] = useState(false);
		const [selectedDays, setSelectedDays] = useState<number[]>([]);
		const popoverRef = useRef<HTMLDivElement>(null);

		// 當前月份天數與起始星期（以西元年換算）
		const gregorianYear = year + 1911;
		const totalDays = useMemo(
			() => new Date(Date.UTC(gregorianYear, month, 0)).getUTCDate(),
			[gregorianYear, month],
		);

		const startWeekday = useMemo(
			() => new Date(Date.UTC(gregorianYear, month - 1, 1)).getUTCDay(),
			[gregorianYear, month],
		);

		// 打開月曆時，反向解析文字框的既有日期
		const handleOpen = () => {
			if (disabled) return;
			const parsed = workDatesToDays(value, gregorianYear, month);
			setSelectedDays(parsed ? [...parsed] : []);
			setIsOpen(true);
		};

		useImperativeHandle(ref, () => ({
			open: handleOpen,
			close: () => setIsOpen(false),
		}));

	// 點擊日曆日期切換選取狀態
	const toggleDay = (day: number) => {
		setSelectedDays((prev) =>
			prev.includes(day)
				? prev.filter((d) => d !== day)
				: [...prev, day].sort((a, b) => a - b),
		);
	};

	// 快捷操作：僅選週一至週五（工作日）
	const selectWeekdaysOnly = () => {
		const weekdays: number[] = [];
		for (let d = 1; d <= totalDays; d++) {
			const dayOfWeek = new Date(Date.UTC(gregorianYear, month - 1, d)).getUTCDay();
			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				weekdays.push(d);
			}
		}
		setSelectedDays(weekdays);
	};

	// 快捷操作：全選整月
	const selectAllDays = () => {
		setSelectedDays(Array.from({ length: totalDays }, (_, i) => i + 1));
	};

	// 快捷操作：清除
	const clearAllDays = () => {
		setSelectedDays([]);
	};

	// 即時預覽換算後的字串
	const previewString = useMemo(
		() => formatDaysToRange(year, month, selectedDays),
		[year, month, selectedDays],
	);

	// 套用選取並關閉
	const handleApply = () => {
		onChange(previewString);
		setIsOpen(false);
	};

	// 取消並關閉
	const handleCancel = () => {
		setIsOpen(false);
	};

	// 點擊視窗外部自動關閉
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div style={{ position: "relative", display: "inline-block" }}>
			<button
				type="button"
				onClick={handleOpen}
				disabled={disabled}
				title="開啟月曆勾選施工日期"
				style={{
					background: "#f0f2f6",
					border: "1px solid #d1d3da",
					borderRadius: "6px",
					padding: "8px 12px",
					cursor: disabled ? "not-allowed" : "pointer",
					fontSize: "13px",
					fontWeight: 600,
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					minHeight: "38px",
				}}
			>
				<span>📅</span>
				<span>月曆選擇</span>
			</button>

			{isOpen && (
				<div
					ref={popoverRef}
					style={{
						position: "absolute",
						top: "100%",
						left: "0",
						marginTop: "6px",
						zIndex: 1000,
						background: "#ffffff",
						border: "1px solid #cbd5e1",
						borderRadius: "10px",
						boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
						padding: "16px",
						width: "320px",
						color: "#1e293b",
					}}
				>
					{/* 標題欄 */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "12px",
							borderBottom: "1px solid #e2e8f0",
							paddingBottom: "8px",
						}}
					>
						<span style={{ fontWeight: 700, fontSize: "14px" }}>
							民國 {year} 年 {month} 月
						</span>
						<span style={{ fontSize: "12px", color: "#64748b" }}>
							已選 {selectedDays.length} 天
						</span>
					</div>

					{/* 快捷操作按鈕 */}
					<div
						style={{
							display: "flex",
							gap: "6px",
							marginBottom: "12px",
						}}
					>
						<button
							type="button"
							onClick={selectWeekdaysOnly}
							style={quickBtnStyle}
						>
							工作日(一~五)
						</button>
						<button
							type="button"
							onClick={selectAllDays}
							style={quickBtnStyle}
						>
							全選
						</button>
						<button
							type="button"
							onClick={clearAllDays}
							style={{ ...quickBtnStyle, color: "#dc2626" }}
						>
							清除
						</button>
					</div>

					{/* 星期表頭 */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(7, 1fr)",
							gap: "4px",
							textAlign: "center",
							fontSize: "12px",
							fontWeight: 600,
							color: "#64748b",
							marginBottom: "6px",
						}}
					>
						<span>日</span>
						<span>一</span>
						<span>二</span>
						<span>三</span>
						<span>四</span>
						<span>五</span>
						<span>六</span>
					</div>

					{/* 月曆網格 */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(7, 1fr)",
							gap: "4px",
						}}
					>
						{/* 月初空白格 */}
						{Array.from({ length: startWeekday }).map((_, i) => (
							<div key={`empty-${i}`} />
						))}

						{/* 當月天數格 */}
						{Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
							const isSelected = selectedDays.includes(day);
							const dayOfWeek = new Date(
								Date.UTC(gregorianYear, month - 1, day),
							).getUTCDay();
							const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

							return (
								<button
									key={day}
									type="button"
									onClick={() => toggleDay(day)}
									style={{
										height: "32px",
										border: isSelected
											? "1px solid #059669"
											: "1px solid transparent",
										borderRadius: "6px",
										background: isSelected ? "#10b981" : isWeekend ? "#f8fafc" : "#ffffff",
										color: isSelected ? "#ffffff" : isWeekend ? "#94a3b8" : "#334155",
										fontWeight: isSelected ? 700 : 500,
										fontSize: "13px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										transition: "all 0.1s",
									}}
								>
									{day}
								</button>
							);
						})}
					</div>

					{/* 預覽區塊 */}
					<div
						style={{
							marginTop: "12px",
							padding: "8px 10px",
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: "6px",
							fontSize: "12px",
							color: "#334155",
							wordBreak: "break-all",
							minHeight: "36px",
							maxHeight: "64px",
							overflowY: "auto",
						}}
					>
						<strong>產生格式：</strong>
						{previewString || <span style={{ color: "#94a3b8" }}>未選擇日期</span>}
					</div>

					{/* 底部按鈕 */}
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							gap: "8px",
							marginTop: "12px",
						}}
					>
						<button
							type="button"
							onClick={handleCancel}
							style={{
								background: "#f1f5f9",
								border: "1px solid #cbd5e1",
								borderRadius: "6px",
								padding: "6px 12px",
								fontSize: "12px",
								cursor: "pointer",
							}}
						>
							取消
						</button>
						<button
							type="button"
							onClick={handleApply}
							style={{
								background: "#10b981",
								border: "none",
								color: "#ffffff",
								borderRadius: "6px",
								padding: "6px 14px",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							套用填入
						</button>
					</div>
				</div>
			)}
		</div>
	);
});

export default DateMultiPicker;

const quickBtnStyle: React.CSSProperties = {
	flex: 1,
	background: "#f8fafc",
	border: "1px solid #e2e8f0",
	borderRadius: "4px",
	padding: "4px 6px",
	fontSize: "11px",
	fontWeight: 600,
	color: "#475569",
	cursor: "pointer",
};
