import { createAdminClient } from '@/lib/supabase/admin'
import { FicheRow } from './ficheRowClient'

type Status = 'pending' | 'approved' | 'rejected'

export default async function PrestatairesAValiderPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'pending' } = await searchParams
  // Protection auth assurée par app/admin/layout.tsx. On utilise le
  // service_role pour bypass les RLS SELECT qui cachent les lignes
  // non-`approved` aux non-owners — sans ça la file "pending" est
  // toujours vide pour l'admin.
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  const fiches = data ?? []

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Modération · fiches prestataires</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {status === 'pending' && 'À valider.'}
          {status === 'approved' && 'Déjà approuvées.'}
          {status === 'rejected' && 'Refusées.'}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: 'pending', label: 'En attente' },
            { key: 'approved', label: 'Approuvées' },
            { key: 'rejected', label: 'Refusées' },
          ] as const
        ).map((t) => {
          const active = status === t.key
          return (
            <a
              key={t.key}
              href={`?status=${t.key}`}
              className={`inline-flex items-center rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.22em] uppercase transition-colors ${
                active
                  ? 'bg-vert text-creme'
                  : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
              }`}
            >
              {t.label}
            </a>
          )
        })}
      </nav>

      {error && (
        <p className="mt-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[13px] text-red-900">
          {error.message}
        </p>
      )}

      <div className="mt-8">
        {fiches.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              {status === 'pending'
                ? 'La file est vide — bravo.'
                : 'Aucune fiche dans cette file.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {fiches.map((f) => (
              <FicheRow key={f.id} fiche={f} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
