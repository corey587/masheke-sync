// Medically Modern · Medical Evaluation Workflow data model
// Source of truth for stages, pillars, coverage pathways, and chase protocols.

export type StageId =
  | "intake"
  | "evaluation"
  | "doctor-request"
  | "re-evaluation"
  | "advanced"
  | "escalated";

export type PathwayId =
  | "cgm-p1"
  | "cgm-p2"
  | "pump-p1"
  | "pump-p2"
  | "pump-p3"
  | "pump-p4"
  | "pump-p5"
  | "supplies-s1";

export type ContactMethod = "parachute" | "fax";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

export interface Pathway {
  id: PathwayId;
  group: "CGM" | "Pump" | "Supplies";
  code: string;
  name: string;
  tag: string;
  items: ChecklistItem[];
  language?: string;
}

export const PILLARS: ChecklistItem[] = [
  {
    id: "rx",
    label: "Valid Prescription",
    hint: "Signed Rx for each product (CGM and/or pump). Signature stamps not acceptable.",
  },
  {
    id: "records",
    label: "Clinical Notes / Medical Records",
    hint: "Office visit encounter date within the last 6 months.",
  },
  {
    id: "diagnosis",
    label: "Diabetes Diagnosis",
    hint: "Valid ICD-10 code (E10.x, E11.x, etc.) in the clinical records.",
  },
];

export const PATHWAYS: Pathway[] = [
  {
    id: "cgm-p1",
    group: "CGM",
    code: "P1",
    name: "Insulin Use",
    tag: "CGM · INSULIN",
    items: [
      { id: "insulin-evidence", label: "Evidence of insulin use found in records" },
      { id: "insulin-meds", label: "Insulin brand listed in medication list (any)" },
    ],
    language:
      "Any mention of insulin use qualifies — MDI, basal, bolus, insulin pen/pump references, or medication list entries (Humalog, Lantus, Novolog, Tresiba, etc.).",
  },
  {
    id: "cgm-p2",
    group: "CGM",
    code: "P2",
    name: "Hypoglycemia History",
    tag: "CGM · HYPOGLYCEMIA",
    items: [
      { id: "hypo-event", label: "≥1 Level 2 hypoglycemic event documented (<54 mg/dL)" },
      { id: "hypo-adjustments", label: "≥2 treatment plan adjustments referenced" },
    ],
    language:
      "Patient experienced at least one Level 2 hypoglycemic event (<54 mg/dL) despite modifications. Notes should reference at least two adjustment attempts.",
  },
  {
    id: "pump-p1",
    group: "Pump",
    code: "P1",
    name: "1st Pump · MDI > 6 Months",
    tag: "PUMP · FIRST TIME",
    items: [
      { id: "mdi-current", label: "First-time pump user on MDI (3+ injections/day)" },
      { id: "mdi-6mo", label: "MDI documented for ≥6 months" },
      { id: "cgm-use", label: "CGM use documented in notes" },
      { id: "dsme", label: "Diabetes self-management education completed" },
      { id: "bg-justification", label: "≥1 BG justification (A1c>7%, recurrent hypo, variability, dawn phenomenon, severe excursions)" },
    ],
    language:
      "Notes must show comprehensive diabetes education completed and document that injections are not adequately controlling blood sugars.",
  },
  {
    id: "pump-p2",
    group: "Pump",
    code: "P2",
    name: "1st Pump · MDI < 6 Months",
    tag: "PUMP · FIRST TIME",
    items: [
      { id: "p1-met", label: "All P1 requirements met" },
      { id: "lmn-signed", label: "Letter of Medical Necessity (LMN) obtained and signed" },
      { id: "lmn-language", label: "LMN explicitly states life-threatening need" },
    ],
    language:
      "Separate signed LMN required — clinical notes alone insufficient. LMN must use explicit life-threatening language.",
  },
  {
    id: "pump-p3",
    group: "Pump",
    code: "P3",
    name: "OOW Pump Replacement",
    tag: "PUMP · REPLACEMENT",
    items: [
      { id: "oow", label: "Pump confirmed beyond 4-year warranty" },
      { id: "malfunction", label: "Malfunction reason documented" },
      { id: "no-repair", label: "Documentation pump cannot be repaired or safely continued" },
    ],
    language:
      "Insurance replaces pumps every 4 years. Records must confirm out-of-warranty status and clinical reason current device cannot continue.",
  },
  {
    id: "pump-p4",
    group: "Pump",
    code: "P4",
    name: "New Insurance · In-Warranty Switch",
    tag: "PUMP · SPECIAL",
    items: [
      { id: "switched-plans", label: "Patient switched insurance plans" },
      { id: "no-history", label: "Existing pump does NOT appear in new payer history" },
      { id: "p1-rules", label: "Medical necessity built under first-time pump (P1) rules" },
    ],
    language:
      "Medically Modern special offering — if new payer has no record of an active pump, treat as new pump under first-time rules.",
  },
  {
    id: "pump-p5",
    group: "Pump",
    code: "P5",
    name: "Omnipod → Tandem Switch",
    tag: "PUMP · SWITCH",
    items: [
      { id: "on-omnipod", label: "Patient currently on Omnipod (pharmacy-only)" },
      { id: "switch-reason", label: "Clinical reason for switching to Tandem documented" },
    ],
    language:
      "Specific Omnipod-switch language requirements TBD — confirm with team. Omnipod is pharmacy-only; this covers patients moving to Tandem.",
  },
  {
    id: "supplies-s1",
    group: "Supplies",
    code: "S1",
    name: "Supplies Only",
    tag: "PUMP · SUPPLIES",
    items: [{ id: "established", label: "Patient already established on a pump" }],
    language: "Straightforward resupply — basic script and records sufficient.",
  },
];

