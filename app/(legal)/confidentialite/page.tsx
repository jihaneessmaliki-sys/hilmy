import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { LegalSection } from '@/components/v2/LegalSection'

export default function ConfidentialitePage() {
  return (
    <ContentPageShell
      kicker="Légal · Confidentialité"
      titre={
        <>
          Politique de{' '}
          <em className="font-serif italic text-or">confidentialité.</em>
        </>
      }
      lead={
        <>
          Dernière mise à jour&nbsp;: avril 2026. Comment Hilmy collecte,
          utilise et protège vos données conformément au RGPD et à la LPD
          suisse.
        </>
      }
    >
      <div className="grid max-w-3xl gap-10">
        <LegalSection numero="01" titre="Responsable du traitement">
          <p>
            Jihane Maliki, Genève, Suisse.
            <br />
            Contact&nbsp;:{' '}
            <a
              href="mailto:hello@hilmy.io"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hello@hilmy.io
            </a>
          </p>
        </LegalSection>

        <LegalSection numero="02" titre="Données collectées">
          <p>Nous collectons les données suivantes&nbsp;:</p>
          <ul className="mt-3 space-y-2 pl-5">
            <LegalListItem strong="Utilisatrices">
              adresse email, prénom, ville.
            </LegalListItem>
            <LegalListItem strong="Prestataires">
              adresse email, nom ou raison sociale, catégorie d&apos;activité,
              ville, description, numéro WhatsApp, compte Instagram, photos.
            </LegalListItem>
            <LegalListItem strong="Recommandations">
              témoignages écrits, notes, photos, tags, indicateur de prix.
            </LegalListItem>
            <LegalListItem strong="Lieux recommandés">
              nom, adresse, coordonnées géographiques (via Google Places API).
            </LegalListItem>
            <LegalListItem strong="Événements proposés">
              titre, description, date, lieu, flyer, lien d&apos;inscription.
            </LegalListItem>
            <LegalListItem strong="Signalements">
              identifiant du contenu signalé, motif du signalement.
            </LegalListItem>
          </ul>
        </LegalSection>

        <LegalSection numero="03" titre="Finalités du traitement">
          <ul className="space-y-2 pl-5">
            <LegalBullet>Gestion des comptes utilisatrices et prestataires.</LegalBullet>
            <LegalBullet>
              Mise en relation entre utilisatrices et prestataires via l&apos;annuaire.
            </LegalBullet>
            <LegalBullet>
              Modération des fiches et traitement des signalements.
            </LegalBullet>
            <LegalBullet>
              Communication par email relative au fonctionnement du service.
            </LegalBullet>
          </ul>
        </LegalSection>

        <LegalSection numero="04" titre="Base légale">
          <p>
            Le traitement de vos données repose sur votre consentement (lors de
            l&apos;inscription) et sur l&apos;intérêt légitime de Hilmy à
            assurer le bon fonctionnement et la sécurité du service (modération,
            signalements).
          </p>
        </LegalSection>

        <LegalSection numero="05" titre="Durée de conservation">
          <p>
            Les données sont conservées tant que votre compte est actif. En cas
            de suppression de compte, vos données sont effacées dans un délai de
            30&nbsp;jours, sauf obligation légale de conservation plus longue.
          </p>
        </LegalSection>

        <LegalSection numero="06" titre="Destinataires des données">
          <ul className="space-y-2 pl-5">
            <LegalListItem strong="Supabase Inc.">
              stockage des données et authentification.
            </LegalListItem>
            <LegalListItem strong="Vercel Inc.">
              hébergement du site web.
            </LegalListItem>
            <LegalListItem strong="Brevo (sib SA)">
              envoi des emails transactionnels.
            </LegalListItem>
            <LegalListItem strong="Google LLC">
              identification et géolocalisation des lieux recommandés (Google
              Places API).
            </LegalListItem>
          </ul>
          <p className="mt-3 italic text-texte-sec">
            Aucune donnée n&apos;est vendue ou partagée à des fins publicitaires.
          </p>
        </LegalSection>

        <LegalSection numero="07" titre="Vos droits">
          <p>
            Conformément au RGPD et à la LPD, vous disposez des droits
            suivants&nbsp;:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <LegalBullet>Droit d&apos;accès à vos données personnelles.</LegalBullet>
            <LegalBullet>Droit de rectification des données inexactes.</LegalBullet>
            <LegalBullet>Droit à l&apos;effacement (droit à l&apos;oubli).</LegalBullet>
            <LegalBullet>Droit à la portabilité de vos données.</LegalBullet>
            <LegalBullet>Droit d&apos;opposition au traitement.</LegalBullet>
            <LegalBullet>Droit de retirer votre consentement à tout moment.</LegalBullet>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits, contactez-nous à{' '}
            <a
              href="mailto:hello@hilmy.io"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hello@hilmy.io
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection numero="08" titre="Réclamation">
          <p>
            Si vous estimez que le traitement de vos données n&apos;est pas
            conforme, vous pouvez introduire une réclamation auprès de
            l&apos;autorité de protection des données compétente&nbsp;:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <LegalListItem strong="Suisse">
              Préposé fédéral à la protection des données et à la transparence
              (PFPDT).
            </LegalListItem>
            <LegalListItem strong="France">
              Commission nationale de l&apos;informatique et des libertés
              (CNIL).
            </LegalListItem>
            <LegalListItem strong="Belgique">
              Autorité de protection des données (APD).
            </LegalListItem>
            <LegalListItem strong="Luxembourg">
              Commission nationale pour la protection des données (CNPD).
            </LegalListItem>
          </ul>
          <p className="mt-3 italic text-texte-sec">
            Les utilisatrices résidant dans l&apos;Union européenne bénéficient
            de l&apos;ensemble des protections prévues par le RGPD.
          </p>
        </LegalSection>
      </div>
    </ContentPageShell>
  )
}

function LegalBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-1 before:absolute before:-left-4 before:top-[10px] before:h-1 before:w-1 before:rounded-full before:bg-or">
      {children}
    </li>
  )
}

function LegalListItem({
  strong,
  children,
}: {
  strong: string
  children: React.ReactNode
}) {
  return (
    <li className="relative pl-1 before:absolute before:-left-4 before:top-[10px] before:h-1 before:w-1 before:rounded-full before:bg-or">
      <span className="font-medium text-vert">{strong}&nbsp;:</span> {children}
    </li>
  )
}
