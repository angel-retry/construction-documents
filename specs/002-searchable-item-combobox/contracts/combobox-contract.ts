/**
 * 整合式可搜尋工項下拉選單介面合約 (Combobox Contract)
 * 功能代碼: 002-searchable-item-combobox
 */

/** 可供選取之合約工項結構 */
export interface CatalogItemOption {
	code: string;
	name: string;
	unit: string;
	seq?: number;
}

/** Combobox 元件 Props 屬性定義 */
export interface ItemComboboxProps {
	/** 目前路段尚未加入之可用工項清單 */
	availableItems: CatalogItemOption[];
	/** 當前選定的工項代碼（受控模式） */
	value: string;
	/** 選定工項代碼變更之回呼函式 */
	onChange: (code: string) => void;
	/** 元件是否處於停用狀態（例如表單提交中或權限唯讀） */
	disabled?: boolean;
	/** 輸入框提示字串 */
	placeholder?: string;
	/** 送出成功後觸發重置之依賴鍵值或訊號 */
	resetKey?: string | number;
}
