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
import { PAYS } from "@/lib/constants";

interface Props {
  currentType?: string;
  currentPays?: string;
  currentVille?: string;
}

export function BonnesAdressesFilters({ currentType, currentPays, currentVille }: Props) {
  const router = useRouter();

  function navigate(updates: Record<string, string | null>) {
    const current: Record<string, string | undefined> = {
      type: currentType,
      pays: currentPays,
      ville: currentVille,
    };

    for (const [key, value] of Object.entries(updates)) {
      current[key] = value && value !== "all" ? value : undefined;
    }

    const params = new URLSearchParams();
    Object.entries(current).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    router.push(`/bonnes-adresses?${params.toString()}`);
  }

  return (
    <div className="bg-card-white border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            value={currentType ?? "all"}
            onValueChange={(v) => navigate({ type: v })}
          >
            <SelectTrigger className="bg-cream border-border-subtle">
              <SelectValue placeholder="Tout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="place">Lieux</SelectItem>
              <SelectItem value="prestataire">Prestataires</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={currentPays ?? "all"}
            onValueChange={(v) => navigate({ pays: v })}
          >
            <SelectTrigger className="bg-cream border-border-subtle">
              <SelectValue placeholder="Tous les pays" />
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
              if (e.key === "Enter") {
                navigate({ ville: (e.target as HTMLInputElement).value || null });
              }
            }}
            className="bg-cream border-border-subtle"
          />
        </div>
      </div>
    </div>
  );
}
