"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  categoryLabel,
  type Profile,
  type ProfileStatus,
} from "@/lib/constants";

type TabKey = ProfileStatus | "reports";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvés" },
  { key: "rejected", label: "Refusés" },
  { key: "reports", label: "Signalements" },
];

interface ReportRow {
  id: string;
  profile_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export function AdminDashboard() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    if (tab === "reports") {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      setReports((data as ReportRow[]) ?? []);
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      setProfiles((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateStatus(id: string, status: ProfileStatus, notes?: string) {
    const supabase = createClient();
    const payload: Record<string, string> = { status };
    if (notes !== undefined) payload.admin_notes = notes;

    await supabase.from("profiles").update(payload).eq("id", id);
    setRejectingId(null);
    setRejectNotes("");
    fetchData();
  }

  return (
    <div>
      <div className="flex gap-1 bg-card-white rounded-xl border border-border-subtle p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? "bg-green-deep text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">
          Chargement...
        </div>
      ) : tab === "reports" ? (
        <ReportsTable entries={reports} />
      ) : (
        <ProfilesTable
          profiles={profiles}
          tab={tab}
          onApprove={(id) => updateStatus(id, "approved")}
          onReject={(id) => {
            if (rejectingId === id) {
              updateStatus(id, "rejected", rejectNotes);
            } else {
              setRejectingId(id);
              setRejectNotes("");
            }
          }}
          rejectingId={rejectingId}
          rejectNotes={rejectNotes}
          setRejectNotes={setRejectNotes}
          onCancelReject={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}

function ReportsTable({ entries }: { entries: ReportRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
        <p className="text-muted-foreground">Aucun signalement.</p>
      </div>
    );
  }

  return (
    <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-cream/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Profil signalé
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Motif
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-3 text-foreground font-mono text-xs">
                  {e.profile_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.reason}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfilesTable({
  profiles,
  tab,
  onApprove,
  onReject,
  rejectingId,
  rejectNotes,
  setRejectNotes,
  onCancelReject,
}: {
  profiles: Profile[];
  tab: ProfileStatus;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  rejectingId: string | null;
  rejectNotes: string;
  setRejectNotes: (v: string) => void;
  onCancelReject: () => void;
}) {
  if (profiles.length === 0) {
    return (
      <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
        <p className="text-muted-foreground">Aucun profil dans cette catégorie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((p) => (
        <div
          key={p.id}
          className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-medium text-foreground">
                  {p.nom}
                </h3>
                <Badge variant="outline" className="border-border-subtle text-xs">
                  {categoryLabel(p.categorie)}
                </Badge>
                <Badge variant="outline" className="border-border-subtle text-xs">
                  {p.ville}{p.pays ? `, ${p.pays}` : ""}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                WhatsApp : {p.whatsapp}
                {p.instagram && ` · Instagram : ${p.instagram}`}
              </p>
              {p.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {p.description}
                </p>
              )}
              {p.photos && p.photos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {p.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border-subtle" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {p.slug && (
                <a href={`/prestataire/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline">
                  Voir le profil
                </a>
              )}
              {tab !== "approved" && (
                <Button size="sm" onClick={() => onApprove(p.id)} className="rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90 text-xs">
                  Approuver
                </Button>
              )}
              {tab !== "rejected" && (
                <Button variant="outline" size="sm" onClick={() => onReject(p.id)} className="rounded-full border-border-subtle text-xs">
                  Refuser
                </Button>
              )}
            </div>
          </div>

          {rejectingId === p.id && (
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Motif du refus (optionnel)..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                className="bg-cream border-border-subtle resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onReject(p.id)} className="rounded-full text-xs">
                  Confirmer le refus
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelReject} className="rounded-full text-xs">
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
