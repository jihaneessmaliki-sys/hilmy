import { createAdminClient } from '@/lib/supabase/admin'
import {
  createSeasonalCategory,
  updateSeasonalCategory,
  deleteSeasonalCategory,
} from './actions'
import type { EventSeasonalCategory } from '@/lib/supabase/types'

/**
 * Admin page /admin/event-seasonal-categories (mig 44 + 45).
 *
 * Liste les catégories saisonnières (Ramadan, Aïd, Saint-Valentin, Saison
 * mariage, Noël…) qui alimentent les filtres de la page /événements.
 * Form de création + form édition par row + delete. Layout admin gate
 * déjà via app/admin/layout.tsx (is_admin).
 *
 * Pas d'optimistic UI — on revalidate la page après chaque action via
 * revalidatePath() côté server action. Sufficient pour un panel admin
 * faible-trafic (Jiji = unique admin actuelle).
 */

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  // Format requis par <input type="date"> : YYYY-MM-DD
  return new Date(iso).toISOString().slice(0, 10)
}

export default async function SeasonalWindowsAdminPage() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('event_seasonal_categories')
    .select('id, slug, label, emoji, starts_at, ends_at, is_active, created_at, updated_at')
    .order('starts_at', { ascending: true, nullsFirst: false })

  const categories = (data ?? []) as EventSeasonalCategory[]

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Référentiel · catégories saisonnières</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          Catégories saisonnières.
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-[1.6] text-texte-sec">
          Ramadan, Aïd, Saint-Valentin, Saison mariage, Noël… Ces catégories
          alimentent les filtres de la page /événements. Slug en kebab-case
          (distinct du snake_case des events lieux).
        </p>
      </header>

      {error && (
        <p className="mt-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
          {error.message}
        </p>
      )}

      {/* Form création */}
      <div className="mt-8 rounded-sm border border-or/20 bg-blanc p-6">
        <h2 className="font-serif text-xl font-light text-vert">+ Nouvelle catégorie</h2>
        <form action={createSeasonalCategory} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] tracking-[0.18em] text-texte-sec uppercase">Slug</span>
            <input
              name="slug"
              required
              pattern="[a-z0-9\-]+"
              placeholder="black-friday"
              className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-3 py-2 text-[14px] text-vert"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] tracking-[0.18em] text-texte-sec uppercase">Label</span>
            <input
              name="label"
              required
              placeholder="Black Friday"
              className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-3 py-2 text-[14px] text-vert"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] tracking-[0.18em] text-texte-sec uppercase">Emoji</span>
            <input
              name="emoji"
              maxLength={8}
              defaultValue="🎁"
              className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-3 py-2 text-[14px] text-vert"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] tracking-[0.18em] text-texte-sec uppercase">Début</span>
              <input
                type="date"
                name="starts_at"
                className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-3 py-2 text-[14px] text-vert"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] tracking-[0.18em] text-texte-sec uppercase">Fin</span>
              <input
                type="date"
                name="ends_at"
                className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-3 py-2 text-[14px] text-vert"
              />
            </label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              Créer
            </button>
          </div>
        </form>
      </div>

      {/* Liste + édition par row */}
      <div className="mt-10">
        <h2 className="font-serif text-xl font-light text-vert">
          Catégories existantes ({categories.length})
        </h2>
        <ul className="mt-4 grid gap-3">
          {categories.map((c) => (
            <li
              key={c.id}
              className={`rounded-sm border bg-blanc p-5 ${
                c.is_active ? 'border-or/20' : 'border-or/10 opacity-60'
              }`}
            >
              <form action={updateSeasonalCategory} className="grid gap-3 md:grid-cols-[auto_1fr_auto_auto_auto_auto]">
                <input type="hidden" name="id" value={c.id} />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tracking-[0.18em] text-texte-sec uppercase">{c.slug}</span>
                </div>
                <label className="block">
                  <span className="block text-[10px] tracking-[0.18em] text-texte-sec uppercase">Label</span>
                  <input
                    name="label"
                    required
                    defaultValue={c.label}
                    className="mt-1 w-full rounded-sm border border-or/30 bg-creme px-2 py-1.5 text-[13px] text-vert"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] tracking-[0.18em] text-texte-sec uppercase">Emoji</span>
                  <input
                    name="emoji"
                    maxLength={8}
                    defaultValue={c.emoji}
                    className="mt-1 w-20 rounded-sm border border-or/30 bg-creme px-2 py-1.5 text-center text-[14px] text-vert"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] tracking-[0.18em] text-texte-sec uppercase">Début</span>
                  <input
                    type="date"
                    name="starts_at"
                    defaultValue={toDateInputValue(c.starts_at)}
                    className="mt-1 rounded-sm border border-or/30 bg-creme px-2 py-1.5 text-[13px] text-vert"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] tracking-[0.18em] text-texte-sec uppercase">Fin</span>
                  <input
                    type="date"
                    name="ends_at"
                    defaultValue={toDateInputValue(c.ends_at)}
                    className="mt-1 rounded-sm border border-or/30 bg-creme px-2 py-1.5 text-[13px] text-vert"
                  />
                </label>
                <label className="flex items-center gap-2 self-end pb-1.5">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={c.is_active}
                    className="h-4 w-4 cursor-pointer accent-or"
                  />
                  <span className="text-[11px] tracking-[0.18em] text-texte-sec uppercase">Actif</span>
                </label>
                <div className="flex items-center gap-2 md:col-span-6 md:justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-full bg-vert px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
              <form action={deleteSeasonalCategory} className="mt-2 flex justify-end">
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="text-[10px] tracking-[0.22em] text-red-900 uppercase hover:text-red-700"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="rounded-sm border border-dashed border-or/30 p-6 text-center text-[13px] italic text-texte-sec">
              Aucune catégorie. Crée la première ci-dessus.
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
