import { ContentPageShell } from '@/components/v2/ContentPageShell'
import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'

export default function ManifestePage() {
  return (
    <ContentPageShell
      kicker="Notre manifeste"
      titre={
        <>
          Un carnet d&apos;adresses
          <br />
          <em className="font-serif italic text-or">
            qu&apos;on se passe entre copines.
          </em>
        </>
      }
      lead={
        <>
          Hilmy n&apos;est pas un annuaire. C&apos;est le geste qu&apos;on a toutes
          fait cent fois : murmurer le nom d&apos;une coiffeuse qu&apos;on adore, d&apos;une
          ostéopathe qui a sauvé nos lombaires, d&apos;un resto où on se retrouve
          entre copines — et le faire à grande échelle, sans perdre sa chaleur.
        </>
      }
    >
      <div className="max-w-3xl space-y-14">
        <section>
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Ce qu&apos;on croit</span>
          </div>
          <h2 className="mt-4 font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light text-vert">
            Une recommandation vaut cent publicités.
          </h2>
          <p className="mt-5 text-[15px] leading-[1.8] text-texte">
            Quand une copine te dit «&nbsp;va chez elle, elle fait des miracles&nbsp;»,
            tu y vas les yeux fermés. Ce geste-là, c&apos;est la promesse de Hilmy&nbsp;:
            des adresses vraies, testées, approuvées par des femmes qu&apos;on écoute
            parce qu&apos;elles nous ressemblent.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Pour qui</span>
          </div>
          <h2 className="mt-4 font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light text-vert">
            100 % femmes, des deux côtés du carnet.
          </h2>
          <p className="mt-5 text-[15px] leading-[1.8] text-texte">
            Hilmy s&apos;adresse aux femmes — utilisatrices et prestataires. C&apos;est
            notre règle d&apos;or, notre ligne éditoriale, notre garantie de
            confiance. Ici on parle entre soi, on se recommande ce qu&apos;on a
            vraiment aimé, on signale ce qui ne va pas sans se sentir jugée.
          </p>
          <p className="mt-4 text-[15px] leading-[1.8] text-texte">
            Cinq pays pour commencer&nbsp;: Suisse, France, Belgique, Luxembourg,
            Monaco. Francophonie proche, géographie d&apos;amies qui se rendent
            visite un weekend sur deux.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Nos trois promesses</span>
          </div>
          <ul className="mt-6 space-y-6 text-[15px] leading-[1.8] text-texte">
            <li className="flex gap-5">
              <span className="shrink-0 font-serif text-3xl italic text-or">
                01
              </span>
              <div>
                <p className="font-serif text-[18px] italic text-vert">
                  Pas de commission sur tes prestations.
                </p>
                <p className="mt-1 text-texte-sec">
                  Ta fiche prestataire fonctionne par abonnement plat (3
                  formules dès 19€/mois). Ce que ta cliente te paie, tu le
                  gardes en entier. On ne prend rien sur tes prestations.
                </p>
              </div>
            </li>
            <li className="flex gap-5">
              <span className="shrink-0 font-serif text-3xl italic text-or">
                02
              </span>
              <div>
                <p className="font-serif text-[18px] italic text-vert">
                  Pas de pub tierce.
                </p>
                <p className="mt-1 text-texte-sec">
                  Aucune marque extérieure ne s&apos;affiche dans le carnet.
                  Les seules mises en avant sont éditoriales (Sélection Hilmy,
                  Voix de la semaine) ou intégrées aux paliers prestataires —
                  jamais d&apos;achat publicitaire externe.
                </p>
              </div>
            </li>
            <li className="flex gap-5">
              <span className="shrink-0 font-serif text-3xl italic text-or">
                03
              </span>
              <div>
                <p className="font-serif text-[18px] italic text-vert">
                  Zéro compromis.
                </p>
                <p className="mt-1 text-texte-sec">
                  Chaque fiche passe entre les mains de la team Hilmy avant
                  d&apos;être visible. Si ça ne tient pas la route, ça ne passe
                  pas. C&apos;est notre seul filtre, et il ne bougera pas.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="rounded-sm border border-or/20 bg-blanc p-8 md:p-12">
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Envie d&apos;y être ?</span>
          </div>
          <p className="mt-4 font-serif text-[20px] italic leading-[1.5] text-vert md:text-[24px]">
            Les meilleures adresses, entre copines.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              Créer mon compte
              <span className="text-or-light" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/onboarding/prestataire"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-or px-7 text-[12px] font-medium tracking-[0.22em] text-or-deep uppercase transition-all hover:bg-or/10"
            >
              Devenir prestataire
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}
