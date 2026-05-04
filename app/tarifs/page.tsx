import type { Metadata } from 'next'
import { PageShell } from '@/components/v2/PageShell'
import { WizardSection } from './_components/WizardSection'
import { LieuPricing } from './_components/LieuPricing'

export const metadata: Metadata = {
  title: 'Tarifs · Hilmy — La team des bonnes adresses',
  description:
    "L'annuaire prestataires femmes francophones en Suisse, France, Belgique. Trois formules pour visibilité et bonnes adresses entre copines.",
}

// 6 catégories Sélection Hilmy — décision Jiji batch 3.2 Q6 :
// distinct des 9 PLACE_CATEGORIES, n'inclut PAS Boutiques / Spas /
// Santé qui concurrenceraient l'annuaire prestataires femmes (notre ADN).
// Une SELECTION_HILMY_CATEGORIES distincte sera créée dans un batch
// futur (form de soumission lieux contraint à ces 6).
const SELECTION_HILMY_CATEGORIES = [
  'Restos & cafés',
  'Salons de thé',
  'Hébergements',
  'Lieux culturels',
  'Sport & nature',
  'Sorties enfants',
]

const POURQUOI_ITEMS = [
  {
    num: '01',
    title: 'Entre nous',
    body:
      "Les copines se recommandent entre elles. C'est plus fort qu'un avis Google : c'est de la confiance qui circule.",
  },
  {
    num: '02',
    title: 'Du trafic qui se transforme',
    body:
      'Les copines cherchent activement les bonnes adresses pour elles, leurs sœurs, leurs amies.',
  },
  {
    num: '03',
    title: "Tu n'es pas seule là-dedans",
    body:
      "Onboarding accompagné, support direct. Tu écris, on te répond. La team, c'est aussi ça.",
  },
]

const DIALOGUE_QA = [
  {
    q: 'Et si ça marche pas pour moi ?',
    a: (
      <>
        Tu résilies en deux clics depuis ton dashboard.{' '}
        <em className="not-italic font-medium text-vert">
          Pas de mauvaise surprise, pas de petit caractère.
        </em>{' '}
        Ta fiche reste visible jusqu'à la fin de ta période payée, tes données sont
        conservées si tu veux revenir un jour.
      </>
    ),
  },
  {
    q: "Pourquoi l'annuaire est réservé aux femmes ?",
    a: (
      <>
        Parce que c'est{' '}
        <em className="not-italic font-medium text-vert">notre ADN</em>. Hilmy donne
        une vitrine aux femmes prestataires francophones, et on tient à cette promesse.
        Pour les lieux, on accueille tout le monde dans 6 catégories choisies — pour
        ne pas concurrencer nos prestataires.
      </>
    ),
  },
  {
    q: "Je n'ai pas de site, c'est gênant ?",
    a: (
      <>
        Pas du tout.{' '}
        <em className="not-italic font-medium text-vert">
          Beaucoup de prestataires n'ont que leur fiche Hilmy + leur Instagram, ça
          suffit largement.
        </em>{' '}
        Hilmy peut même être ton seul canal de visibilité.
      </>
    ),
  },
  {
    q: 'Combien de temps avant que ma fiche soit en ligne ?',
    a: (
      <>
        Tu paies, tu reçois un email de bienvenue dans la minute avec le lien pour
        créer ta fiche.{' '}
        <em className="not-italic font-medium text-vert">
          On valide ton profil sous 24h, et tu es dans la team.
        </em>
      </>
    ),
  },
]

// TODO accessibilité — couleur or (#C9A961) sur fond crème (#F5F0E6) :
// ratio de contraste ~2.0:1, sous le seuil WCAG AA (4.5:1). Décision
// Jiji batch 3.2 Q3 : porter à l'identique, le or-sur-crème est la
// signature visuelle systémique du site. Fix global tokens couleur
// dans un batch design dédié, pas un patch silencieux ici.

