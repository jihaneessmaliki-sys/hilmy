'use client'

/**
 * Champ « réduction copines Hilmy » factorisé (mig 62).
 * Utilisé par les formulaires d'inscription prestataire (manuel, google) et
 * l'édition de fiche dans le dashboard. Composant contrôlé, self-contained
 * (n'utilise pas la classe `.line` page-scopée — styles Tailwind inline pour
 * marcher partout, signup ET dashboard).
 *
 * Source de vérité = `pct` côté parent : `pct != null` ⟺ case cochée.
 *  - cocher  → pct = 10 (1ère valeur sensée)
 *  - décocher → pct = null + note vidée
 * Les valeurs autorisées (5/10/15/20) reflètent le CHECK SQL côté DB.
 */

const PCT_OPTIONS = [5, 10, 15, 20] as const

export function CopineDiscountField({
  pct,
  note,
  onPctChange,
  onNoteChange,
}: {
  pct: number | null
  note: string
  onPctChange: (pct: number | null) => void
  onNoteChange: (note: string) => void
}) {
  const enabled = pct != null

  return (
    <div className="rounded-sm border border-or/20 bg-creme-soft p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              onPctChange(10)
            } else {
              onPctChange(null)
              onNoteChange('')
            }
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-vert"
        />
        <span>
          <span className="block text-[15px] text-vert">
            Je fais un prix aux copines Hilmy 🌸
          </span>
          <span className="block text-[12px] text-texte-sec/80">
            Une réduction pour les utilisatrices de l&apos;app. Tu peux la
            changer ou la retirer quand tu veux.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-4 pl-7">
          <label className="flex flex-col gap-2">
            <span className="overline text-or">Réduction</span>
            <select
              value={pct ?? 10}
              onChange={(e) => onPctChange(Number(e.target.value))}
              className="w-28 border-0 border-b border-or/20 bg-transparent py-2 text-[15px] text-vert outline-none focus:border-or"
            >
              {PCT_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  −{v}%
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="overline text-or">Conditions (optionnel)</span>
            <input
              type="text"
              maxLength={120}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ex : sur les prestations à partir de 80 CHF"
              className="w-full border-0 border-b border-or/20 bg-transparent py-2 text-[15px] text-vert outline-none placeholder:text-texte-sec/50 focus:border-or"
            />
          </label>
        </div>
      )}
    </div>
  )
}
