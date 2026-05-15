'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface EventPaywallSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ISO date à laquelle l'event ouvre au public (fin de la fenêtre
   *  Copines). Si null/undefined, le composant ne montre pas la date. */
  earlyAccessUntil: string | Date | null
}

function formatLongDate(value: string | Date | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

function formatShortDate(value: string | Date | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

/**
 * Paywall events — déclenché quand une non-Copine tente de s'inscrire
 * à un event en fenêtre d'accès anticipé (events.early_access_until >
 * now()).
 *
 * Le texte est calibré pour ne pas frustrer : option claire de devenir
 * Copine OU d'attendre la date d'ouverture publique. Le secondary CTA
 * porte la date pour rendre l'attente concrète.
 */
export function EventPaywallSheet({
  open,
  onOpenChange,
  earlyAccessUntil,
}: EventPaywallSheetProps) {
  const longDate = formatLongDate(earlyAccessUntil)
  const shortDate = formatShortDate(earlyAccessUntil)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-creme border-t border-or/20 rounded-t-2xl px-6 pt-8 pb-10 md:px-10 md:pt-10 md:pb-12"
      >
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-or/15 text-or">
            <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>

          <SheetHeader className="mt-5 gap-3">
            <SheetTitle className="font-serif text-[28px] font-light leading-tight text-vert md:text-[32px]">
              Les Copines y vont en premier.
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.65] text-texte-sec md:text-[16px]">
              Cet event ouvre aux Copines 48h avant tout le monde. Tu peux les
              rejoindre maintenant
              {longDate ? (
                <>
                  , ou attendre <span className="font-medium text-vert">{longDate}</span>
                </>
              ) : null}
              .
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 md:flex-row md:justify-center">
            <Link
              href="/pass-copine"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-full bg-or px-8 py-4 text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
            >
              Devenir Copine — 4,99 €/mois
            </Link>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center px-4 py-3 text-[13px] font-medium text-texte-sec transition-colors hover:text-vert"
            >
              {shortDate ? `J'attends le ${shortDate}` : 'Plus tard'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
