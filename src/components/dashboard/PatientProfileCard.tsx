import type { Patient } from "@/lib/workflow";
import { CalendarDays, IdCard, User, Stethoscope, ShieldCheck } from "lucide-react";

interface Props {
  patient: Patient;
  /** Show Serving + Primary Insurance fields (used on Authorizations tab). */
  showInsuranceContext?: boolean;
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="text-sm font-medium truncate" title={value || "—"}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export function PatientProfileCard({ patient, showInsuranceContext = false }: Props) {
  const hasMember2 = !!patient.memberId2 && patient.memberId2.trim().length > 0;

  // Compute responsive grid columns based on optional fields
  const baseCount = 3 + (hasMember2 ? 1 : 0) + (showInsuranceContext ? 2 : 0);
  const lgCols =
    baseCount >= 6 ? "lg:grid-cols-6"
    : baseCount === 5 ? "lg:grid-cols-5"
    : baseCount === 4 ? "lg:grid-cols-4"
    : "lg:grid-cols-3";

  return (
    <div className="rounded-xl bg-card border shadow-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Patient Profile
      </p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${lgCols} gap-4`}>
        <Field icon={<User className="h-4 w-4" />} label="Name" value={patient.name} />
        <Field icon={<CalendarDays className="h-4 w-4" />} label="Date of Birth" value={patient.dob} />
        <Field
          icon={<IdCard className="h-4 w-4" />}
          label="Member ID"
          value={patient.memberId1 ?? ""}
        />
        {hasMember2 && (
          <Field
            icon={<IdCard className="h-4 w-4" />}
            label="Member ID 2"
            value={patient.memberId2 ?? ""}
          />
        )}
        {showInsuranceContext && (
          <>
            <Field
              icon={<Stethoscope className="h-4 w-4" />}
              label="Serving"
              value={patient.serving ?? ""}
            />
            <Field
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Primary Insurance"
              value={patient.primaryInsurance ?? ""}
            />
          </>
        )}
      </div>
    </div>
  );
}
