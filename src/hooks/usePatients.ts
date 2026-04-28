import { useEffect, useState, useCallback } from "react";
import { Patient } from "@/lib/workflow";
import { SEED_PATIENTS } from "@/lib/seed";

const STORAGE_KEY = "mm.patients.v1";

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Patient[];
    } catch {}
    return SEED_PATIENTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }, [patients]);

  const update = useCallback((id: string, patch: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...patch, lastUpdated: new Date().toISOString() } : p,
      ),
    );
  }, []);

  const reset = useCallback(() => setPatients(SEED_PATIENTS), []);

  return { patients, update, reset };
}
