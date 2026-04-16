import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const CATEGORY_LABELS: Record<string, string> = {
  beaute: "Beauté",
  enfants: "Enfants",
  restaurants: "Restaurants",
  "bien-etre": "Bien-être",
  mode: "Mode",
  maison: "Maison",
  evenementiel: "Événementiel",
  "droit-finances": "Droit & finances",
  "sport-nature": "Sport & nature",
};

export default async function CategoriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-lg">
          <h1 className="font-heading text-4xl font-light text-green-deep mb-6">{label}</h1>
          <p className="text-muted-foreground mb-8">Cette catégorie arrive bientôt.</p>
          <Link href="/" className="text-sm text-gold hover:text-green-deep transition-colors underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
