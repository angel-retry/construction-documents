import assert from "node:assert/strict";
import {
	formatDaysToRange,
	validateWorkDates,
	workDatesToDays,
} from "../lib/legacy-work-dates.ts";

// AC-1: 空白選取
assert.equal(formatDaysToRange(115, 9, []), "");

// AC-2: 單一日
assert.equal(formatDaysToRange(115, 9, [5]), "115/9/5");
assert.equal(validateWorkDates(formatDaysToRange(115, 9, [5])), null);
assert.deepEqual(workDatesToDays("115/9/5", 115 + 1911, 9), [5]);

// AC-3: 單一連續區間
assert.equal(formatDaysToRange(115, 9, [10, 11, 12]), "115/9/10~115/9/12");
assert.equal(validateWorkDates(formatDaysToRange(115, 9, [10, 11, 12])), null);
assert.deepEqual(workDatesToDays("115/9/10~115/9/12", 115 + 1911, 9), [10, 11, 12]);

// AC-4: 混合型多區間 (使用者需求範例)
const mixed = formatDaysToRange(115, 9, [5, 10, 11, 12, 27, 28, 29]);
assert.equal(mixed, "115/9/5、115/9/10~115/9/12、115/9/27~115/9/29");
assert.equal(validateWorkDates(mixed), null);
assert.deepEqual(workDatesToDays(mixed, 115 + 1911, 9), [5, 10, 11, 12, 27, 28, 29]);

// AC-5: 連續 2 天
assert.equal(formatDaysToRange(115, 9, [1, 2]), "115/9/1~115/9/2");
assert.equal(validateWorkDates(formatDaysToRange(115, 9, [1, 2])), null);
assert.deepEqual(workDatesToDays("115/9/1~115/9/2", 115 + 1911, 9), [1, 2]);

console.log("所有施工日期演算法與驗收測試均通過！");
