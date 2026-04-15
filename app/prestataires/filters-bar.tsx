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
import { categoryLabel } from "@/lib/constants";

interface FiltersBarProps {
  categories: string[];
  pays: string[];
  currentCategorie?: string;
  currentPays?: string;
  currentVille?: string;
  currentQ?: string;
}

export function FiltersBar({
  categories,
  pays,
  currentCategorie,
  currentPays,
  currentVille,
  currentQ,
}: FiltersBarProps) {
  const router = useRouter();

  function navigate(updates: Record<string, string | null>) {
    const current: Record<string, string | undefined> = {
      categorie: currentCategorie,
      pays: currentPays,
      ville: currentVille,
      q: currentQ,
    };

    for (const [key, value] of Object.entries(updates)) {
      current[key] = value && value !== "all" ? value : undefined;
    }

    const params = new URLSearchParams();
    Object.entries(current).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    router.push(`/prestataires?${params.toString()}`);
  }

  return (
    <div className="bg-card-white border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Chercher une pépite..."
            defaultValue={currentQ ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate({ q: (e.target as HTMLInputElement).value || null });
              }
            }}
            className="bg-cream border-border-subtle"
          />
          <Select
            value={currentCategorie ?? "all"}
            onValueChange={(v) => navigate({ categorie: v })}
          >
            <SelectTrigger className="bg-cream border-border-subtle">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(c)}
                </SelectItem>
              ))}
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
              {pays.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
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
