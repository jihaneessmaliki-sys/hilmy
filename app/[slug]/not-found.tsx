import Link from "next/link";

/**
 * 404 scoped au segment [slug] : se déclenche uniquement quand
 * notFound() est appelé depuis app/[slug]/page.tsx (Voix Hilmy
 * introuvable). N'affecte pas les autres 404 du site.
 */
export default function VoixNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-creme px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl font-semibold text-vert">
          Cette Voix n&apos;existe pas
        </h1>
        <p className="mt-4 text-base leading-relaxed text-texte-sec">
          Le lien est peut-être périmé. Reviens à l&apos;accueil pour découvrir
          les copines.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-2xl bg-vert px-6 py-3 text-sm font-semibold text-creme transition hover:bg-vert-dark"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
