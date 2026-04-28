// Debounced/queued write-back to Monday status columns.
// Coalesces rapid changes per (itemId, columnId) and tracks global sync status.

import { writeStatusIndex, writeLongText, writeDropdownIds } from "./mondayApi";

export type SyncStatus = "synced" | "syncing" | "error";

const PENDING = new Map<string, { timer: number; index: number; resolve: () => void; reject: (e: unknown) => void }>();
const DROPDOWN_PENDING = new Map<string, { timer: number; ids: number[]; resolve: () => void; reject: (e: unknown) => void }>();
const DEBOUNCE_MS = 350;

let inFlight = 0;
let lastError: string | null = null;
const listeners = new Set<(s: SyncStatus, err: string | null) => void>();

function currentStatus(): SyncStatus {
  if (inFlight > 0 || PENDING.size > 0 || TEXT_PENDING.size > 0) return "syncing";
  if (lastError) return "error";
  return "synced";
}

function emit() {
  const s = currentStatus();
  listeners.forEach((l) => l(s, lastError));
}

export function subscribeSyncStatus(fn: (s: SyncStatus, err: string | null) => void): () => void {
  listeners.add(fn);
  fn(currentStatus(), lastError);
  return () => listeners.delete(fn);
}

export function clearSyncError() {
  lastError = null;
  emit();
}

export function queueStatusWrite(itemId: string, columnId: string, index: number): Promise<void> {
  const key = `${itemId}::${columnId}`;
  const existing = PENDING.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.resolve(); // collapse — we'll only fire the latest
  }
  emit(); // pending grew (or stayed) — ensure UI is in syncing state
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(async () => {
      PENDING.delete(key);
      inFlight++;
      emit();
      try {
        await writeStatusIndex(itemId, columnId, index);
        lastError = null;
        resolve();
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        reject(e);
      } finally {
        inFlight--;
        emit();
      }
    }, DEBOUNCE_MS);
    PENDING.set(key, { timer, index, resolve, reject });
    emit();
  });
}

const TEXT_PENDING = new Map<string, { timer: number; text: string; resolve: () => void; reject: (e: unknown) => void }>();
const TEXT_DEBOUNCE_MS = 800;

export function queueLongTextWrite(itemId: string, columnId: string, text: string): Promise<void> {
  const key = `${itemId}::${columnId}`;
  const existing = TEXT_PENDING.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.resolve();
  }
  emit();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(async () => {
      TEXT_PENDING.delete(key);
      inFlight++;
      emit();
      try {
        await writeLongText(itemId, columnId, text);
        lastError = null;
        resolve();
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        reject(e);
      } finally {
        inFlight--;
        emit();
      }
    }, TEXT_DEBOUNCE_MS);
    TEXT_PENDING.set(key, { timer, text, resolve, reject });
    emit();
  });
}
