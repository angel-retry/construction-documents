"use client";

import { useEffect, useRef, useState } from "react";

export interface CatalogItemOption {
	code: string;
	name: string;
	unit: string;
	seq?: number;
}

interface ItemComboboxProps {
	/** 可選取之合約工項清單 */
	availableItems: CatalogItemOption[];
	/** 表單隱藏欄位名稱，預設為 "code" */
	name?: string;
	/** 是否停用 */
	disabled?: boolean;
	/** 重置觸發鍵值（例如新增成功後的訊號） */
	resetKey?: string | number | boolean;
	/** 選取代碼變更通知（供外部按鈕判斷 disabled） */
	onSelectChange?: (code: string) => void;
	/** 預設提示文字 */
	placeholder?: string;
}

/**
 * 整合式可搜尋工項下拉選單元件 (Combobox)
 * 支援點擊展開、contains 模糊過濾、點選帶入、外部點擊收合與表單 hidden input 連動
 */
export function ItemCombobox({
	availableItems,
	name = "code",
	disabled = false,
	resetKey,
	onSelectChange,
	placeholder = "搜尋工項代碼或名稱…",
}: ItemComboboxProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedCode, setSelectedCode] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 當 resetKey 變化時（例如加入成功），重置內部狀態
	useEffect(() => {
		if (resetKey !== undefined) {
			setSelectedCode("");
			setQuery("");
			setIsOpen(false);
			onSelectChange?.("");
		}
	}, [resetKey]);

	// 點擊外部 (Click outside) 與 Escape 鍵自動收合下拉清單
	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	// 即時包含比對過濾（contains filter，同時比對代碼與名稱）
	const trimmed = query.trim().toLowerCase();
	const filtered = availableItems.filter((item) => {
		if (!trimmed) return true;
		return (
			item.code.toLowerCase().includes(trimmed) ||
			item.name.toLowerCase().includes(trimmed)
		);
	});

	// 選取工項
	const handleSelect = (item: CatalogItemOption) => {
		const label = `${item.code}｜${item.name}（${item.unit}）`;
		setSelectedCode(item.code);
		setQuery(label);
		setIsOpen(false);
		onSelectChange?.(item.code);
	};

	// 清除選取
	const handleClear = () => {
		setSelectedCode("");
		setQuery("");
		setIsOpen(false);
		onSelectChange?.("");
		inputRef.current?.focus();
	};

	return (
		<div
			ref={containerRef}
			className={`item-combobox ${disabled ? "is-disabled" : ""}`}
		>
			{/* 提供表單提交的隱藏欄位 */}
			<input type="hidden" name={name} value={selectedCode} />

			<div className="item-combobox-input-wrapper">
				<input
					ref={inputRef}
					type="text"
					className="item-combobox-input"
					value={query}
					disabled={disabled || availableItems.length === 0}
					placeholder={
						availableItems.length === 0
							? "已無可加入之工項"
							: placeholder
					}
					onFocus={() => {
						if (!disabled && availableItems.length > 0) {
							setIsOpen(true);
						}
					}}
					onChange={(e) => {
						const val = e.target.value;
						setQuery(val);
						// 若使用者打字修改已選工項，重置選定狀態
						if (selectedCode) {
							setSelectedCode("");
							onSelectChange?.("");
						}
						setIsOpen(true);
					}}
				/>

				{/* 清除按鈕 */}
				{query && !disabled && (
					<button
						type="button"
						className="item-combobox-clear-btn"
						onClick={handleClear}
						title="清除"
						aria-label="清除"
					>
						✕
					</button>
				)}

				{/* 展開指示圖示 */}
				<button
					type="button"
					className="item-combobox-toggle-btn"
					disabled={disabled || availableItems.length === 0}
					onClick={() => {
						if (!disabled && availableItems.length > 0) {
							setIsOpen((prev) => !prev);
							inputRef.current?.focus();
						}
					}}
					title="展開選單"
					aria-label="展開選單"
				>
					▾
				</button>
			</div>

			{/* 絕對定位懸浮選單 (Overlay) */}
			{isOpen && !disabled && availableItems.length > 0 && (
				<div className="item-combobox-menu" role="listbox">
					{filtered.length === 0 ? (
						<div className="item-combobox-empty">查無相符工項</div>
					) : (
						filtered.map((item) => {
							const isSelected = item.code === selectedCode;
							return (
								<button
									key={item.code}
									type="button"
									role="option"
									aria-selected={isSelected}
									className={`item-combobox-option ${isSelected ? "is-selected" : ""}`}
									onClick={() => handleSelect(item)}
								>
									<span className="item-combobox-option-code">
										{item.code}
									</span>
									<span className="item-combobox-option-sep">｜</span>
									<span className="item-combobox-option-name">
										{item.name}
									</span>
									<span className="item-combobox-option-unit">
										（{item.unit}）
									</span>
								</button>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
