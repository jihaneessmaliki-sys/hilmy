import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function JournalPage() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-lg">
          <h1 className="font-heading text-4xl font-light text-green-deep mb-6">Le journal</h1>
          <p className="text-muted-foreground mb-8">Les articles arrivent bientôt.</p>
          <Link href="/" className="text-sm text-gold hover:text-green-deep transition-colors underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
