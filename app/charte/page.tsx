import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Shield, Users, Heart } from "lucide-react";

export default function ChartePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <span className="inline-block text-[13px] font-medium uppercase tracking-[0.15em] text-gold">
            Ce qui nous lie
          </span>
          <h1 className="mt-4 font-heading text-3xl md:text-5xl font-medium text-green-deep leading-tight">
            Notre charte de confiance
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Hilmy n&apos;est pas un site comme les autres. C&apos;est un endroit
            où on se fait confiance, entre femmes. Cette charte, c&apos;est notre
            pacte. Simple, clair, sincère.
          </p>

          <div className="mt-12 space-y-10">
            <CharteItem
              icon={<Shield className="w-6 h-6" />}
              title="Confiance"
            >
              <p>
                Chaque profil de prestataire est vérifié par notre équipe avant
                d&apos;être visible. On ne laisse rien passer au hasard.
              </p>
              <p className="mt-2">
                Si quelque chose te semble louche, tu peux signaler un profil en
                un clic. On traite chaque signalement avec sérieux et discrétion.
              </p>
            </CharteItem>

            <CharteItem
              icon={<Users className="w-6 h-6" />}
              title="Entre femmes"
            >
              <p>
                Hilmy est un cercle de femmes. En t&apos;inscrivant — que ce soit
                comme utilisatrice ou comme prestataire — tu confirmes sur
                l&apos;honneur être une femme.
              </p>
              <p className="mt-2">
                C&apos;est notre force : ici, on est entre nous. On se comprend,
                on se soutient, on se recommande les yeux fermés.
              </p>
            </CharteItem>

            <CharteItem
              icon={<Heart className="w-6 h-6" />}
              title="Bienveillance"
            >
              <p>
                On se passe les bonnes adresses, pas les coups bas. Pas de
                commentaires méchants, pas de jugements. Si on n&apos;est pas
                satisfaite d&apos;une prestation, on en parle avec respect.
              </p>
              <p className="mt-2">
                Les prestataires mettent leur talent et leur coeur dans ce
                qu&apos;elles font. On honore ça.
              </p>
            </CharteItem>

            <CharteItem
              icon={null}
              title="Gratuité"
            >
              <p>
                Hilmy est gratuit. Pour les utilisatrices comme pour les
                prestataires. On ne prend pas de commission, on ne vend pas tes
                données. On est là pour connecter les filles entre elles, point.
              </p>
            </CharteItem>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CharteItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        {icon && <div className="text-gold">{icon}</div>}
        <h2 className="font-heading text-xl font-medium text-green-deep">
          {title}
        </h2>
      </div>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
