import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { LegalSection } from '@/components/v2/LegalSection'

export default function CguPage() {
  return (
    <ContentPageShell
      kicker="Légal · CGU"
      titre={
        <>
          Conditions générales{' '}
          <em className="font-serif italic text-or">d&apos;utilisation.</em>
        </>
      }
      lead={
        <>
          Dernière mise à jour&nbsp;: mai 2026. L&apos;utilisation du site
          Hilmy implique l&apos;acceptation pleine et entière des présentes
          conditions.
        </>
      }
    >
      <div className="grid max-w-3xl gap-10">
        <LegalSection numero="01" titre="Objet">
          <p>
            Hilmy est un annuaire en ligne permettant la mise en relation entre
            des utilisatrices à la recherche de prestataires de services et des
            prestataires femmes proposant leurs services en Suisse, en France,
            en Belgique, au Luxembourg et à Monaco. L&apos;accès et la
            consultation sont gratuits pour les utilisatrices. La création
            d&apos;une fiche prestataire dans l&apos;annuaire fait l&apos;objet
            d&apos;un abonnement (article 06).
          </p>
        </LegalSection>

        <LegalSection numero="02" titre="Inscription et compte">
          <p>
            L&apos;inscription sur Hilmy est réservée aux femmes. En créant un
            compte, vous confirmez sur l&apos;honneur être une femme.
          </p>
          <p>
            Deux types de comptes existent&nbsp;: le compte utilisatrice (pour
            consulter l&apos;annuaire) et le compte prestataire (pour proposer
            ses services). L&apos;inscription se fait par email et mot de passe.
          </p>
        </LegalSection>

        <LegalSection numero="03" titre="Engagement de confiance">
          <p>
            En utilisant Hilmy, vous vous engagez à respecter les autres membres,
            à ne pas publier de contenu trompeur, offensant ou illicite, et à
            contribuer à un environnement bienveillant entre femmes.
          </p>
        </LegalSection>

        <LegalSection numero="04" titre="Modération et signalement">
          <p>
            Chaque fiche prestataire est soumise à validation par la team Hilmy
            avant publication. Les utilisatrices peuvent signaler tout profil
            qui leur semble inapproprié. La team Hilmy se réserve le droit de
            suspendre ou supprimer tout compte ne respectant pas les présentes
            conditions.
          </p>
        </LegalSection>

        <LegalSection numero="05" titre="Responsabilité">
          <p>
            Hilmy est un service de mise en relation et ne peut être tenu
            responsable de la qualité, de la conformité ou de l&apos;exécution
            des prestations proposées par les prestataires référencées. Toute
            relation commerciale se noue directement entre l&apos;utilisatrice et
            la prestataire, en dehors de Hilmy.
          </p>
        </LegalSection>

        <LegalSection numero="06" titre="Modèle économique et abonnements">
          <p>
            <strong className="font-medium text-vert">
              Côté utilisatrices&nbsp;:
            </strong>{' '}
            l&apos;inscription, la consultation de l&apos;annuaire, la lecture
            et le dépôt de recommandations, ainsi que la participation aux
            événements sont entièrement gratuits, sans paywall et sans
            limitation.
          </p>
          <p>
            <strong className="font-medium text-vert">
              Côté prestataires&nbsp;:
            </strong>{' '}
            la publication d&apos;une fiche dans l&apos;annuaire prestataires
            fait l&apos;objet d&apos;un abonnement payant, proposé en trois
            formules&nbsp;: Standard (19&nbsp;€/mois), Premium (49&nbsp;€/mois)
            et Cercle Pro (99&nbsp;€/mois). La grille tarifaire complète,
            ainsi que les durées d&apos;engagement (mensuel, 3&nbsp;mois,
            6&nbsp;mois, 1&nbsp;an) et les remises associées, sont détaillées
            sur la page{' '}
            <a
              href="/tarifs"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              /tarifs
            </a>
            . Une fiche {`"Sélection Hilmy"`} dédiée aux lieux est également
            proposée à 39&nbsp;€/mois.
          </p>
          <p>
            <strong className="font-medium text-vert">
              Pas de commission sur les prestations.
            </strong>{' '}
            Hilmy ne prélève aucun pourcentage sur le chiffre d&apos;affaires
            généré par les prestataires auprès de leurs clientes&nbsp;: le
            modèle est uniquement fondé sur l&apos;abonnement plat.
          </p>
          <p>
            <strong className="font-medium text-vert">
              Sans engagement de durée minimale obligatoire.
            </strong>{' '}
            Les abonnements mensuels sont reconductibles tacitement chaque
            mois&nbsp;; ils peuvent être résiliés à tout moment depuis le
            tableau de bord prestataire ou en écrivant à{' '}
            <a
              href="mailto:hilmy.io@hotmail.com"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hilmy.io@hotmail.com
            </a>
            . La résiliation prend effet à la fin de la période payée en cours,
            sans remboursement prorata. Les abonnements annuels (3, 6 ou
            12&nbsp;mois) couvrent la période choisie sans tacite reconduction
            au-delà.
          </p>
        </LegalSection>

        <LegalSection numero="07" titre="Suppression de compte">
          <p>
            Vous pouvez demander la suppression de votre compte à tout moment en
            contactant{' '}
            <a
              href="mailto:hilmy.io@hotmail.com"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hilmy.io@hotmail.com
            </a>
            . Vos données seront effacées dans un délai de 30 jours. Pour les
            comptes prestataires en cours d&apos;abonnement, la suppression
            entraîne la résiliation immédiate de l&apos;abonnement à la fin de
            la période payée, sans remboursement prorata.
          </p>
        </LegalSection>

        <LegalSection numero="08" titre="Droit applicable et juridiction">
          <p>
            Les présentes conditions sont régies par le droit suisse. Tout
            litige relatif à l&apos;utilisation de Hilmy sera soumis à la
            compétence exclusive des tribunaux du canton de Genève, Suisse.
          </p>
          <p>
            Les utilisatrices résidant dans l&apos;Union européenne bénéficient
            des protections prévues par le RGPD et les réglementations
            applicables dans leur pays de résidence.
          </p>
        </LegalSection>
      </div>
    </ContentPageShell>
  )
}
