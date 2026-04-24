/**
 * États transverses pour les pages "live" (consomment Supabase) :
 * - SkeletonCard / SkeletonListGrid / SkeletonDetail : placeholders éditoriaux
 * - LiveErrorState : erreur fetch/RLS
 * - LiveEmptyState : DB vide (pas de data publiée)
 *
 * Charte : crème, or, vert. Pas de spinners SaaS. Voix Sara.
 */

import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'

/* ────────────────────────────────────────────────────────────
   Skeletons (animate-pulse Tailwind, tons crème/or subtils)
   ──────────────────────────────────────────────────────────── */

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-sm bg-blanc">
      <div className="h-64 w-full bg-creme-deep animate-pulse" />
      <div className="flex flex-col gap-4 p-7">
        <div className="h-2 w-20 rounded-full bg-creme-deep animate-pulse" />
        <div className="h-7 w-3/4 rounded-full bg-creme-deep animate-pulse" />
        <div className="h-3 w-full rounded-full bg-creme-deep animate-pulse" />
        <div className="h-3 w-2/3 rounded-full bg-creme-deep animate-pulse" />
        <div className="mt-auto flex items-center justify-between border-t border-or/10 pt-4">
          <div className="h-2 w-16 rounded-full bg-creme-deep animate-pulse" />
          <div className="h-2 w-20 rounded-full bg-creme-deep animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonListGrid({ count = 6 }: { count?: number }) {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function SkeletonDetail() {
  return (
    <div className="min-h-screen">
      {/* Cover */}
      <section className="relative h-72 w-full overflow-hidden bg-creme-deep md:h-80">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-creme-deep via-creme to-creme-deep" />
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.3fr_1fr] md:gap-20">
            <div className="space-y-10">
              <div className="h-10 w-2/3 rounded-full bg-creme-deep animate-pulse" />
              <div className="space-y-3">
                <div className="h-3 w-full rounded-full bg-creme-deep animate-pulse" />
                <div className="h-3 w-5/6 rounded-full bg-creme-deep animate-pulse" />
                <div className="h-3 w-3/4 rounded-full bg-creme-deep animate-pulse" />
              </div>
              <div className="h-40 w-full rounded-sm bg-creme-deep animate-pulse" />
            </div>
            <aside className="space-y-4">
              <div className="h-48 rounded-sm bg-creme-deep animate-pulse" />
              <div className="h-32 rounded-sm bg-creme-deep animate-pulse" />
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Error state
   ──────────────────────────────────────────────────────────── */

export function LiveErrorState({
  message,
  retryHref,
}: {
  message?: string
  retryHref?: string
}) {
  return (
    <section className="bg-creme py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Petit contre-temps</span>
          <GoldLine width={40} />
        </div>
        <h2 className="mt-6 font-serif text-h2 font-light text-vert">
          On cherche les meilleures adresses&nbsp;…
        </h2>
        <p className="mt-4 text-[14px] leading-[1.7] text-texte-sec">
          Un souci de connexion de notre côté — rien de grave.
          {message ? (
            <>
              <br />
              <span className="mt-2 inline-block font-mono text-[11px] text-texte-sec/60">
                ({message})
              </span>
            </>
          ) : null}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={retryHref ?? '/'}
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
          >
            Réessayer
            <span
              className="text-or-light transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          <Link
            href="/"
            className="text-[12px] text-texte-sec underline-offset-4 hover:text-or hover:underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────
   Empty state (live, DB vide)
   ──────────────────────────────────────────────────────────── */

export function LiveEmptyState({
  kicker,
  titre,
  pitch,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}: {
  kicker?: string
  titre: string
  pitch: string
  ctaLabel?: string
  ctaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}) {
  return (
    <section className="bg-creme py-24 md:py-32">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 text-center">
        {kicker && (
          <div className="flex items-center gap-3">
            <GoldLine width={40} />
            <span className="overline text-or">{kicker}</span>
            <GoldLine width={40} />
          </div>
        )}
        <h2 className="font-serif text-3xl font-light text-vert md:text-[32px]">
          {titre}
        </h2>
        <p className="max-w-md text-[14px] leading-[1.65] text-texte-sec">{pitch}</p>
        {(ctaLabel || secondaryLabel) && (
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                {ctaLabel}
                <span
                  className="text-or-light transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            )}
            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="text-[12px] text-texte-sec transition-colors hover:text-or"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
