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
          Dernière mise à jour&nbsp;: avril 2026. L&apos;utilisation du site
          Hilmy implique l&apos;acceptation pleine et entière des présentes
          conditions.
        </>
      }
    >
      <div className="grid max-w-3xl gap-10">
        <LegalSection numero="01" titre="Objet">
          <p>
            Hilmy est un annuaire en ligne gratuit permettant la mise en relation
            entre des utilisatrices à la recherche de prestataires de services et
            des prestataires femmes proposant leurs services en Suisse, en
            France, en Belgique, au Luxembourg et à Monaco.
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
            Chaque fiche prestataire est soumise à validation par l&apos;équipe
            Hilmy avant publication. Les utilisatrices peuvent signaler tout
            profil qui leur semble inapproprié. L&apos;équipe Hilmy se réserve
            le droit de suspendre ou supprimer tout compte ne respectant pas les
            présentes conditions.
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

        <LegalSection numero="06" titre="Gratuité">
          <p>
            L&apos;inscription et l&apos;utilisation de Hilmy sont entièrement
            gratuites, tant pour les utilisatrices que pour les prestataires.
            Aucune commission n&apos;est prélevée sur les prestations.
          </p>
        </LegalSection>

        <LegalSection numero="07" titre="Suppression de compte">
          <p>
            Vous pouvez demander la suppression de votre compte à tout moment en
            contactant{' '}
            <a
              href="mailto:hello@hilmy.io"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hello@hilmy.io
            </a>
            . Vos données seront effacées dans un délai de 30 jours.
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
