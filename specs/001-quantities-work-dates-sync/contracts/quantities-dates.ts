/**
 * 數量看板日期連動合約與型別定義
 */

export interface DateFilterProps {
  year: number;
  month: number;
  workDatesString: string;
  allDays: number[];
  workDays: number[] | null;
  selectedDays: number[];
  onChange: (days: number[]) => void;
  onReset: () => void;
}

export interface SiteDateSummary {
  displayLabel: string;
  isLinkedToSites: boolean;
  activeCount: number;
}
