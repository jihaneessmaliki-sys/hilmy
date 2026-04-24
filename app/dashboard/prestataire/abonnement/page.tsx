import { GoldLine } from '@/components/ui/GoldLine'
import { requirePrestataire } from '@/lib/supabase/session'

export default async function AbonnementPage() {
  const { prestataire } = await requirePrestataire()

  const actifDepuis = new Date(
    prestataire.approved_at ?? prestataire.created_at,
  ).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="px-6 py-12 md:px-12 md:py-16">
      {/* En-tête */}
      <div className="flex flex-col gap-6 border-b border-or/15 pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="overline text-or">Ton abonnement</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] font-light italic leading-[1.05] text-or">
            Plan Fondatrice
          </h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-or/40 bg-or/10 px-4 py-2 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-or" aria-hidden="true" />
          Actif depuis {actifDepuis}
        </span>
      </div>

      {/* Introduction voix Sara */}
      <div className="mt-10 max-w-2xl space-y-5">
        <p className="font-serif text-[17px] italic leading-[1.65] text-texte">
          L&apos;idée c&apos;est simple : aujourd&apos;hui Hilmy est 100 % gratuit
          pour toi. Tu crées ta fiche, tu récoltes tes avis, tu proposes tes
          événements — sans un centime.
        </p>
        <p className="text-[15px] leading-[1.7] text-texte">
          En rejoignant maintenant, tu fais partie des{' '}
          <em className="font-serif italic text-or-deep">Fondatrices</em> : les
          premières prestataires qui nous aident à bâtir le carnet. En échange,
          tu bénéficies d&apos;avantages exclusifs que les prochaines
          n&apos;auront pas.
        </p>
      </div>

      {/* Cards */}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {/* Card 1 — Inclus */}
        <div className="rounded-sm border border-or/20 bg-creme-soft p-8 md:p-10">
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">Plan Fondatrice</span>
          </div>
          <h2 className="mt-4 font-serif text-2xl font-light italic text-or-deep">
            Ce qui est inclus, toujours
          </h2>
          <ul className="mt-6 space-y-3 text-[14px] leading-[1.55] text-texte">
            {[
              'Ta fiche complète dans l\'annuaire',
              'Système d\'avis et réponses',
              'Création d\'événements',
              'Messagerie directe avec les copines',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-or/40 bg-blanc text-[11px] text-or"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card 2 — Premium */}
        <div className="relative overflow-hidden rounded-sm bg-vert p-8 text-creme md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-or/15 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Bientôt</span>
            </div>
            <h2 className="mt-4 font-serif text-2xl font-light italic text-or">
              Formule Premium
            </h2>
            <ul className="mt-6 space-y-3 text-[14px] leading-[1.55]">
              {[
                'Statistiques détaillées de ta fiche',
                'Mise en avant dans l\'annuaire',
                'Badge "Prestataire vérifiée"',
                'Prise de rendez-vous intégrée',
                'Galerie photo illimitée',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-or"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-or/25 pt-5 text-[13px] italic text-creme/80">
              En tant que Fondatrice, tu auras un tarif préférentiel quand ça
              sortira 🌸
            </p>
          </div>
        </div>
      </div>

      {/* Footer discret */}
      <p className="mt-12 text-center font-sans text-[12px] italic text-texte-sec">
        Ta fiche est gratuite à vie. Formule Premium annoncée par email aux
        Fondatrices en priorité.
      </p>
    </section>
  )
}
