/**
 * Excel 結算單匯入功能型別合約定義
 * 依循 Constitution Principle IV: 100% 繁體中文註釋
 */

export interface ParsedSite {
  site_id: number;
  name: string;
  work_dates: string;
  note: string;
}

export interface ParsedQuantity {
  site_id: number;
  item_code: string;
  day: number;
  quantity: number;
}

export interface ParsedSettlementData {
  kind: "park" | "rainwater";
  roc_year: number;
  month: number;
  project_name: string;
  owner: string;
  location: string;
  sites: ParsedSite[];
  quantities: ParsedQuantity[];
  item_targets: Record<string, number>;
  item_notes: Record<string, string>;
  warnings: string[];
}

export interface ImportSettlementResult {
  success: boolean;
  message: string;
  data?: {
    rocYear: number;
    month: number;
    sitesCount: number;
    quantitiesCount: number;
    warnings: string[];
  };
}
