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
import {
  resolveHcpcs,
  PRIMARY_INSURANCE_OPTIONS,
  SERVING_OPTIONS,
  type PrimaryInsurance,
  type Serving,
  type ProductId,
  type ResolvedProduct,
} from "@/lib/hcpcRules";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  patient: Patient;
  onUniversalToggle: (id: keyof Patient["insurance"] extends never ? string : string, checked: boolean) => void;
  onCodeChange: (codeId: ProductCodeId, patch: Partial<ProductCodeState>) => void;
  onMedicaidToggle: (v: boolean) => void;
  onServingChange: (v: Serving) => void;
  onPrimaryInsuranceChange: (v: PrimaryInsurance) => void;
}

const STATUS_META: Record<CodeStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending review", className: "bg-muted text-muted-foreground", icon: Clock },
  clear: { label: "Clear · no auth", className: "bg-success/15 text-success", icon: CheckCircle2 },
  "auth-required": { label: "Auth required", className: "bg-warning/20 text-warning-foreground", icon: Clock },
  "auth-approved": { label: "Auth approved", className: "bg-success/15 text-success", icon: ShieldCheck },
  blocker: { label: "Blocker · escalate", className: "bg-escalate/15 text-escalate", icon: ShieldAlert },
};

// Map resolver ProductId → existing ProductCodeId used for state tracking
const PRODUCT_TO_CODE_ID: Record<ProductId, ProductCodeId> = {
  monitor: "cgm-monitor",
  sensors: "cgm-sensors",
  insulin_pump: "pump",
  infusion_set: "infusion-sets",
  cartridge: "cartridges",
};

// Grouped insurance options (must match labels in PRIMARY_INSURANCE_OPTIONS)
const INSURANCE_GROUPS: { label: string; options: PrimaryInsurance[] }[] = [
  { label: "Fidelis", options: ["Fidelis Medicaid", "Fidelis Low-Cost", "Fidelis Commercial", "Fidelis Medicare"] },
  { label: "Anthem BCBS", options: ["Anthem BCBS Medicare", "Anthem BCBS Commercial", "Anthem BCBS Medicaid (JLJ)", "Anthem BCBS Low-Cost (JLJ)"] },
  { label: "BCBS Regional", options: ["Horizon BCBS", "BCBS TN", "BCBS FL", "BCBS WY"] },
  { label: "United", options: ["United Medicare", "United Medicaid", "United Commercial", "United Low-Cost"] },
  { label: "Aetna", options: ["Aetna Medicare", "Aetna Commercial"] },
  { label: "Government", options: ["Medicare A&B", "Medicaid", "NYSHIP"] },
  { label: "Other", options: ["Cigna", "Humana", "Wellcare", "Midlands Choice", "MagnaCare", "UMR", "Oregon Care"] },
];

export function InsurancePanel({
  patient,
  onUniversalToggle,
  onCodeChange,
  onMedicaidToggle,
  onServingChange,
  onPrimaryInsuranceChange,
}: Props) {
  const ins = patient.insurance ?? EMPTY_INSURANCE;
  const universalDone = Object.values(ins.universal).every(Boolean);
  const universalCount = Object.values(ins.universal).filter(Boolean).length;
  const outcome = deriveInsuranceOutcome(ins);

  const serving = patient.serving || "";
  const primaryInsurance = patient.primaryInsurance || "";
  const resolved: ResolvedProduct[] = resolveHcpcs(primaryInsurance || null, serving || null);
  const dropdownsReady = !!serving && !!primaryInsurance;

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

      {/* Required dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border bg-muted/20">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Serving <span className="text-escalate">*</span>
          </label>
          <Select value={serving} onValueChange={(v) => onServingChange(v as Serving)}>
            <SelectTrigger className="mt-1 h-9 bg-background">
              <SelectValue placeholder="Select serving…" />
            </SelectTrigger>
            <SelectContent>
              {SERVING_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Primary Insurance <span className="text-escalate">*</span>
          </label>
          <Select value={primaryInsurance} onValueChange={(v) => onPrimaryInsuranceChange(v as PrimaryInsurance)}>
            <SelectTrigger className="mt-1 h-9 bg-background">
              <SelectValue placeholder="Select primary insurance…" />
            </SelectTrigger>
            <SelectContent>
              {INSURANCE_GROUPS.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <h3 className="text-sm font-semibold">Codes for {serving || "patient"}</h3>

        {!dropdownsReady && (
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select Serving and Primary Insurance to load the codes for this patient.
            </p>
          </div>
        )}

        {dropdownsReady && resolved.map((r) => {
          const codeId = PRODUCT_TO_CODE_ID[r.product];
          const meta = PRODUCT_CODES.find((c) => c.id === codeId);
          if (!meta) return null;
          const state = ins.codes[codeId] ?? { status: "pending" as CodeStatus };
          return (
            <CodeCard
              key={codeId}
              meta={meta}
              resolved={r}
              state={state}
              universalDone={universalDone}
              onChange={(patch) => onCodeChange(codeId, patch)}
            />
          );
        })}
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
  meta: typeof PRODUCT_CODES[number];
  resolved: ResolvedProduct;
  state: ProductCodeState;
  universalDone: boolean;
  onChange: (patch: Partial<ProductCodeState>) => void;
}

function CodeCard({ meta, resolved, state, universalDone, onChange }: CardProps) {
  const statusMeta = STATUS_META[state.status ?? "pending"];
  const Icon = statusMeta.icon;
  const billsToMedicaid = resolved.billsTo === "medicaid";

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {meta.cadence}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{meta.group}</span>
          </div>
          <h4 className="text-sm font-semibold">{meta.name}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs font-mono text-muted-foreground">HCPCS · {resolved.hcpc}</p>
            {billsToMedicaid && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground">
                Bills to Medicaid
              </span>
            )}
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium", statusMeta.className)}>
          <Icon className="h-3 w-3" /> {statusMeta.label}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3 italic">{meta.billingNote}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatusButton current={state.status} target="clear" disabled={!universalDone} onClick={() => onChange({ status: "clear" })}>
          Clear
        </StatusButton>
        <StatusButton current={state.status} target="auth-required" disabled={!universalDone} onClick={() => onChange({ status: "auth-required", authSubmittedAt: new Date().toISOString() })}>
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
