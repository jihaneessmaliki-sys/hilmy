import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getVoixBySlug,
  getRecosByVoix,
  isFollowingVoix,
} from "@/lib/supabase/queries/voix";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/voix/FollowButton";
import { RecosList } from "@/components/voix/RecosList";
import { MemberName } from "@/components/badges/MemberName";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hilmy.io";

/**
 * Page perso publique d'une Voix Hilmy : hilmy.io/{slug}.
 *
 * Cohabitation routes Next.js : les routes statiques (/tarifs,
 * /connexion, etc.) sont prioritaires. Cette route dynamique
 * n'attrape que les slugs qui ne matchent rien d'autre. La validation
 * des slugs réservés à la création (commit 14) garantit qu'on ne
 * peut pas activer une Voix avec un slug qui collisionne.
 *
 * Public sans auth (visibilité totale). Le bouton Suivre nécessite
 * une session — sinon redirect vers /auth/signup avec retour.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: voix } = await getVoixBySlug(slug);

  if (!voix) {
    return {
      title: "Page introuvable — Hilmy",
      robots: { index: false, follow: false },
    };
  }

  const title = `Les recos de ${voix.prenom} sur Hilmy`;
  const url = `${SITE_URL}/${voix.slug}`;
  const ogImage = `${SITE_URL}/api/og/voix/${voix.slug}`;

  return {
    title,
    description: voix.bio,
    openGraph: {
      title,
      description: voix.bio,
      url,
      type: "profile",
      siteName: "Hilmy",
      locale: "fr_FR",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${voix.prenom}, Créatrice Hilmy`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: voix.bio,
      images: [ogImage],
    },
    alternates: { canonical: url },
  };
}

export default async function VoixSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: voix } = await getVoixBySlug(slug);
  if (!voix) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const [{ data: isFollowing }, { data: recos }, { data: copineRow }] = await Promise.all([
    isFollowingVoix(voix.user_id),
    getRecosByVoix(voix.user_id),
    // Pass Copine (mig 50, Phase 6) : fetch séparé is_copine/copine_since
    // — la vue voix_hilmy_public ne les expose pas (décision D1 Phase 6 :
    // pas de migration pour étendre la vue SECURITY DEFINER).
    supabase
      .from("user_profiles")
      .select("is_copine, copine_since")
      .eq("user_id", voix.user_id)
      .maybeSingle(),
  ]);
  const isCopine = (copineRow as { is_copine?: boolean | null } | null)?.is_copine ?? null;
  const copineSince =
    (copineRow as { copine_since?: string | null } | null)?.copine_since ?? null;

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-screen-sm px-5 pb-24 pt-10">
        <header className="text-center">
          <PhotoPlaceholder prenom={voix.prenom} />
          <h1 className="mt-4 font-serif text-3xl font-semibold text-vert">
            <MemberName
              prenom={voix.prenom}
              isCopine={isCopine}
              copineSince={copineSince}
              badgeSize={18}
            />
          </h1>
          <div className="mt-2 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-md bg-or px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-vert">
              ✦ Créatrice
            </span>
          </div>
          <p className="mx-4 mt-4 text-sm italic leading-relaxed text-texte">
            «&nbsp;{voix.bio}&nbsp;»
          </p>
          <div className="mt-6 flex justify-center gap-8 border-t border-creme-deep pt-5">
            <Stat value={voix.recos_count} label="Recos" />
            <Stat value={voix.followers_count} label="Copines" />
          </div>
          <div className="mt-5">
            <FollowButton
              voixSlug={voix.slug}
              voixPrenom={voix.prenom}
              isLoggedIn={isLoggedIn}
              initialIsFollowing={isFollowing ?? false}
            />
          </div>
        </header>

        <section className="mt-8" aria-label="Recos publiées">
          <RecosList recos={recos ?? []} prenom={voix.prenom} />
        </section>
      </div>
    </main>
  );
}

function PhotoPlaceholder({ prenom }: { prenom: string }) {
  const initial = prenom.charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-or bg-gradient-to-br from-or to-or-light font-serif text-4xl font-semibold text-vert"
    >
      {initial}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-serif text-xl font-semibold text-vert">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-texte-sec">
        {label}
      </div>
    </div>
  );
}
