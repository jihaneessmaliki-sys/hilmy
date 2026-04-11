export default function CguPage() {
  return (
    <>
      <h1 className="font-heading text-3xl md:text-4xl font-medium text-green-deep mb-8">
        Conditions générales d&apos;utilisation
      </h1>

      <p className="text-muted-foreground leading-relaxed mb-8">
        Dernière mise à jour : avril 2026. L&apos;utilisation du site Hilmy
        implique l&apos;acceptation pleine et entière des présentes conditions.
      </p>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            1. Objet
          </h2>
          <p>
            Hilmy est un annuaire en ligne gratuit permettant la mise en relation
            entre des utilisatrices à la recherche de prestataires de services et
            des prestataires femmes proposant leurs services dans la région de
            Genève et ses environs.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            2. Inscription et compte
          </h2>
          <p>
            L&apos;inscription sur Hilmy est réservée aux femmes. En créant un
            compte, vous confirmez sur l&apos;honneur être une femme.
          </p>
          <p className="mt-2">
            Deux types de comptes existent : le compte utilisatrice (pour
            consulter l&apos;annuaire) et le compte prestataire (pour proposer
            ses services). L&apos;inscription se fait par lien magique envoyé par
            email. Aucun mot de passe n&apos;est nécessaire.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            3. Engagement de confiance
          </h2>
          <p>
            En utilisant Hilmy, vous vous engagez à respecter les autres
            membres, à ne pas publier de contenu trompeur, offensant ou
            illicite, et à contribuer à un environnement bienveillant entre
            femmes.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            4. Modération et signalement
          </h2>
          <p>
            Chaque profil de prestataire est soumis à validation par
            l&apos;équipe Hilmy avant publication. Les utilisatrices peuvent
            signaler tout profil qui leur semble inapproprié. L&apos;équipe
            Hilmy se réserve le droit de suspendre ou supprimer tout compte ne
            respectant pas les présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            5. Responsabilité
          </h2>
          <p>
            Hilmy est un service de mise en relation et ne peut être tenu
            responsable de la qualité, de la conformité ou de l&apos;exécution
            des prestations proposées par les prestataires référencées. Toute
            relation commerciale se noue directement entre l&apos;utilisatrice et
            la prestataire, en dehors de Hilmy.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            6. Gratuité
          </h2>
          <p>
            L&apos;inscription et l&apos;utilisation de Hilmy sont entièrement
            gratuites, tant pour les utilisatrices que pour les prestataires.
            Aucune commission n&apos;est prélevée sur les prestations.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            7. Suppression de compte
          </h2>
          <p>
            Vous pouvez demander la suppression de votre compte à tout moment en
            contactant hello@hilmy.io. Vos données seront effacées dans un délai
            de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            8. Droit applicable et juridiction
          </h2>
          <p>
            Les présentes conditions sont régies par le droit suisse. Tout
            litige relatif à l&apos;utilisation de Hilmy sera soumis à la
            compétence exclusive des tribunaux du canton de Genève, Suisse.
          </p>
          <p className="mt-2">
            Les utilisatrices résidant dans l&apos;Union européenne
            bénéficient des protections prévues par le RGPD et les
            réglementations applicables dans leur pays de résidence.
          </p>
        </section>
      </div>
    </>
  );
}
