import { GoldLine } from '@/components/ui/GoldLine'
import {
  CommunityPhotos,
  type CommunityPhoto,
} from '@/components/v2/CommunityPhotos'

/**
 * Bloc « Les photos des copines » de la fiche lieu — affiché à l'identique sur
 * la fiche CONNECTÉE et la fiche PUBLIQUE (anonyme). Server Component : le grid
 * + ses <img> sont dans le HTML SSR → photos INDEXABLES Google (exigence SEO).
 *
 * Les photos viennent EXCLUSIVEMENT de la vue anon-safe place_public_photos
 * (source place_user_photos, status='published', JAMAIS l'array legacy
 * recommendations.photo_urls). Aucune identité n'est rendue : pas de prénom,
 * pas d'avatar, pas de recommendation_id (galerie détachée des commentaires).
 *
 * `canReport` : true → signalement direct (fiche connectée) ; false → le bouton
 * devient un lien vers la connexion (fiche publique). Mention légale sous la
 * galerie : Hilmy = hébergeur, modération a posteriori, voie de signalement.
 */
export function CommunityPhotosSection({
  photos,
  canReport,
  loginHref,
  placeName,
}: {
  photos: CommunityPhoto[]
  canReport: boolean
  loginHref: string
  placeName: string
}) {
  if (photos.length === 0) return null

  return (
    <section aria-label={`Photos partagées par la communauté pour ${placeName}`}>
      <header className="flex items-center gap-5">
        <GoldLine width={60} />
        <span className="overline text-or">
          Les photos des copines
          {photos.length > 1 ? ` · ${photos.length}` : ''}
        </span>
      </header>

      <div className="mt-6">
        <CommunityPhotos
          photos={photos}
          canReport={canReport}
          loginHref={loginHref}
          ariaLabel={`Photos partagées par la communauté pour ${placeName}`}
        />
      </div>

      {/* Mention légale — Hilmy hébergeur, modération a posteriori, retrait SI
          illicite (formulation validée, le « si elle est illicite » est gardé
          mot pour mot pour sa portée juridique). */}
      <p className="mt-4 text-[12px] leading-[1.6] text-texte-sec">
        Ces photos sont partagées par les copines de la communauté, qui en sont
        responsables. Hilmy les héberge et les modère a posteriori. Une photo te
        semble problématique — visage d&apos;un tiers, droit à l&apos;image,
        contenu illicite&nbsp;? Signale-la&nbsp;: on l&apos;examine et on la
        retire si elle est illicite.
      </p>
    </section>
  )
}
