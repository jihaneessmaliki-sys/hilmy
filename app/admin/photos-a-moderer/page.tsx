import { createAdminClient } from '@/lib/supabase/admin'
import { PhotoRow } from './photoRowClient'

type Status = 'published' | 'flagged' | 'removed'

type PhotoRecord = {
  id: string
  user_id: string
  status: string
  storage_path: string
  moderation_motif: string | null
  created_at: string
  place: { name: string; slug: string | null } | { name: string; slug: string | null }[] | null
}

export default async function PhotosAModererPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'flagged' } = await searchParams
  // Protection auth assurée par app/admin/layout.tsx. service_role pour
  // bypass la RLS SELECT (connecté-only en PR-b ; ici on voit tous statuts).
  const supabase = createAdminClient()

  // NB : pas d'embed user_profiles ici. place_user_photos.user_id pointe sur
  // auth.users (pas de FK vers user_profiles) → PostgREST ne sait pas résoudre
  // l'embed. On récupère les prénoms dans une requête séparée (même pattern que
  // la fiche /recommandation/[slug]).
  const { data, error } = await supabase
    .from('place_user_photos')
    .select(
      `id, user_id, status, storage_path, moderation_motif, created_at, place:places ( name, slug )`,
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (data ?? []) as PhotoRecord[]

  // Prénoms des autrices, en batch.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const prenomById = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('user_profiles')
      .select('user_id, prenom')
      .in('user_id', userIds)
    for (const p of (profs ?? []) as Array<{ user_id: string; prenom: string }>) {
      prenomById.set(p.user_id, p.prenom)
    }
  }

  // URL publique calculée côté serveur depuis le storage_path (path SANS user_id).
  const photos = rows.map((r) => ({
    id: r.id,
    status: r.status,
    moderation_motif: r.moderation_motif,
    created_at: r.created_at,
    place: Array.isArray(r.place) ? (r.place[0] ?? null) : r.place,
    prenom: prenomById.get(r.user_id) ?? 'Une copine',
    url: supabase.storage.from('recommendation-photos').getPublicUrl(r.storage_path).data
      .publicUrl,
  }))

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Modération · photos de lieux</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {status === 'flagged' && 'Photos signalées.'}
          {status === 'published' && 'Toutes les photos.'}
          {status === 'removed' && 'Photos retirées.'}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: 'flagged', label: 'Signalées' },
            { key: 'published', label: 'Publiées' },
            { key: 'removed', label: 'Retirées' },
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
        {photos.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              {status === 'flagged'
                ? 'Rien à modérer — la communauté est sage.'
                : 'Aucune photo dans cette file.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <PhotoRow key={p.id} photo={p} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
