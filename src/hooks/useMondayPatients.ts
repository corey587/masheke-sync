import { useCallback, useEffect, useRef, useState } from "react";
import type { Patient } from "@/lib/workflow";
import { fetchGroupItems, hasToken } from "@/lib/mondayApi";
import { mondayItemToPatient } from "@/lib/mondayMapping";

const POLL_MS = 60_000;

export function useMondayPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // local-session overlay so UI edits persist without re-fetching from Monday
  const overlayRef = useRef<Map<string, Partial<Patient>>>(new Map());

  const merge = useCallback((items: Patient[]): Patient[] => {
    return items.map((p) => {
      const o = overlayRef.current.get(p.id);
      return o ? { ...p, ...o } : p;
    });
  }, []);

  const refetch = useCallback(async () => {
    if (!hasToken()) {
      setError("VITE_MONDAY_API_TOKEN is not set. Add it in your project env vars and rebuild.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await fetchGroupItems();
      const ps = items.map(mondayItemToPatient);
      setPatients(merge(ps));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patients from Monday");
    } finally {
      setLoading(false);
    }
  }, [merge]);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // Local-only update — used by UI handlers. Does NOT write to Monday;
  // call writeStatusIndex from mondayApi for that.
  const update = useCallback((id: string, patch: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch, lastUpdated: new Date().toISOString() };
        overlayRef.current.set(id, { ...(overlayRef.current.get(id) ?? {}), ...patch });
        return merged;
      }),
    );
  }, []);

  const clearOverlay = useCallback((id: string) => {
    overlayRef.current.delete(id);
  }, []);

  return { patients, loading, error, refetch, update, clearOverlay };
}