export const STAGE_LABELS: Record<StageId, string> = {
  intake: "Intake",
  evaluation: "Stage 1 · Necessity Review",
  "doctor-request": "Stage 2 · Doctor Request",
  "re-evaluation": "Stage 3 · Re-evaluation",
  advanced: "Advanced → Samantha",
  escalated: "Escalated → Janelle",
};

// Chase protocols
export const PARACHUTE_STEPS = [
  { label: "Send request via Parachute Health", snoozeHrs: 0 },
  { label: "Snooze 48 hrs", snoozeHrs: 48 },
  { label: "Follow-up on Parachute confirming receipt", snoozeHrs: 0 },
  { label: "Snooze 48 hrs", snoozeHrs: 48 },
  { label: "Escalate to Janelle", snoozeHrs: 0, escalate: true },
];

export const FAX_PHASE1_STEPS = [
  { label: "Attempt 1 — send fax + call within 5 min", snoozeHrs: 0 },
  { label: "Attempt 2 (24 hrs later)", snoozeHrs: 24 },
  { label: "Attempt 3 (24 hrs later)", snoozeHrs: 24 },
  { label: "Escalate to Janelle", snoozeHrs: 0, escalate: true },
];

export const FAX_PHASE2_STEPS = [
  { label: "Snooze 72 hrs · prep documents", snoozeHrs: 72 },
  { label: "Call clinic — reference confirming person", snoozeHrs: 0 },
  { label: "Snooze 72 hrs · repeat call", snoozeHrs: 72 },
  { label: "Final call (72 hrs)", snoozeHrs: 72 },
  { label: "Escalate to Janelle", snoozeHrs: 0, escalate: true },
];

export interface AccountabilityLog {
  representativeName: string;
  representativeTitle: string;
  confirmedAt: string; // ISO
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  product: "CGM" | "Pump" | "Supplies" | "CGM + Pump";
  payer: string;
  doctorName: string;
  doctorClinic: string;
  contactMethod: ContactMethod;
  pathwayId?: PathwayId;
  stage: StageId;
  pillars: Record<string, boolean>;
  pathwayChecks: Record<string, boolean>;
  chaseStep: number;
  faxPhase: 1 | 2;
  accountability?: AccountabilityLog;
  notes: string;
  receivedAt: string; // ISO
  lastUpdated: string; // ISO
  owner: "Masheke" | "Janelle" | "Samantha";
}