export default function TarifsPage() {
  return (
    <PageShell navVariant="solid">
      <div className="scroll-smooth">
        {/* HERO */}
        <section className="overflow-hidden px-6 py-28 text-center md:px-20 md:py-32">
          <div className="mx-auto max-w-[780px]">
            <span className="mb-7 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
              Tarifs Hilmy
            </span>
            <h1 className="mb-7 font-serif text-[clamp(44px,6.5vw,80px)] font-light leading-[1.05] tracking-tight">
              Ce que tu fais avec amour mérite{' '}
              <em className="font-normal italic text-or">d'être vu</em>.
            </h1>
            <p className="mx-auto mb-11 max-w-[540px] text-[19px] leading-relaxed text-texte-sec">
              Visibilité, entraide, bonnes adresses entre copines. Trouve ta place dans la team Hilmy.
            </p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <a
                href="#audience"
                className="inline-block rounded-full bg-vert px-8 py-4 text-[15px] font-medium text-creme transition-all hover:-translate-y-0.5 hover:bg-vert/90 hover:shadow-[0_8px_24px_rgba(15,61,46,0.18)]"
              >
                Trouver ma formule
              </a>
              <a
                href="#lieux"
                className="inline-block rounded-full border border-vert bg-transparent px-8 py-4 text-[15px] font-medium text-vert transition-all hover:bg-vert hover:text-creme"
              >
                Je tiens un lieu
              </a>
            </div>
            <div className="mt-16 flex justify-center opacity-60">
              <span aria-hidden className="block h-px w-20 bg-or" />
            </div>
          </div>
        </section>

        {/* AUDIENCE SELECTOR */}
        <section
          id="audience"
          className="bg-[#f0e3d0] px-6 py-20 scroll-mt-24 md:px-20"
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <span className="mb-4 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
                D'abord, dis-nous
              </span>
              <h2 className="font-serif text-[clamp(32px,4.5vw,48px)] font-light leading-tight tracking-tight">
                Tu es <em className="italic text-or">qui</em> dans l'histoire ?
              </h2>
            </div>

            <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 md:grid-cols-2">
              <a
                href="#wizard"
                className="group relative overflow-hidden rounded-3xl border border-vert/8 bg-white p-10 text-left transition-all duration-300 hover:-translate-y-1 hover:border-or hover:shadow-[0_16px_40px_rgba(15,61,46,0.08)]"
                aria-label="Je suis prestataire — trouver ma formule"
              >
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-creme-deep font-serif text-[22px] text-vert">
                  P
                </span>
                <h3 className="mb-2 font-serif text-2xl font-normal text-vert">
                  Je suis prestataire
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-texte-sec">
                  Coiffeuse, ostéo, coach, traiteur, avocate, conseillère de marque… Tu
                  as ta pratique, tu veux que les copines te trouvent.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-vert">
                  Trouver ma formule
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </a>

              <a
                href="#lieux"
                className="group relative overflow-hidden rounded-3xl border border-vert/8 bg-white p-10 text-left transition-all duration-300 hover:-translate-y-1 hover:border-or hover:shadow-[0_16px_40px_rgba(15,61,46,0.08)]"
                aria-label="Je tiens un lieu — découvrir Sélection Hilmy"
              >
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-vert font-serif text-[22px] text-or">
                  L
                </span>
                <h3 className="mb-2 font-serif text-2xl font-normal text-vert">
                  Je tiens un lieu
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-texte-sec">
                  Café, resto, hôtel, librairie, espace culturel, sortie enfants, lieu
                  nature. Tu veux apparaître dans les recos de la team.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-vert">
                  Découvrir Sélection Hilmy
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* WIZARD GUIDÉ */}
        <section id="wizard" className="bg-creme py-24 scroll-mt-24 md:py-28">
          <div className="mx-auto mb-14 max-w-[680px] px-6 text-center md:px-20">
            <span className="mb-4 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
              Pour les prestataires
            </span>
            <h2 className="mb-4 font-serif text-[clamp(32px,4.5vw,48px)] font-light leading-tight tracking-tight">
              On te trouve <em className="italic text-or">la bonne formule</em> en 30 secondes.
            </h2>
            <p className="text-[17px] leading-relaxed text-texte-sec">
              Trois questions, une recommandation. Pas de calcul, pas de comparaison.
            </p>
          </div>

          <WizardSection />
        </section>

        {/* CTA STRIP 1 */}
        <section className="bg-creme-deep px-6 py-16 text-center md:px-20">
          <div className="mx-auto max-w-[1200px]">
            <h3 className="mb-7 font-serif text-[clamp(26px,3.5vw,36px)] font-light leading-tight text-vert">
              Tu tiens un lieu plutôt qu'une pratique ?{' '}
              <em className="italic text-or">On t'attend aussi.</em>
            </h3>
            <a
              href="#lieux"
              className="inline-block rounded-full bg-vert px-8 py-4 text-[15px] font-medium text-creme transition-all hover:-translate-y-0.5 hover:bg-vert/90 hover:shadow-[0_8px_24px_rgba(15,61,46,0.18)]"
            >
              Découvrir Sélection Hilmy
            </a>
          </div>
        </section>

        {/* SECTION LIEUX */}
        <section
          id="lieux"
          className="px-6 py-24 scroll-mt-24 md:px-20 md:py-28"
          style={{
            background:
              'linear-gradient(180deg, #f0e3d0 0%, #ebe3d2 100%)',
          }}
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <span className="mb-4 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
                Pour les lieux
              </span>
              <h2 className="mb-4 font-serif text-[clamp(32px,4.5vw,48px)] font-light leading-tight tracking-tight">
                Apparaître dans les <em className="italic text-or">recos</em> de la team.
              </h2>
              <p className="text-[17px] leading-relaxed text-texte-sec">
                Café, resto, hôtel, librairie, espace culturel, sortie enfants, lieu
                nature : Sélection Hilmy te met en avant auprès des francophones qui
                cherchent les bonnes adresses.
              </p>
            </div>

            {/* Bon à savoir */}
            <div className="mx-auto mb-12 max-w-[760px] rounded-[20px] border-l-[3px] border-or bg-white p-9 shadow-[0_8px_24px_rgba(15,61,46,0.04)]">
              <strong className="font-serif text-[17px] font-normal text-vert">
                Bon à savoir.
              </strong>
              <p className="mt-2 text-[15px] leading-relaxed text-texte-sec">
                L'annuaire prestataires reste exclusivement féminin, c'est notre ADN.
                Pour les recommandations de lieux, on accueille tous les établissements
                peu importe la direction, dans 6 catégories soigneusement choisies :
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SELECTION_HILMY_CATEGORIES.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-creme px-3.5 py-1.5 text-xs font-medium text-vert"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <LieuPricing />
          </div>
        </section>

        {/* POURQUOI HILMY */}
        <section className="bg-white px-6 py-24 md:px-20 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <span className="mb-4 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
                Pourquoi Hilmy
              </span>
              <h2 className="font-serif text-[clamp(32px,4.5vw,48px)] font-light leading-tight tracking-tight">
                Pas du corporate. <em className="italic text-or">Une team.</em>
              </h2>
            </div>

            <div className="mx-auto mt-14 grid max-w-[1000px] grid-cols-1 gap-12 md:grid-cols-3">
              {POURQUOI_ITEMS.map((item) => (
                <div key={item.num} className="pt-2">
                  <p
                    aria-hidden
                    className="mb-4 font-serif text-5xl font-light leading-none text-or"
                  >
                    {item.num}
                  </p>
                  <h3 className="mb-3 font-serif text-[22px] font-normal leading-tight text-vert">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-texte-sec">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-3.5">
              <a
                href="#wizard"
                className="inline-block rounded-full bg-vert px-8 py-4 text-[15px] font-medium text-creme transition-all hover:-translate-y-0.5 hover:bg-vert/90 hover:shadow-[0_8px_24px_rgba(15,61,46,0.18)]"
              >
                Trouver ma formule
              </a>
              <a
                href="#lieux"
                className="inline-block rounded-full border border-vert bg-transparent px-8 py-4 text-[15px] font-medium text-vert transition-all hover:bg-vert hover:text-creme"
              >
                Je tiens un lieu
              </a>
            </div>
          </div>
        </section>

        {/* DIALOGUE / FAQ */}
        <section className="bg-[#f0e3d0] px-6 py-24 md:px-20 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <span className="mb-4 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or">
                Tu te demandes quoi
              </span>
              <h2 className="font-serif text-[clamp(32px,4.5vw,48px)] font-light leading-tight tracking-tight">
                On te répond <em className="italic text-or">franchement</em>.
              </h2>
            </div>

            <div className="mx-auto grid max-w-[760px] gap-6">
              {DIALOGUE_QA.map(({ q, a }, i) => (
                <div key={i} className="rounded-[20px] bg-white p-8">
                  <p className="mb-3.5 flex items-start gap-3.5 font-serif text-[19px] font-normal leading-snug text-vert">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-or font-sans text-sm font-semibold text-vert"
                    >
                      ?
                    </span>
                    {q}
                  </p>
                  <p className="pl-[46px] text-[15px] leading-relaxed text-texte-sec">{a}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-wrap justify-center gap-3.5">
              <a
                href="#wizard"
                className="inline-block rounded-full bg-vert px-8 py-4 text-[15px] font-medium text-creme transition-all hover:-translate-y-0.5 hover:bg-vert/90 hover:shadow-[0_8px_24px_rgba(15,61,46,0.18)]"
              >
                Choisir ma formule
              </a>
              <a
                href="mailto:hilmy.io@hotmail.com"
                className="inline-block rounded-full border border-vert bg-transparent px-8 py-4 text-[15px] font-medium text-vert transition-all hover:bg-vert hover:text-creme"
              >
                Poser ma question
              </a>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden bg-vert px-6 py-28 text-center text-creme md:px-20 md:py-32">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-or to-transparent"
          />
          <div className="mx-auto max-w-[1200px]">
            <span className="mb-6 inline-block text-[13px] font-medium uppercase tracking-[.28em] text-or-light">
              Pour finir
            </span>
            <h2 className="mb-5 font-serif text-[clamp(36px,5vw,52px)] font-light leading-tight tracking-tight text-creme">
              Prête à <em className="italic text-or">rejoindre la team</em> ?
            </h2>
            <p className="mx-auto mb-12 max-w-[560px] text-[18px] leading-relaxed text-creme/75">
              Choisis ta formule, paie en ligne, ta fiche est validée sous 24h. C'est aussi simple que ça.
            </p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <a
                href="#wizard"
                className="inline-block rounded-full bg-or px-8 py-4 text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
              >
                Je choisis ma formule
              </a>
              <a
                href="#lieux"
                className="inline-block rounded-full border border-creme bg-transparent px-8 py-4 text-[15px] font-medium text-creme transition-all hover:bg-creme hover:text-vert"
              >
                Je veux ma fiche lieu
              </a>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
