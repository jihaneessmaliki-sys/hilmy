/**
 * Badge « réduction copines Hilmy » sur la fiche publique (mig 62).
 * Affiché uniquement quand la prestataire a renseigné un pourcentage.
 * Charte : carte vert (#0F3D2E) + accent or (#C9A961), texte crème.
 * Pas de mécanisme de claim côté web : la copine montre l'app en boutique.
 */
export function CopineDiscountBadge({
  pct,
  note,
}: {
  pct: number
  note?: string | null
}) {
  return (
    <div className="rounded-sm border border-or/40 bg-vert px-5 py-4">
      <p className="flex items-center gap-2 font-serif text-[17px] font-light text-creme">
        <span aria-hidden="true">🌸</span>
        <span>
          <span className="text-or">−{pct}%</span> pour les copines Hilmy
        </span>
      </p>
      {note?.trim() && (
        <p className="mt-2 text-[13px] leading-snug text-creme/80">{note.trim()}</p>
      )}
      <p className="mt-3 text-[12px] italic text-or-light">
        Montre l&apos;app Hilmy pour en profiter
      </p>
    </div>
  )
}
