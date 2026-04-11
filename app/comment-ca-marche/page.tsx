import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function CommentCaMarchePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <span className="inline-block text-[13px] font-medium uppercase tracking-[0.15em] text-gold">
            Mode d&apos;emploi
          </span>
          <h1 className="mt-4 font-heading text-3xl md:text-5xl font-medium text-green-deep leading-tight">
            Comment ça marche
          </h1>

          <div className="mt-12 space-y-16">
            {/* Utilisatrice */}
            <div>
              <h2 className="font-heading text-2xl font-medium text-green-deep mb-6">
                Tu cherches une prestataire ?
              </h2>
              <div className="space-y-8">
                <Step number="01" title="Inscris-toi">
                  Entre ton email, on t&apos;envoie un lien magique. Pas de mot
                  de passe, pas de prise de tête. Dis-nous juste ton prénom et
                  ta ville.
                </Step>
                <Step number="02" title="Explore l'annuaire">
                  Filtre par catégorie, par ville, ou cherche directement un nom.
                  Chaque profil est vérifié par notre équipe avant d&apos;apparaître.
                </Step>
                <Step number="03" title="Contacte-la directement">
                  Tu as trouvé ta perle ? Écris-lui sur WhatsApp ou Instagram.
                  C&apos;est direct, pas d&apos;intermédiaire.
                </Step>
              </div>
            </div>

            {/* Prestataire */}
            <div>
              <h2 className="font-heading text-2xl font-medium text-green-deep mb-6">
                Tu proposes un service ?
              </h2>
              <div className="space-y-8">
                <Step number="01" title="Crée ton profil">
                  Inscris-toi, raconte ton activité, ajoute tes photos et tes
                  coordonnées. Ça prend 5 minutes.
                </Step>
                <Step number="02" title="On valide">
                  Notre équipe vérifie chaque profil à la main. C&apos;est comme
                  ça qu&apos;on garde la confiance entre nous.
                </Step>
                <Step number="03" title="Les filles te trouvent">
                  Ton profil est visible dans l&apos;annuaire. Les filles te
                  contactent directement. C&apos;est gratuit.
                </Step>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row gap-4">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
            >
              Je rejoins les filles
            </Link>
            <Link
              href="/inscription-prestataire"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-medium border-[1.5px] border-green-deep text-green-deep hover:bg-green-deep/5 transition-colors"
            >
              Je propose mes services
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <span className="font-heading text-3xl font-medium text-gold shrink-0 w-12">
        {number}
      </span>
      <div>
        <h3 className="font-heading text-lg font-medium text-green-deep">
          {title}
        </h3>
        <p className="mt-1 text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
