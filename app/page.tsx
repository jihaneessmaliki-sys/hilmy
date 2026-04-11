import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  CATEGORIES,
  categoryLabel,
  CATEGORIES_DESCRIPTIONS,
} from "@/lib/constants";
import {
  Sparkles,
  Baby,
  PartyPopper,
  ChefHat,
  Dumbbell,
  Scissors,
  Home,
  Scale,
  ShoppingBag,
  Shield,
  Heart,
  Users,
} from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  beaute: <Sparkles className="w-[30px] h-[30px]" />,
  enfants: <Baby className="w-[30px] h-[30px]" />,
  evenementiel: <PartyPopper className="w-[30px] h-[30px]" />,
  cuisine: <ChefHat className="w-[30px] h-[30px]" />,
  sport: <Dumbbell className="w-[30px] h-[30px]" />,
  mode: <Scissors className="w-[30px] h-[30px]" />,
  maison: <Home className="w-[30px] h-[30px]" />,
  "droit-finances": <Scale className="w-[30px] h-[30px]" />,
  "conseilleres-marque": <ShoppingBag className="w-[30px] h-[30px]" />,
};

/* ─── Section 1 : Hero plein écran ────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-32">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/hero.jpg"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/hero.mp4?v=3" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[rgba(15,23,18,0.55)] z-[1]" />

      <div className="relative z-[2] max-w-4xl text-center">
        <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
          Bienvenue chez nous
        </span>

        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-[#F5F0E6] leading-[1] tracking-[-0.025em] mb-8">
          Les meilleures adresses,
          <br className="hidden sm:block" />
          <em className="italic font-light">entre copines</em>.
        </h1>

        <div className="max-w-2xl mx-auto mb-10">
          <p className="text-lg leading-[1.65] text-[#E8DFCC]">
            Finis les heures à chercher, les avis Google douteux, les
            déceptions. Juste les bonnes adresses — coiffeuses, nounous,
            avocates, traiteuses, salons de thé, spas, restos, sorties —
            celles qu&apos;on se passe entre copines.
          </p>
          <p className="font-heading text-xl font-light italic text-gold mt-4">
            Rejoins-nous.
          </p>
        </div>

        <Link
          href="/inscription"
          className="inline-flex items-center justify-center rounded-full px-12 py-5 text-base font-medium bg-[#F5F0E6] text-green-deep hover:bg-transparent hover:border hover:border-[#F5F0E6] hover:text-[#F5F0E6] transition-all"
        >
          Montre-moi les adresses
        </Link>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center text-sm text-[#E8DFCC]">
          <Link href="/inscription-prestataire" className="hover:text-gold transition-colors">
            Tu es prestataire ? Inscris-toi ici
          </Link>
          <span className="hidden sm:inline mx-4 text-gold font-medium">·</span>
          <div className="sm:hidden w-[40px] h-px bg-gold my-3" />
          <Link href="/recommander" className="hover:text-gold transition-colors">
            Tu veux partager une adresse ?
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 2 : Narrative plein écran ───────────────────── */

function NarrativeSection() {
  return (
    <section className="relative min-h-screen flex items-center py-32 px-4">
      <Image
        src="/images/narrative.jpg"
        alt=""
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[rgba(15,23,18,0.62)]" />

      <div className="relative z-[2] max-w-3xl mx-auto px-2">
        <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
          On se comprend
        </span>

        <h2 className="font-heading text-4xl md:text-5xl font-light text-[#F5F0E6] leading-[1.05] tracking-[-0.015em] mb-8">
          Tu la connais, cette galère ?
        </h2>

        <p className="text-lg leading-[1.85] text-[#E8DFCC] mb-6">
          Tu cherches une coiffeuse qui sait <em className="italic">vraiment</em> dompter
          tes cheveux. Une nounou en qui tu peux avoir confiance pour samedi
          soir. Une avocate qui te parle sans te faire sentir bête. La fille
          qui fait ces gâteaux d&apos;anniversaire dont tout le monde parle.
        </p>

        <p className="text-lg leading-[1.85] text-[#E8DFCC] mb-6">
          Tu scrolles WhatsApp pendant des heures. Tu demandes à trois
          copines. Tu recoupes les avis. Tu doutes. Tu finis par poser la
          question dans le groupe... et tu attends. Ou tu te rabats sur
          Google et tu tombes sur des trucs froids, chers, ou pas du tout
          dans ton énergie.
        </p>

        {/* Pull-quote */}
        <div className="my-12 max-w-xl mx-auto text-center space-y-6">
          <div className="w-[50px] h-px bg-gold mx-auto" />
          <p className="font-heading text-3xl md:text-4xl font-light italic text-gold leading-tight">
            Nous aussi, on en avait marre.
          </p>
          <div className="w-[50px] h-px bg-gold mx-auto" />
        </div>

        <p className="text-lg leading-[1.85] text-[#E8DFCC] mb-8">
          Marre de chercher comme si on n&apos;avait personne autour de nous.
          Marre de passer à côté de pépites parce qu&apos;on n&apos;était pas
          dans le bon groupe au bon moment. Marre que les bonnes adresses
          restent enfermées dans les conversations privées de cinq copines.
        </p>

        <p className="font-heading text-2xl font-light italic text-gold leading-[1.4] mt-8">
          Alors on a créé Hilmy. Un vrai coin entre nous.
          De Genève à Bruxelles, de Lille à Lausanne, de Paris à Luxembourg.
        </p>
      </div>
    </section>
  );
}

