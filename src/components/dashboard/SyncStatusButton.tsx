import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subscribeSyncStatus, clearSyncError, type SyncStatus } from "@/lib/mondayWrite";

interface Props {
  onForceSync?: () => void | Promise<void>;
}

export function SyncStatusButton({ onForceSync }: Props) {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeSyncStatus((s, err) => {
    setStatus(s);
    setError(err);
  }), []);

  const config = {
    synced: {
      label: "Synced to Monday · click to refresh",
      icon: <Check className="h-4 w-4" />,
      className: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    syncing: {
      label: "Syncing to Monday…",
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    error: {
      label: "Not synced — click to retry",
      icon: <AlertTriangle className="h-4 w-4" />,
      className: "bg-red-600 hover:bg-red-700 text-white",
    },
  }[status];

  const handleClick = () => {
    if (status === "error") clearSyncError();
    onForceSync?.();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        title={error ?? config.label}
        className={cn(
          "gap-2 shadow-elevate rounded-full px-5 h-11 transition-colors",
          config.className,
        )}
      >
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
        {status === "synced" && <RefreshCw className="h-3.5 w-3.5 opacity-80" />}
      </Button>
    </div>
  );
}
