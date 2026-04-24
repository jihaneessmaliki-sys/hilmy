'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/landing/Navigation'
import { FooterV2 } from '@/components/landing/FooterV2'
import { GoldLine } from '@/components/ui/GoldLine'
import { AvisFormBody } from '@/components/v2/AvisFormBody'

interface Props {
  profileId: string
  profileSlug: string
  profileNom: string
}

export function AvisForm({ profileId, profileSlug, profileNom }: Props) {
  const router = useRouter()

  const handleSuccess = () => {
    router.push(`/prestataire-v2/${profileSlug}#avis`)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-creme text-texte">
      <Navigation variant="solid" />

      <header className="pt-32 pb-8 md:pt-40 md:pb-12">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="flex items-center gap-4">
            <GoldLine width={48} />
            <span className="overline text-or">Laisser un avis</span>
          </div>
          <h1 className="mt-6 font-serif text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05] text-vert">
            Raconte ton passage chez{' '}
            <em className="font-serif italic text-or">{profileNom}</em>.
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-[17px] italic leading-[1.55] text-texte md:text-[19px]">
            Un avis sincère, c&apos;est le plus beau cadeau qu&apos;on puisse
            faire à une copine qui hésite. Pas besoin de faire long — dis ce que
            tu as aimé, ce qui t&apos;a marquée.
          </p>
        </div>
      </header>

      <main className="pb-24 md:pb-32">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          <AvisFormBody
            profileId={profileId}
            onSuccess={handleSuccess}
            variant="page"
          />
          <div className="mt-8 text-right">
            <Link
              href={`/prestataire-v2/${profileSlug}`}
              className="text-[12px] text-texte-sec hover:text-or"
            >
              ← Retour à la fiche
            </Link>
          </div>
        </div>
      </main>

      <FooterV2 />
    </div>
  )
}