/* ─── Section 3 : Les 9 univers ───────────────────────────── */

function CategoriesSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-[#FAF6EC]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
            Nos 9 univers
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-light text-green-deep leading-tight tracking-tight">
            Tout ce dont tu as besoin, entre bonnes mains.
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="bg-[#F5F0E6] rounded-md p-10 px-8 text-center border border-[rgba(201,169,97,0.3)]"
            >
              <div className="flex justify-center text-gold mb-5">
                {CATEGORY_ICON_MAP[cat]}
              </div>
              <span className="block font-heading text-2xl font-normal text-green-deep">
                {categoryLabel(cat)}
              </span>
              <span className="block mt-3 text-sm text-muted-foreground leading-[1.6]">
                {CATEGORIES_DESCRIPTIONS[cat]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section 4 : Prestataire split 50/50 ─────────────────── */

function PrestatairesSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">
      <div className="relative min-h-[50vh] md:min-h-0 bg-[#2a2520]">
        <Image
          src="/images/prestataire.jpg"
          alt=""
          fill
          className="object-cover"
        />
      </div>
      <div className="flex items-center bg-[#F5F0E6] p-10 md:p-20">
        <div className="max-w-md">
          <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
            Tu es prestataire ?
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-light text-green-deep leading-tight tracking-tight mb-8">
            Fais-toi connaître chez nous.
          </h2>
          <p className="text-base leading-[1.85] text-[#4a4a4a] mb-8">
            Tu proposes un service ? Tu as un savoir-faire qui mérite
            d&apos;être connu ? Rejoins Hilmy. C&apos;est gratuit,
            c&apos;est entre nous, et c&apos;est là que les bonnes adresses
            circulent.
          </p>
          <Link
            href="/inscription-prestataire"
            className="inline-flex items-center justify-center rounded-full px-12 py-5 text-base font-medium tracking-wide bg-green-deep text-[#F5F0E6] hover:bg-green-deep/90 transition-colors"
          >
            Je propose mes services
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 5 : Charte plein écran de fermeture ─────────── */

function CharteSection() {
  const values = [
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Confiance",
      text: "Chaque profil est validé. Chaque signalement est traité.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Entre femmes",
      text: "Ici, on est entre nous. C'est notre force.",
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: "Bienveillance",
      text: "On se passe les bonnes adresses, pas les coups bas.",
    },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center py-32 px-4">
      <Image
        src="/images/closing.jpg"
        alt=""
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[rgba(15,23,18,0.65)]" />

      <div className="relative z-[2] max-w-5xl mx-auto text-center px-6">
        <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
          Notre charte en 3 mots
        </span>
        <h2 className="font-heading text-4xl md:text-5xl font-light text-[#F5F0E6] leading-tight tracking-tight">
          Ce qui nous lie.
        </h2>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-16 max-w-4xl mx-auto">
          {values.map((v) => (
            <div key={v.title} className="text-center">
              <div className="flex justify-center text-gold mb-5">{v.icon}</div>
              <h3 className="font-heading text-2xl font-normal text-[#F5F0E6]">
                {v.title}
              </h3>
              <p className="mt-3 text-sm text-[#E8DFCC]/85 leading-[1.6]">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      <Header transparent />
      <main className="flex-1">
        <HeroSection />
        <NarrativeSection />
        <CategoriesSection />
        <PrestatairesSection />
        <CharteSection />
      </main>
      <Footer />
    </>
  );
}
