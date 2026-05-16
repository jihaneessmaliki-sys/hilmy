'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface FavorisPaywallSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Paywall favoris — déclenché quand une non-Copine tente d'ajouter un
 * 11e favori (trigger SQL check_favoris_limit_for_non_copine renvoie
 * P0001 'FAVORITES_LIMIT_REACHED').
 *
 * Bottom sheet sobre, voix Sara : pas culpabilisant, juste une
 * proposition naturelle. Le CTA renvoie vers /pass-copine — le
 * checkout Stripe se fait après.
 */
export function FavorisPaywallSheet({
  open,
  onOpenChange,
}: FavorisPaywallSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-creme border-t border-or/20 rounded-t-2xl px-6 pt-8 pb-10 md:px-10 md:pt-10 md:pb-12"
      >
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-or/15 text-or">
            <Heart size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>

          <SheetHeader className="mt-5 gap-3">
            <SheetTitle className="font-serif text-[28px] font-light leading-tight text-vert md:text-[32px]">
              T&apos;as bon goût.
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.65] text-texte-sec md:text-[16px]">
              Tu peux sauvegarder autant d&apos;adresses que tu veux avec le
              Pass Copine. Plus de limite, plus de panique de devoir choisir.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 md:flex-row md:justify-center">
            <Link
              href="/pass-copine"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-full bg-or px-8 py-4 text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
            >
              Je prends mon Pass — 4,99 €/mois
            </Link>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center px-4 py-3 text-[13px] font-medium text-texte-sec transition-colors hover:text-vert"
            >
              Plus tard
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
