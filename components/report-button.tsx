"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export function ReportButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReport() {
    if (!reason.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("reports").insert({
      profile_id: profileId,
      reporter_id: user.id,
      reason: reason.trim(),
    });

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Merci, on a bien reçu ton signalement. On s&apos;en occupe.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
      >
        Signaler ce profil
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Dis-nous ce qui ne va pas..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="bg-cream border-border-subtle resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleReport}
          disabled={loading || !reason.trim()}
          className="rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90 text-xs"
        >
          {loading ? "..." : "Envoyer le signalement"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
          className="rounded-full text-xs"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
