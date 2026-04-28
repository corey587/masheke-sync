import {
  Patient,
  UNIVERSAL_CHECKS,
  PRODUCT_CODES,
  ProductCodeId,
  ProductCodeState,
  CodeStatus,
  EMPTY_INSURANCE,
  deriveInsuranceOutcome,
  AuthChoice,
  SosChoice,
} from "@/lib/workflow";
import {
  resolveHcpcs,
  SERVING_OPTIONS,
  PRODUCT_LABELS,
  type PrimaryInsurance,
  type Serving,
  type ProductId,
  type ResolvedProduct,
} from "@/lib/hcpcRules";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Copy, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  patient: Patient;
  onUniversalToggle: (id: string, checked: boolean) => void;
  onCodeChange: (codeId: ProductCodeId, patch: Partial<ProductCodeState>) => void;
  onServingChange: (v: Serving) => void;
  onPrimaryInsuranceChange: (v: PrimaryInsurance) => void;
}

// Map resolver ProductId → existing ProductCodeId used for state tracking
const PRODUCT_TO_CODE_ID: Record<ProductId, ProductCodeId> = {
  monitor: "cgm-monitor",
  sensors: "cgm-sensors",
  insulin_pump: "pump",
  infusion_set: "infusion-sets",
  cartridge: "cartridges",
};

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
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold">Universal checks</h3>
            <p className="text-[11px] text-muted-foreground">
              Fill these out from a phone call to the insurance payer. All three required before proceeding.
            </p>
          </div>
          <span
            className={cn(
              "text-[10px] font-mono px-2 py-1 rounded",
              universalDone ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {universalCount}/3 confirmed
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
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

      {/* Monday output */}
      {dropdownsReady && (
        <MondayOutput patient={patient} resolved={resolved} />
      )}
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
  const billsToMedicaid = resolved.billsTo === "medicaid";
  const auth: AuthChoice = state.auth ?? "";
  const sos: SosChoice = state.sos ?? "";

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
        <StatusPill auth={auth} sos={sos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Auth
          </label>
          <Select
            value={auth}
            onValueChange={(v) => onChange({ auth: v as AuthChoice })}
            disabled={!universalDone}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select auth status…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not-required">Not Required</SelectItem>
              <SelectItem value="required">Required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Same or Similar
          </label>
          <Select
            value={sos}
            onValueChange={(v) => onChange({ sos: v as SosChoice })}
            disabled={!universalDone}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select SoS status…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clear">Clear</SelectItem>
              <SelectItem value="not-clear">Not Clear</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ auth, sos }: { auth: AuthChoice; sos: SosChoice }) {
  if (!auth || !sos) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-muted text-muted-foreground">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  if (sos === "not-clear") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-escalate/15 text-escalate">
        <ShieldAlert className="h-3 w-3" /> SoS not clear
      </span>
    );
  }
  if (auth === "required") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-warning/20 text-warning-foreground">
        <Clock className="h-3 w-3" /> Auth required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-success/15 text-success">
      <ShieldCheck className="h-3 w-3" /> Clear
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Monday.com output — copy/paste helper
// ─────────────────────────────────────────────────────────────────────

function deriveMondayColumns(patient: Patient, resolved: ResolvedProduct[]) {
  const ins = patient.insurance ?? EMPTY_INSURANCE;
  const u = ins.universal;

  // 1) Active/Network
  const activeNetwork = u["in-network"] && u["active"] ? "Active/In-network" : "Stuck";

  // 2) DME Benefits
  const dmeBenefits = u["dme-benefits"] ? "Yes" : "Partial / No";

  // Per-product states (only those active for this serving)
  const productStates = resolved.map((r) => {
    const codeId = PRODUCT_TO_CODE_ID[r.product];
    const s = ins.codes[codeId];
    return {
      product: r.product,
      label: PRODUCT_LABELS[r.product],
      auth: (s?.auth ?? "") as AuthChoice,
      sos: (s?.sos ?? "") as SosChoice,
    };
  });

  const allFilled = productStates.every((p) => p.auth && p.sos);

  // 3) Auth
  const anyAuthRequired = productStates.some((p) => p.auth === "required");
  const auth = !allFilled ? "—" : anyAuthRequired ? "Auths Required" : "No Auths Required";

  // 4) SoS
  const anyNotClear = productStates.some((p) => p.sos === "not-clear");
  const sosCol = !allFilled ? "—" : anyNotClear ? "Partial / Not Clear" : "All Clear";

  // 5) Not Clear Products
  const notClearProducts = productStates
    .filter((p) => p.sos === "not-clear")
    .map((p) => p.label)
    .join(", ");

  return {
    activeNetwork,
    dmeBenefits,
    auth,
    sos: sosCol,
    notClearProducts: notClearProducts || "—",
    allFilled,
  };
}

function MondayOutput({ patient, resolved }: { patient: Patient; resolved: ResolvedProduct[] }) {
  const cols = deriveMondayColumns(patient, resolved);

  const rows: { key: string; label: string; value: string }[] = [
    { key: "active", label: "Active/Network", value: cols.activeNetwork },
    { key: "dme", label: "DME Benefits", value: cols.dmeBenefits },
    { key: "auth", label: "Auth", value: cols.auth },
    { key: "sos", label: "SoS", value: cols.sos },
    { key: "notclear", label: "Not Clear Products", value: cols.notClearProducts },
  ];

  const copyAll = () => {
    const text = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied Monday columns to clipboard");
  };

  const copyOne = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`Copied "${label}"`);
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Monday board · copy/paste</h3>
          <p className="text-[11px] text-muted-foreground">
            Paste each value into the matching column on the Monday board.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={copyAll} className="gap-2">
          <Copy className="h-3.5 w-3.5" /> Copy all
        </Button>
      </div>

      <div className="rounded-md border bg-background divide-y">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[180px_1fr_auto] items-center gap-3 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {r.label}
            </span>
            <span className="font-mono text-sm">{r.value}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => copyOne(r.label, r.value)}
              disabled={r.value === "—"}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {!cols.allFilled && (
        <p className="text-[11px] text-muted-foreground italic">
          Fill Auth + SoS for every product to compute Auth and SoS columns.
        </p>
      )}
    </div>
  );
}
