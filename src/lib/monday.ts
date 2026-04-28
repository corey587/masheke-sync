// Monday.com webhook stub — POSTs patient/stage events to a user-configured webhook URL.
// Uses no-cors mode (fire-and-forget) so it works against Monday integration recipes / Zapier-style hooks.

import { Patient } from "./workflow";

const WEBHOOK_KEY = "mm.monday.webhook";

export function getWebhookUrl(): string {
  return localStorage.getItem(WEBHOOK_KEY) ?? "";
}

export function setWebhookUrl(url: string) {
  localStorage.setItem(WEBHOOK_KEY, url);
}

export type SyncEvent =
  | "patient.updated"
  | "stage.changed"
  | "escalation.triggered"
  | "patient.advanced";

export async function syncToMonday(event: SyncEvent, patient: Patient) {
  const url = getWebhookUrl();
  if (!url) return { ok: false, reason: "no-webhook" as const };

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    source: "masheke-dashboard",
    patient: {
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      product: patient.product,
      payer: patient.payer,
      doctor: patient.doctorName,
      clinic: patient.doctorClinic,
      contact_method: patient.contactMethod,
      pathway: patient.pathwayId,
      stage: patient.stage,
      owner: patient.owner,
      chase_step: patient.chaseStep,
      fax_phase: patient.faxPhase,
      accountability: patient.accountability,
      pillars_complete: Object.values(patient.pillars).every(Boolean),
      notes: patient.notes,
    },
  };

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: true as const };
  } catch (err) {
    console.error("Monday sync failed", err);
    return { ok: false, reason: "fetch-error" as const };
  }
}
