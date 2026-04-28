import { useMemo, useState } from "react";
import { usePatients } from "@/hooks/usePatients";
import {
  Patient,
  PILLARS,
  PATHWAYS,
  STAGE_LABELS,
  ContactMethod,
  PathwayId,
  ProductCodeId,
  ProductCodeState,
  EMPTY_INSURANCE,
  deriveInsuranceOutcome,
} from "@/lib/workflow";
import { syncToMonday } from "@/lib/monday";
import { PatientCard } from "@/components/dashboard/PatientCard";
import { PillarsChecklist } from "@/components/dashboard/PillarsChecklist";
import { PathwayPanel } from "@/components/dashboard/PathwayPanel";
import { DoctorRequestPanel } from "@/components/dashboard/DoctorRequestPanel";
import { InsurancePanel } from "@/components/dashboard/InsurancePanel";
import { MondaySettings } from "@/components/dashboard/MondaySettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, ArrowRightCircle, CheckCircle2, PhoneCall, RotateCcw, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";

type Filter = "active" | "doctor-request" | "samantha" | "escalated";

const Index = () => {
  const { patients, update, reset } = usePatients();
  const [selectedId, setSelectedId] = useState<string>(patients[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      switch (filter) {
        case "active": return p.owner === "Masheke" && p.stage !== "advanced" && p.stage !== "escalated";
        case "doctor-request": return p.stage === "doctor-request";
        case "samantha": return p.owner === "Samantha" || p.stage === "advanced" || p.stage === "insurance-cleared" || p.stage === "welcome-call";
        case "escalated": return p.stage === "escalated";
      }
    });
  }, [patients, filter, search]);

  const selected = patients.find((p) => p.id === selectedId) ?? patients[0];

  const stats = useMemo(() => ({
    total: patients.length,
    inEval: patients.filter((p) => p.stage === "evaluation" || p.stage === "intake").length,
    chasing: patients.filter((p) => p.stage === "doctor-request").length,
    escalated: patients.filter((p) => p.stage === "escalated").length,
    samantha: patients.filter((p) => p.owner === "Samantha").length,
  }), [patients]);

  if (!selected) return null;

  const sync = (event: Parameters<typeof syncToMonday>[0], p: Patient) => {
    syncToMonday(event, p).then((res) => {
      if (res.ok) toast.success("Synced to Monday.com", { description: `${event} · ${p.name}` });
    });
  };

  const togglePillar = (id: string, checked: boolean) => {
    const next = { ...selected, pillars: { ...selected.pillars, [id]: checked } };
    update(selected.id, { pillars: next.pillars });
    sync("patient.updated", next);
  };

  const togglePathwayItem = (id: string, checked: boolean) => {
    const next = { ...selected, pathwayChecks: { ...selected.pathwayChecks, [id]: checked } };
    update(selected.id, { pathwayChecks: next.pathwayChecks });
    sync("patient.updated", next);
  };

  const setPathway = (id: PathwayId) => {
    update(selected.id, { pathwayId: id, pathwayChecks: {} });
    sync("patient.updated", { ...selected, pathwayId: id });
  };

  const setMethod = (m: ContactMethod) => {
    update(selected.id, { contactMethod: m, chaseStep: 0, faxPhase: 1 });
  };

  const advanceChase = () => {
    update(selected.id, { chaseStep: selected.chaseStep + 1, stage: "doctor-request" });
    sync("stage.changed", { ...selected, stage: "doctor-request", chaseStep: selected.chaseStep + 1 });
  };

  const resetChase = () => update(selected.id, { chaseStep: 0 });

  const setPhase = (phase: 1 | 2) => update(selected.id, { faxPhase: phase, chaseStep: 0 });

  const logAccountability = (rep: { representativeName: string; representativeTitle: string }) => {
    const accountability = { ...rep, confirmedAt: new Date().toISOString() };
    update(selected.id, { accountability, faxPhase: 2, chaseStep: 0 });
    toast.success(`${rep.representativeName} logged · moving to Phase 2`);
    sync("patient.updated", { ...selected, accountability });
  };

  const escalate = () => {
    update(selected.id, { stage: "escalated", owner: "Janelle" });
    sync("escalation.triggered", { ...selected, stage: "escalated", owner: "Janelle" });
    toast.warning("Escalated to Janelle", { description: "CEO has visibility." });
  };

  const advance = () => {
    const insurance = selected.insurance ?? EMPTY_INSURANCE;
    update(selected.id, { stage: "advanced", owner: "Samantha", insurance });
    sync("patient.advanced", { ...selected, stage: "advanced", owner: "Samantha", insurance });
    toast.success("Advanced to Insurance & Benefits", { description: "Samantha takes over." });
  };

  const moveToDoctorRequest = () => {
    update(selected.id, { stage: "doctor-request" });
    sync("stage.changed", { ...selected, stage: "doctor-request" });
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

  const setMedicaid = (v: boolean) => update(selected.id, { hasMedicaid: v });

  const scheduleWelcomeCall = () => {
    update(selected.id, { stage: "welcome-call" });
    sync("welcome-call.scheduled", { ...selected, stage: "welcome-call" });
    toast.success("Welcome call scheduled", { description: `${selected.name} cleared insurance.` });
  };

  const allPillars = PILLARS.every((p) => selected.pillars[p.id]);
  const pathway = PATHWAYS.find((p) => p.id === selected.pathwayId);
  const allPathway = pathway ? pathway.items.every((i) => selected.pathwayChecks[i.id]) : false;
  const isSamanthaView = selected.owner === "Samantha" || selected.stage === "advanced" || selected.stage === "insurance-cleared" || selected.stage === "welcome-call";
  const readyToAdvance = !isSamanthaView && allPillars && allPathway;
  const insuranceOutcome = deriveInsuranceOutcome(selected.insurance);

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
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Medically Modern · Onboarding Board</p>
              <h1 className="text-xl font-semibold">Masheke · Medical Evaluation</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MondaySettings />
            <Button variant="ghost" size="sm" onClick={reset} className="text-navy-foreground hover:bg-white/10 gap-2">
              <RotateCcw className="h-4 w-4" /> Reset demo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-6 pb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Total patients" value={stats.total} />
          <Stat label="In evaluation" value={stats.inEval} icon={Stethoscope} accent="primary" />
          <Stat label="Doctor request" value={stats.chasing} icon={Activity} accent="warning" />
          <Stat label="Escalated" value={stats.escalated} icon={AlertTriangle} accent="escalate" />
          <Stat label="Advanced" value={stats.advanced} icon={ArrowRightCircle} accent="success" />
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Queue */}
        <aside className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
              <TabsTrigger value="doctor-request" className="text-xs">Chasing</TabsTrigger>
              <TabsTrigger value="escalated" className="text-xs">Escalated</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No patients match.</p>
            )}
            {filtered.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                active={p.id === selected.id}
                onClick={() => setSelectedId(p.id)}
              />
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="space-y-5">
          {/* Header card */}
          <div className="rounded-xl bg-card border shadow-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{STAGE_LABELS[selected.stage]}</p>
                <h2 className="text-2xl font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  DOB {selected.dob} · {selected.product} · {selected.payer}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selected.doctorName} · {selected.doctorClinic}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.stage !== "doctor-request" && selected.stage !== "advanced" && (
                  <Button variant="outline" onClick={moveToDoctorRequest}>Move to Doctor Request</Button>
                )}
                <Button
                  onClick={advance}
                  disabled={!readyToAdvance}
                  className="bg-success text-success-foreground hover:bg-success/90 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Advance to Samantha
                </Button>
              </div>
            </div>
          </div>

          <PillarsChecklist patient={selected} onToggle={togglePillar} />
          <PathwayPanel patient={selected} onPathwayChange={setPathway} onItemToggle={togglePathwayItem} />
          <DoctorRequestPanel
            patient={selected}
            onMethodChange={setMethod}
            onAdvanceStep={advanceChase}
            onResetStep={resetChase}
            onPhaseChange={setPhase}
            onLogAccountability={logAccountability}
            onEscalate={escalate}
          />

          {/* Notes */}
          <section className="rounded-xl border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold mb-2">Notes</h2>
            <Textarea
              value={selected.notes}
              onChange={(e) => update(selected.id, { notes: e.target.value })}
              rows={3}
              placeholder="Working notes for this patient…"
            />
          </section>
        </section>
      </main>
    </div>
  );
};

function Stat({
  label, value, icon: Icon, accent,
}: {
  label: string; value: number; icon?: React.ElementType; accent?: "primary" | "warning" | "escalate" | "success";
}) {
  const accentMap = {
    primary: "bg-primary/15 text-primary-foreground",
    warning: "bg-warning/25 text-warning-foreground",
    escalate: "bg-escalate/25 text-escalate-foreground",
    success: "bg-success/20 text-success-foreground",
  } as const;
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 backdrop-blur p-3 flex items-center gap-3">
      {Icon && (
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent ? accentMap[accent] : "bg-white/10"}`}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default Index;
