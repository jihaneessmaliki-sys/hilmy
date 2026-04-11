import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <article className="prose-legal">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  );
}
