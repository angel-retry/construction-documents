export type QuantityDraft = {
	target: string;
	note: string;
	days: Record<string, string>;
};
export type QuantityPatch = {
	target?: string;
	note?: string;
	days: Record<string, string>;
};
export type SaveResult = { ok?: boolean; message: string; revision?: number };
const equalQuantity = (a: string = "0", b: string = "0") =>
	Number(a || "0") === Number(b || "0");
const copy = (draft: QuantityDraft): QuantityDraft => ({
	...draft,
	days: { ...draft.days },
});

export function quantityPatch(
	saved: QuantityDraft,
	draft: QuantityDraft,
): QuantityPatch {
	const patch: QuantityPatch = { days: {} };
	if (!equalQuantity(saved.target, draft.target))
		patch.target = draft.target || "0";
	if (saved.note !== draft.note) patch.note = draft.note;
	for (const day of new Set([
		...Object.keys(saved.days),
		...Object.keys(draft.days),
	])) {
		if (!equalQuantity(saved.days[day], draft.days[day]))
			patch.days[day] = draft.days[day] || "0";
	}
	return patch;
}
export const hasQuantityPatch = (patch: QuantityPatch) =>
	patch.target !== undefined ||
	patch.note !== undefined ||
	Object.keys(patch.days).length > 0;

// Each row owns a queue. Only acknowledged snapshots advance its baseline/version.
export class QuantitySaveQueue {
	draft: QuantityDraft;
	saved: QuantityDraft;
	busy = false;
	removing = false;
	removed = false;
	hasSaved = false;
	message = "";
	failed = false;
	private queued: {
		draft: QuantityDraft;
		remove: boolean;
		force: boolean;
	} | null = null;
	constructor(
		initial: QuantityDraft,
		public revision: number,
		private send: (
			patch: QuantityPatch,
			revision: number,
			remove: boolean,
		) => Promise<SaveResult>,
		private changed: () => void,
		private acknowledged: (
			draft: QuantityDraft,
			revision: number,
			removed: boolean,
		) => void,
	) {
		this.draft = copy(initial);
		this.saved = copy(initial);
	}
	get dirty() {
		return hasQuantityPatch(quantityPatch(this.saved, this.draft));
	}
	edit(draft: QuantityDraft) {
		this.draft = copy(draft);
		this.changed();
	}
	async submit(remove = false, force = false) {
		this.queued = { draft: copy(this.draft), remove, force };
		if (this.busy) return;
		while (this.queued) {
			const request = this.queued;
			this.queued = null;
			const patch = quantityPatch(this.saved, request.draft);
			if (!hasQuantityPatch(patch) && !request.remove && !request.force)
				continue;
			this.busy = true;
			this.removing = request.remove;
			this.failed = false;
			this.message = "";
			this.changed();
			let result: SaveResult;
			try {
				result = await this.send(patch, this.revision, request.remove);
			} catch {
				result = { ok: false, message: "無法連線，輸入仍保留，請重試。" };
			}
			this.busy = false;
			this.removing = false;
			if (!result.ok || !Number.isInteger(result.revision)) {
				this.failed = true;
				this.message = result.message;
				this.queued = null;
				this.changed();
				return;
			}
			this.saved = copy(request.draft);
			this.revision = result.revision!;
			this.removed = request.remove;
			this.hasSaved = true;
			this.message = result.message;
			this.acknowledged(copy(this.saved), this.revision, this.removed);
			this.changed();
			if (this.removed) {
				this.queued = null;
				return;
			}
		}
	}
}
