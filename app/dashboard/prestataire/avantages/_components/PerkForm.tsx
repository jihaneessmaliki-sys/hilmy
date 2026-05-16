'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

type DiscountType = 'percentage' | 'fixed'

/**
 * Form de création d'une offre Pro Perk.
 *
 * POST /api/pro-perks → la route gate côté serveur (Cercle Pro + Zod).
 * Succès → toast + redirect vers la liste pour voir le perk en
 * pending_review.
 *
 * Validation client minimaliste (title non vide, discount > 0). La
 * validation autoritaire est côté API route via Zod — on évite de
 * dupliquer les règles ici, on ne fait que de l'UX guidance.
 */
export function PerkForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [conditions, setConditions] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const parsedValue = Number(discountValue)
    if (!title.trim()) {
      toast.error('Donne un titre à ton offre.')
      return
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      toast.error('La valeur de la réduction doit être positive.')
      return
    }

    const parsedMaxUses = maxUses.trim() ? Number(maxUses) : null
    if (parsedMaxUses !== null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0)) {
      toast.error('Nombre d\'utilisations max invalide.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: parsedValue,
        conditions: conditions.trim() || null,
        max_uses: parsedMaxUses,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }
      const res = await fetch('/api/pro-perks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; id?: string; error?: string }
        | null
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? 'Impossible de créer ton offre.')
        setSubmitting(false)
        return
      }
      toast.success('Ton offre est envoyée pour modération.')
      router.push('/dashboard/prestataire/avantages')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-or/20 bg-white p-6 md:p-10"
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="perk-title" className="overline text-or">
            Titre de l&apos;offre
          </label>
          <input
            id="perk-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Ex. 15 % sur ton premier soin"
            required
            className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
          />
          <p className="mt-1 text-[11px] text-texte-sec">{title.length}/80</p>
        </div>

        <div>
          <label htmlFor="perk-description" className="overline text-or">
            Description (optionnelle)
          </label>
          <textarea
            id="perk-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Ce que la Copine reçoit en pratique."
            className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
          />
          <p className="mt-1 text-[11px] text-texte-sec">{description.length}/300</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="perk-discount-type" className="overline text-or">
              Type de réduction
            </label>
            <select
              id="perk-discount-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
            >
              <option value="percentage">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
            </select>
          </div>
          <div>
            <label htmlFor="perk-discount-value" className="overline text-or">
              Valeur {discountType === 'percentage' ? '(%)' : '(€)'}
            </label>
            <input
              id="perk-discount-value"
              type="number"
              min="0.01"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '15' : '20'}
              required
              className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
            />
          </div>
        </div>

        <div>
          <label htmlFor="perk-conditions" className="overline text-or">
            Conditions (optionnel)
          </label>
          <textarea
            id="perk-conditions"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Ex. valable sur les soins de plus de 60 minutes, hors promo."
            className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="perk-max-uses" className="overline text-or">
              Nombre d&apos;utilisations max (optionnel)
            </label>
            <input
              id="perk-max-uses"
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Illimité si vide"
              className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
            />
          </div>
          <div>
            <label htmlFor="perk-ends-at" className="overline text-or">
              Date de fin (optionnelle)
            </label>
            <input
              id="perk-ends-at"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-2 block w-full rounded-sm border border-or/30 bg-creme/40 px-4 py-3 text-[14px] text-vert focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <Link
          href="/dashboard/prestataire/avantages"
          className="text-center text-[13px] font-medium text-texte-sec transition-colors hover:text-vert"
        >
          ← Annuler
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-or px-8 py-4 text-[13px] font-semibold tracking-[0.18em] text-vert uppercase transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? 'Envoi…' : 'Envoyer pour modération'}
        </button>
      </div>
    </form>
  )
}
