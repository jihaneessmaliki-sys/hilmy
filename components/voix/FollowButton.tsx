"use client";

import { useState, useTransition } from "react";

type Props = {
  voixSlug: string;
  voixPrenom: string;
  isLoggedIn: boolean;
  initialIsFollowing: boolean;
};

/**
 * Bouton "Suivre / Tu suis" sur la page perso d'une Voix.
 *
 * États gérés :
 *   • Non connectée → tap = redirect /auth/signup?redirect=/{slug}.
 *     Pas d'auto-follow post-signup en Phase 1 (la copine cliquera
 *     une 2ᵉ fois en étant connectée).
 *   • Connectée non-following → "+ Suivre {prenom}".
 *   • Connectée following → "✓ Tu suis {prenom}".
 *
 * Les endpoints POST/DELETE /api/voix/{slug}/follow sont câblés au
 * commit 10 du brief Voix Hilmy. En Phase commit 4, le bouton appelle
 * déjà ces endpoints — ils retourneront 404 jusqu'à ce que la 10
 * land. Le state local revert si la requête échoue.
 */
export function FollowButton({
  voixSlug,
  voixPrenom,
  isLoggedIn,
  initialIsFollowing,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!isLoggedIn) {
      const returnTo = `/${voixSlug}`;
      window.location.href = `/auth/signup?redirect=${encodeURIComponent(returnTo)}`;
      return;
    }

    const optimistic = !isFollowing;
    setIsFollowing(optimistic);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/voix/${voixSlug}/follow`, {
          method: optimistic ? "POST" : "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        setIsFollowing(!optimistic);
      }
    });
  };

  const label = isFollowing
    ? `✓ Tu suis ${voixPrenom}`
    : `+ Suivre ${voixPrenom}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFollowing}
      className={
        isFollowing
          ? "w-full rounded-2xl border border-vert bg-creme px-4 py-3 text-sm font-semibold text-vert transition hover:bg-creme-deep disabled:opacity-60"
          : "w-full rounded-2xl bg-vert px-4 py-3 text-sm font-semibold text-creme transition hover:bg-vert-dark disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}
