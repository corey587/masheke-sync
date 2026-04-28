// Debounced/queued write-back to Monday status columns.
// Coalesces rapid changes per (itemId, columnId) and ignores failures gracefully.

import { writeStatusIndex } from "./mondayApi";

const PENDING = new Map<string, { timer: number; index: number; resolve: () => void; reject: (e: unknown) => void }>();
const DEBOUNCE_MS = 350;

export function queueStatusWrite(itemId: string, columnId: string, index: number): Promise<void> {
  const key = `${itemId}::${columnId}`;
  const existing = PENDING.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.resolve(); // collapse — we'll only fire the latest
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(async () => {
      PENDING.delete(key);
      try {
        await writeStatusIndex(itemId, columnId, index);
        resolve();
      } catch (e) {
        reject(e);
      }
    }, DEBOUNCE_MS);
    PENDING.set(key, { timer, index, resolve, reject });
  });
}
