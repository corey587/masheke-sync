import { useEffect, useMemo, useState } from "react";
import { useMondayPatients } from "@/hooks/useMondayPatients";
import {
  Patient,
  ProductCodeId,
  ProductCodeState,
  EMPTY_INSURANCE,
  UniversalChoice,
} from "@/lib/workflow";
import { resolveHcpcs, type Serving, type PrimaryInsurance } from "@/lib/hcpcRules";
import { InsurancePanel } from "@/components/dashboard/InsurancePanel";
import { PatientsSidebar } from "@/components/dashboard/PatientsSidebar";
import { SyncStatusButton } from "@/components/dashboard/SyncStatusButton";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RotateCcw, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { COL } from "@/lib/mondayApi";
import { queueStatusWrite } from "@/lib/mondayWrite";
import {
  AUTH_RESULT_INDEX,
  PRODUCT_CODE_TO_PRODUCT_ID,
  UNIVERSAL_INDEX,
} from "@/lib/mondayMapping";

const Index = () => {
  const { patients, loading, error, refetch, update, clearOverlay } = useMondayPatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first patient when loaded
  useEffect(() => {
    if (!selectedId && patients.length > 0) setSelectedId(patients[0].id);
  }, [patients, selectedId]);

  const selected: Patient | undefined = useMemo(
    () => patients.find((p) => p.id === selectedId),
    [patients, selectedId],
  );

  const writeStatus = (columnId: string, index: number) => {
    if (!selected) return;
    queueStatusWrite(selected.id, columnId, index).catch((e) => {
      toast.error("Monday write failed", { description: String(e?.message ?? e) });
    });
  };

  // ============= Universal-check change =============
  const onUniversalChange = (id: string, value: UniversalChoice) => {
    if (!selected) return;
    const ins = selected.insurance ?? EMPTY_INSURANCE;
    const next = { ...ins, universal: { ...ins.universal, [id]: value } };
    update(selected.id, { insurance: next });

    // Write to Monday
    if (id === "in-network" || id === "active") {
      const both = next.universal["in-network"] === "confirmed" && next.universal["active"] === "confirmed";
      const anyFail = next.universal["in-network"] === "not-confirmed" || next.universal["active"] === "not-confirmed";
      if (both) writeStatus(COL.activeNetwork, UNIVERSAL_INDEX.activeNetwork.pass);
      else if (anyFail) writeStatus(COL.activeNetwork, UNIVERSAL_INDEX.activeNetwork.fail);
    }
    if (id === "dme-benefits") {
      if (value === "confirmed") writeStatus(COL.dmeBenefits, UNIVERSAL_INDEX.dmeBenefits.pass);
      else if (value === "not-confirmed") writeStatus(COL.dmeBenefits, UNIVERSAL_INDEX.dmeBenefits.fail);
    }
  };

  // ============= Product code change =============
  const updateCode = (codeId: ProductCodeId, patch: Partial<ProductCodeState>) => {
    if (!selected) return;
    const ins = selected.insurance ?? EMPTY_INSURANCE;
    const prev = ins.codes[codeId] ?? { status: "pending" as const };
    const nextCode = { ...prev, ...patch };
    const next = { ...ins, codes: { ...ins.codes, [codeId]: nextCode } };
    update(selected.id, { insurance: next });

    // Per-product auth result column
    const productId = PRODUCT_CODE_TO_PRODUCT_ID[codeId];
    const authColumnId = COL.authResult[productId];
    if (patch.auth !== undefined) {
      if (patch.auth === "required") writeStatus(authColumnId, AUTH_RESULT_INDEX.required);
      else if (patch.auth === "not-required") writeStatus(authColumnId, AUTH_RESULT_INDEX.noAuthNeeded);
    }

    // Aggregate columns: SoS + Auth (computed across all served products)
    recomputeAggregates({ ...selected, insurance: next });
  };

  const recomputeAggregates = (p: Patient) => {
    const ins = p.insurance ?? EMPTY_INSURANCE;
    const resolved = resolveHcpcs(p.primaryInsurance || null, p.serving || null);
    const states = resolved.map((r) => {
      const cid = Object.entries(PRODUCT_CODE_TO_PRODUCT_ID).find(([, v]) => v === r.product)?.[0] as
        | ProductCodeId
        | undefined;
      return cid ? ins.codes[cid] : undefined;
    });
    const allFilled = states.length > 0 && states.every((s) => s?.auth && s?.sos);
    if (!allFilled) return;
    const anyAuth = states.some((s) => s?.auth === "required");
    const anyNotClear = states.some((s) => s?.sos === "not-clear");
    writeStatus(COL.auth, anyAuth ? UNIVERSAL_INDEX.auth.required : UNIVERSAL_INDEX.auth.noAuth);
    writeStatus(COL.sos, anyNotClear ? UNIVERSAL_INDEX.sos.fail : UNIVERSAL_INDEX.sos.pass);
  };

  const resetCodeStatuses = (ins = selected?.insurance ?? EMPTY_INSURANCE) => {
    const codes: typeof ins.codes = {};
    for (const [k, v] of Object.entries(ins.codes)) {
      if (v) codes[k as ProductCodeId] = { ...v, status: "pending", authSubmittedAt: undefined, authApprovedAt: undefined };
    }
    return { ...ins, codes };
  };

  const setServing = (v: Serving) => {
    if (!selected) return;
    const ins = resetCodeStatuses();
    update(selected.id, { serving: v, insurance: ins });
  };

  const setPrimaryInsurance = (v: PrimaryInsurance) => {
    if (!selected) return;
    const ins = resetCodeStatuses();
    update(selected.id, { primaryInsurance: v, insurance: ins });
  };

  const resetForNewPatient = () => {
    if (!selected) return;
    clearOverlay(selected.id);
    update(selected.id, {
      insurance: EMPTY_INSURANCE,
      notes: "",
    });
    toast.success("Cleared local edits — refetching from Monday");
    refetch();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <PatientsSidebar
          patients={patients}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          error={error}
          onRefresh={refetch}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-gradient-navy text-navy-foreground border-b border-sidebar-border">
            <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-navy-foreground hover:bg-white/10" />
                <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elevate">
                  <Stethoscope className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Medically Modern · Onboarding Tool</p>
                  <h1 className="text-xl font-semibold">
                    {selected ? `${selected.name} · Insurance & Benefits` : "Samantha · Insurance & Benefits"}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={resetForNewPatient}
                  disabled={!selected}
                  className="gap-2 bg-white text-navy hover:bg-white/90 shadow-elevate"
                >
                  <RotateCcw className="h-4 w-4" /> Reset for new patient
                </Button>
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 px-6 py-6">
            <section className="max-w-5xl mx-auto space-y-5">
              {!selected && (
                <div className="rounded-xl bg-card border shadow-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {loading
                      ? "Loading patients from Monday…"
                      : error
                        ? error
                        : "Select a patient from the sidebar to begin."}
                  </p>
                </div>
              )}

              {selected && (
                <>
                  <div className="rounded-xl bg-card border shadow-card p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Insurance Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Edits sync back to Monday automatically. List refreshes every 60 seconds.
                    </p>
                  </div>

                  <InsurancePanel
                    patient={selected}
                    onUniversalChange={onUniversalChange}
                    onCodeChange={updateCode}
                    onServingChange={setServing}
                    onPrimaryInsuranceChange={setPrimaryInsurance}
                    onNotesChange={(v) => update(selected.id, { notes: v })}
                  />
                </>
              )}
            </section>
          </main>
        </div>
        <SyncStatusButton />
      </div>
    </SidebarProvider>
  );
};

export default Index;
