import { useMemo } from "react";
import { usePatients } from "@/hooks/usePatients";
import {
  Patient,
  ProductCodeId,
  ProductCodeState,
  EMPTY_INSURANCE,
} from "@/lib/workflow";
import { syncToMonday } from "@/lib/monday";
import { resolveHcpcs, type Serving, type PrimaryInsurance } from "@/lib/hcpcRules";
import { InsurancePanel } from "@/components/dashboard/InsurancePanel";
import { MondaySettings } from "@/components/dashboard/MondaySettings";
import { Button } from "@/components/ui/button";
import { RotateCcw, Stethoscope } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { patients, update } = usePatients();

  // Always work against the first Samantha-owned patient (single-tool mode)
  const selected = useMemo<Patient | undefined>(() => {
    return (
      patients.find((p) => p.owner === "Samantha") ??
      patients.find(
        (p) =>
          p.stage === "advanced" ||
          p.stage === "insurance-cleared" ||
          p.stage === "welcome-call",
      ) ??
      patients[0]
    );
  }, [patients]);

  if (!selected) return null;

  const sync = (event: Parameters<typeof syncToMonday>[0], p: Patient) => {
    syncToMonday(event, p).then((res) => {
      if (res.ok) toast.success("Synced to Monday.com", { description: `${event} · ${p.name}` });
    });
  };

  // ============= Samantha · Insurance handlers =============
  const toggleUniversal = (id: string, checked: boolean) => {
    const ins = selected.insurance ?? EMPTY_INSURANCE;
    const next = { ...ins, universal: { ...ins.universal, [id]: checked } };
    update(selected.id, { insurance: next });
    sync("insurance.updated", { ...selected, insurance: next });
  };

  const updateCode = (codeId: ProductCodeId, patch: Partial<ProductCodeState>) => {
    const ins = selected.insurance ?? EMPTY_INSURANCE;
    const prev = ins.codes[codeId] ?? { status: "pending" as const };
    const next = { ...ins, codes: { ...ins.codes, [codeId]: { ...prev, ...patch } } };
    update(selected.id, { insurance: next });
    sync("insurance.updated", { ...selected, insurance: next });
  };

  const resetCodeStatuses = (ins = selected.insurance ?? EMPTY_INSURANCE) => {
    const codes: typeof ins.codes = {};
    for (const [k, v] of Object.entries(ins.codes)) {
      if (v) codes[k as ProductCodeId] = { ...v, status: "pending", authSubmittedAt: undefined, authApprovedAt: undefined };
    }
    return { ...ins, codes };
  };

  const setServing = (v: Serving) => {
    const ins = resetCodeStatuses();
    const resolved = resolveHcpcs(selected.primaryInsurance || null, v);
    const anyMedicaid = resolved.some((p) => p.billsTo === "medicaid");
    const patch: Partial<Patient> = { serving: v, insurance: ins };
    if (anyMedicaid && !selected.hasMedicaid) patch.hasMedicaid = true;
    update(selected.id, patch);
    sync("patient.updated", { ...selected, ...patch });
  };

  const setPrimaryInsurance = (v: PrimaryInsurance) => {
    const ins = resetCodeStatuses();
    const resolved = resolveHcpcs(v, selected.serving || null);
    const anyMedicaid = resolved.some((p) => p.billsTo === "medicaid");
    const patch: Partial<Patient> = { primaryInsurance: v, insurance: ins };
    if (anyMedicaid && !selected.hasMedicaid) patch.hasMedicaid = true;
    update(selected.id, patch);
    sync("patient.updated", { ...selected, ...patch });
  };

  const resetForNewPatient = () => {
    update(selected.id, {
      insurance: EMPTY_INSURANCE,
      serving: "",
      primaryInsurance: "",
      notes: "",
      hasMedicaid: false,
    });
    toast.success("Cleared — ready for next patient");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-gradient-navy text-navy-foreground border-b border-sidebar-border">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elevate">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Medically Modern · Onboarding Tool</p>
              <h1 className="text-xl font-semibold">Samantha · Insurance & Benefits</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetForNewPatient}
              className="gap-2 bg-white text-navy hover:bg-white/90 shadow-elevate"
            >
              <RotateCcw className="h-4 w-4" /> Reset for new patient
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-6">
        <section className="max-w-5xl mx-auto space-y-5">
          <div className="rounded-xl bg-card border shadow-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Insurance Verification</p>
            <p className="text-sm text-muted-foreground">
              Generic intake tool — work the checklist below, then reset for the next patient.
            </p>
          </div>

          <InsurancePanel
            patient={selected}
            onUniversalToggle={toggleUniversal}
            onCodeChange={updateCode}
            onServingChange={setServing}
            onPrimaryInsuranceChange={setPrimaryInsurance}
            onNotesChange={(v) => update(selected.id, { notes: v })}
          />
        </section>
      </main>
    </div>
  );
};

export default Index;
