import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'

// Aligné sur les 11 catégories DB (profiles.categorie CHECK constraint
// après migration 21_categorie_conseilleres.sql) + lib/mock-data.ts
// categoriesPrestataires + lib/constants.ts CATEGORIES_MAP.
// Le composant garde son nom historique "NineUniverses" pour ne pas
// casser les imports — rename optionnel à voir plus tard.
const universes = [
  { num: '01', slug: 'beaute', name: 'Beauté', sub: 'Coiffure, ongles, maquillage' },
  { num: '02', slug: 'bien-etre', name: 'Bien-être', sub: 'Spa, yoga, massages' },
  { num: '03', slug: 'sante-mentale', name: 'Santé mentale', sub: 'Coachs, thérapeutes, praticiennes' },
  { num: '04', slug: 'sport-nutrition', name: 'Sport & Nutrition', sub: 'Pilates, running, diététique' },
  { num: '05', slug: 'enfants-famille', name: 'Enfants & Famille', sub: 'Nounous, pédiatres, sage-femmes' },
  { num: '06', slug: 'maison', name: 'Maison', sub: 'Décoratrices, organisation, feng-shui' },
  { num: '07', slug: 'cuisine', name: 'Cuisine', sub: 'Cheffes à domicile, pâtissières' },
  { num: '08', slug: 'evenementiel', name: 'Événementiel', sub: 'Wedding planning, traiteurs' },
  { num: '09', slug: 'mode-style', name: 'Mode & Style', sub: 'Stylistes, couturières, relooking' },
  { num: '10', slug: 'business-juridique', name: 'Business & Juridique', sub: 'Coachs biz, avocates, fiscalistes' },
  { num: '11', slug: 'conseilleres-de-marque', name: 'Conseillères de marque', sub: 'VDI, ambassadrices de marque, vendeuses à domicile' },
]

export function NineUniverses() {
  return (
    <section className="bg-blanc py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-16 grid gap-10 md:grid-cols-2 md:gap-20">
            <SectionHeader
              number="03"
              kicker="ONZE UNIVERS"
              title={
                <>
                  Onze territoires,
                  <br />
                  une seule team.
                </>
              }
            />
            <p className="text-[14px] leading-[1.7] text-texte-sec md:pt-28">
              De la beauté à la justice, du bien-être à la cuisine. Tout ce que tu
              cherches, trouvé chez celles qui savent.
            </p>
          </div>
        </FadeInSection>

        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {universes.map((u, i) => (
            <FadeInSection key={u.num} delay={i * 0.04}>
              <article
                className={`flex h-56 flex-col justify-between rounded-sm p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-md cursor-pointer md:h-60 md:p-8 ${
                  i % 2 === 0 ? 'bg-creme-deep' : 'bg-creme'
                }`}
              >
                <div>
                  <span className="font-serif text-base font-thin text-or">{u.num}</span>
                </div>
                <div>
                  <h3 className="font-serif text-[22px] font-light leading-tight text-vert md:text-[26px]">
                    {u.name}
                  </h3>
                  <p className="mt-2 text-xs text-texte-sec">{u.sub}</p>
                </div>
              </article>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}
