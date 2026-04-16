import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-lg">
          <h1 className="font-heading text-4xl font-light text-green-deep mb-6">
            {slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
          </h1>
          <p className="text-muted-foreground mb-8">Cet article arrive bientôt.</p>
          <Link href="/journal" className="text-sm text-gold hover:text-green-deep transition-colors underline">
            Retour au journal
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
