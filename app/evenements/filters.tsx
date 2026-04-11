"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYS, EVENT_TYPES, eventTypeLabel } from "@/lib/constants";

interface Props {
  currentDate?: string;
  currentFormat?: string;
  currentPays?: string;
  currentVille?: string;
  currentType?: string;
}

export function EvenementsFilters({
  currentDate,
  currentFormat,
  currentPays,
  currentVille,
  currentType,
}: Props) {
  const router = useRouter();

  function navigate(updates: Record<string, string | null>) {
    const current: Record<string, string | undefined> = {
      date: currentDate,
      format: currentFormat,
      pays: currentPays,
      ville: currentVille,
      type: currentType,
    };

    for (const [key, value] of Object.entries(updates)) {
      current[key] = value && value !== "all" ? value : undefined;
    }

    const params = new URLSearchParams();
    Object.entries(current).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    router.push(`/evenements?${params.toString()}`);
  }

  const dateOptions = [
    { value: "all", label: "Tout" },
    { value: "semaine", label: "Cette semaine" },
    { value: "mois", label: "Ce mois-ci" },
    { value: "trimestre", label: "Les 3 prochains mois" },
  ];

  return (
    <div className="bg-card-white border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Select value={currentDate ?? "all"} onValueChange={(v) => navigate({ date: v })}>
            <SelectTrigger className="bg-cream border-border-subtle text-sm">
              <SelectValue placeholder="Quand" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currentFormat ?? "all"} onValueChange={(v) => navigate({ format: v })}>
            <SelectTrigger className="bg-cream border-border-subtle text-sm">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="presentiel">En présentiel</SelectItem>
              <SelectItem value="en_ligne">En ligne</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentPays ?? "all"} onValueChange={(v) => navigate({ pays: v })}>
            <SelectTrigger className="bg-cream border-border-subtle text-sm">
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {PAYS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Ville..."
            defaultValue={currentVille ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ ville: (e.target as HTMLInputElement).value || null });
            }}
            className="bg-cream border-border-subtle text-sm"
          />

          <Select value={currentType ?? "all"} onValueChange={(v) => navigate({ type: v })}>
            <SelectTrigger className="bg-cream border-border-subtle text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{eventTypeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
