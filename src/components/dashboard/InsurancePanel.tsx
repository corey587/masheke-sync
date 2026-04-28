import {
  Patient,
  UNIVERSAL_CHECKS,
  PRODUCT_CODES,
  ProductCodeId,
  ProductCodeState,
  CodeStatus,
  EMPTY_INSURANCE,
  deriveInsuranceOutcome,
} from "@/lib/workflow";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  patient: Patient;
  onUniversalToggle: (id: keyof Patient["insurance"] extends never ? string : string, checked: boolean) => void;
  onCodeChange: (codeId: ProductCodeId, patch: Partial<ProductCodeState>) => void;
  onMedicaidToggle: (v: boolean) => void;
}

const STATUS_META: Record<CodeStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending review", className: "bg-muted text-muted-foreground", icon: Clock },
  clear: { label: "Clear · no auth", className: "bg-success/15 text-success", icon: CheckCircle2 },
  "auth-required": { label: "Auth required", className: "bg-warning/20 text-warning-foreground", icon: Clock },
  "auth-approved": { label: "Auth approved", className: "bg-success/15 text-success", icon: ShieldCheck },
  blocker: { label: "Blocker · escalate", className: "bg-escalate/15 text-escalate", icon: ShieldAlert },
};

export function InsurancePanel({ patient, onUniversalToggle, onCodeChange, onMedicaidToggle }: Props) {
  const ins = patient.insurance ?? EMPTY_INSURANCE;
  const universalDone = Object.values(ins.universal).every(Boolean);
  const universalCount = Object.values(ins.universal).filter(Boolean).length;
  const applicable = PRODUCT_CODES.filter((c) => c.appliesTo.includes(patient.product));
  const outcome = deriveInsuranceOutcome(ins);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Insurance & Benefits · Samantha</h2>
          <p className="text-xs text-muted-foreground">
            Validate every code being served before scheduling welcome call.
          </p>
        </div>
        <OutcomeBadge outcome={outcome} />
      </div>

      {/* Universal checks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Universal checks</h3>
            <p className="text-[11px] text-muted-foreground">All four required for every patient before proceeding.</p>
          </div>
          <span
            className={cn(
              "text-[10px] font-mono px-2 py-1 rounded",
              universalDone ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {universalCount}/4 confirmed
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {UNIVERSAL_CHECKS.map((check, i) => (
            <label
              key={check.id}
              className="flex gap-3 p-3 rounded-lg border bg-background hover:border-primary/30 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={!!ins.universal[check.id]}
                onCheckedChange={(c) => onUniversalToggle(check.id, !!c)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">CHECK 0{i + 1}</span>
                  <span className="font-medium text-sm">{check.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{check.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Medicaid toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div>
          <p className="text-sm font-medium">Patient has Medicaid</p>
          <p className="text-[11px] text-muted-foreground">
            If on, infusion sets and cartridges must be billed to Medicaid (not the managed Medicaid plan).
          </p>
        </div>
        <Switch checked={!!patient.hasMedicaid} onCheckedChange={onMedicaidToggle} />
      </div>

      {/* Product cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Codes for {patient.product}</h3>
        {applicable.map((code) => {
          const state = ins.codes[code.id] ?? { status: "pending" as CodeStatus };
          return (
            <CodeCard
              key={code.id}
              code={code}
              state={state}
              hasMedicaid={!!patient.hasMedicaid}
              universalDone={universalDone}
              onChange={(patch) => onCodeChange(code.id, patch)}
            />
          );
        })}
        {applicable.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No coded products to validate for this profile.
          </p>
        )}
      </div>
    </section>
  );
}

function OutcomeBadge({ outcome }: { outcome: ReturnType<typeof deriveInsuranceOutcome> }) {
  if (outcome === "all-clear") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> All clear · ready for welcome call
      </span>
    );
  }
  if (outcome === "auth-required") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/20 text-warning-foreground">
        <Clock className="h-3.5 w-3.5" /> Auth required · daily tracking
      </span>
    );
  }
  if (outcome === "blocker") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-escalate/15 text-escalate">
        <AlertTriangle className="h-3.5 w-3.5" /> Blocker · escalate to Janelle
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      <Clock className="h-3.5 w-3.5" /> Validation in progress
    </span>
  );
}

interface CardProps {
  code: typeof PRODUCT_CODES[number];
  state: ProductCodeState;
  hasMedicaid: boolean;
  universalDone: boolean;
  onChange: (patch: Partial<ProductCodeState>) => void;
}

function CodeCard({ code, state, hasMedicaid, universalDone, onChange }: CardProps) {
  const meta = STATUS_META[state.status ?? "pending"];
  const Icon = meta.icon;
  const needsCodeChoice = !!code.codeOptions && !state.selectedCode;
  const medicaidWarn = hasMedicaid && (code.id === "infusion-sets" || code.id === "cartridges");

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {code.cadence}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{code.group}</span>
          </div>
          <h4 className="text-sm font-semibold">{code.name}</h4>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">HCPCS · {code.hcpcs}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium", meta.className)}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
      </div>

      {code.codeOptions && (
        <div className="mb-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Confirmed code for this payer
          </label>
          <Select value={state.selectedCode ?? ""} onValueChange={(v) => onChange({ selectedCode: v })}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select code variant…" />
            </SelectTrigger>
            <SelectContent>
              {code.codeOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {medicaidWarn && (
        <div className="mb-3 rounded-md bg-warning/15 border-l-4 border-warning p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-warning-foreground">Medicaid routing</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bill to Medicaid directly — not the managed Medicaid plan.
          </p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mb-3 italic">{code.billingNote}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatusButton current={state.status} target="clear" disabled={!universalDone || needsCodeChoice} onClick={() => onChange({ status: "clear" })}>
          Clear
        </StatusButton>
        <StatusButton current={state.status} target="auth-required" disabled={!universalDone || needsCodeChoice} onClick={() => onChange({ status: "auth-required", authSubmittedAt: new Date().toISOString() })}>
          Auth needed
        </StatusButton>
        <StatusButton current={state.status} target="auth-approved" disabled={state.status !== "auth-required" && state.status !== "auth-approved"} onClick={() => onChange({ status: "auth-approved", authApprovedAt: new Date().toISOString() })}>
          Auth approved
        </StatusButton>
        <StatusButton current={state.status} target="blocker" onClick={() => onChange({ status: "blocker" })}>
          Blocker
        </StatusButton>
        <StatusButton current={state.status} target="pending" onClick={() => onChange({ status: "pending" })}>
          Reset
        </StatusButton>
      </div>

      {state.status === "auth-required" && state.authSubmittedAt && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Submitted {new Date(state.authSubmittedAt).toLocaleDateString()} · track daily until approved.
        </p>
      )}
    </div>
  );
}

function StatusButton({
  current, target, onClick, disabled, children,
}: {
  current: CodeStatus;
  target: CodeStatus;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const active = current === target;
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="text-xs h-8"
    >
      {children}
    </Button>
  );
}
