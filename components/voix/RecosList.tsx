"use client";

import { useState } from "react";
import Link from "next/link";
import type { VoixPublicReco } from "@/lib/supabase/types";

type Filter = "tout" | "lieux" | "pros";

const TABS: { id: Filter; label: string }[] = [
  { id: "tout", label: "Tout" },
  { id: "lieux", label: "Lieux" },
  { id: "pros", label: "Pros" },
];

function emptyMessage(filter: Filter, prenom: string): string {
  if (filter === "lieux") return `${prenom} n'a pas encore partagé de lieu.`;
  if (filter === "pros") return `${prenom} n'a pas encore partagé de pro.`;
  return `${prenom} n'a pas encore partagé de reco. Repasse dans quelques jours.`;
}

export function RecosList({
  recos,
  prenom,
}: {
  recos: VoixPublicReco[];
  prenom: string;
}) {
  const [filter, setFilter] = useState<Filter>("tout");

  const filtered = recos.filter((r) => {
    if (filter === "tout") return true;
    if (filter === "lieux") return r.type === "place";
    return r.type === "prestataire";
  });

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrer les recos"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={
              filter === t.id
                ? "rounded-full border border-vert bg-vert px-4 py-2 text-xs font-semibold text-creme"
                : "rounded-full border border-creme-deep bg-transparent px-4 py-2 text-xs font-medium text-texte-sec transition hover:border-or"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm italic text-texte-sec">
          {emptyMessage(filter, prenom)}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filtered.map((reco) => (
            <RecoCard key={reco.id} reco={reco} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecoCard({ reco }: { reco: VoixPublicReco }) {
  // VoixPublicReco a des place_*/profile_* nullable. La query
  // getRecosByVoix filtre déjà les rows non-rendables, donc à ce
  // point on a au moins l'id et le nom — mais on garde les fallbacks
  // pour la robustesse (ex: slug NULL côté DB).
  const isPlace = reco.type === "place";
  const id = isPlace ? reco.place_id : reco.profile_id;
  const name = isPlace ? reco.place_name : reco.profile_nom;
  const city = isPlace ? reco.place_city : reco.profile_ville;
  const slug = isPlace ? reco.place_slug : reco.profile_slug;

  // Belt-and-suspenders : la vue voix_hilmy_recos_public filtre déjà
  // les rows avec comment vide ou null (mig 27), mais on re-vérifie
  // ici contre un futur appelant qui contournerait la vue.
  if (!id || !name || !reco.comment?.trim()) return null;

  // Fallback sur l'id si slug est NULL (cas observé en DB sur les
  // rows pré-V2 qui n'avaient pas de slug généré).
  // Routes canoniques (vérifiées le 29/04/2026) :
  //   place       → /recommandation/{slug|id}
  //   prestataire → /prestataire-v2/{slug|id}
  // Les deux redirect vers /auth/signup si pas connectée — comportement
  // cohérent avec le reste du site, accepté pour Phase 1.
  const target = slug ?? id;
  const href = isPlace
    ? `/recommandation/${target}`
    : `/prestataire-v2/${target}`;

  return (
    <li>
      <Link
        href={href}
        className="block rounded-2xl border border-creme-deep bg-blanc transition hover:border-or"
      >
        <div className="flex h-32 items-center justify-center rounded-t-2xl bg-gradient-to-br from-vert to-vert-soft text-3xl font-semibold text-or">
          ❋
        </div>
        <div className="p-4">
          <h3 className="font-serif text-base font-semibold text-vert">
            {name}
          </h3>
          {city && <p className="mt-0.5 text-xs text-texte-sec">{city}</p>}
          <blockquote className="mt-3 border-l-2 border-or pl-3 text-sm italic leading-relaxed text-texte">
            «&nbsp;{reco.comment}&nbsp;»
          </blockquote>
        </div>
      </Link>
    </li>
  );
}
