import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWebhookUrl, setWebhookUrl } from "@/lib/monday";
import { Settings2, Zap } from "lucide-react";
import { toast } from "sonner";

export function MondaySettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [hasUrl, setHasUrl] = useState(false);

  useEffect(() => {
    const u = getWebhookUrl();
    setUrl(u);
    setHasUrl(!!u);
  }, [open]);

  const save = () => {
    setWebhookUrl(url.trim());
    setHasUrl(!!url.trim());
    toast.success(url.trim() ? "Monday webhook saved" : "Monday webhook cleared");
    setOpen(false);
  };

  const test = async () => {
    if (!url.trim()) {
      toast.error("Enter a webhook URL first");
      return;
    }
    try {
      await fetch(url.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "test.ping", timestamp: new Date().toISOString(), source: "masheke-dashboard" }),
      });
      toast.success("Test ping sent — check your Monday board / Zap history");
    } catch {
      toast.error("Failed to reach webhook");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Monday sync
          <span className={`h-1.5 w-1.5 rounded-full ${hasUrl ? "bg-success" : "bg-muted-foreground"}`} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Monday.com Webhook</DialogTitle>
          <DialogDescription>
            Paste a Monday integration webhook URL (or a Zapier/Make hook bound to a Monday board).
            Every patient/stage change will POST a JSON event so Monday items stay in sync.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/…"
            />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Event payload</p>
            <code className="block text-[11px] leading-relaxed">
              {`{ event, timestamp, source, patient: { id, name, product, payer, doctor, pathway, stage, owner, ... } }`}
            </code>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={test}>Send test ping</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
