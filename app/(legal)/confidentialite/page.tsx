export default function ConfidentialitePage() {
  return (
    <>
      <h1 className="font-heading text-3xl md:text-4xl font-medium text-green-deep mb-8">
        Politique de confidentialité
      </h1>

      <p className="text-muted-foreground leading-relaxed mb-8">
        Dernière mise à jour : avril 2026. Cette politique décrit comment Hilmy
        collecte, utilise et protège vos données personnelles conformément au
        Règlement général sur la protection des données (RGPD) et à la Loi
        fédérale suisse sur la protection des données (LPD).
      </p>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            1. Responsable du traitement
          </h2>
          <p>
            Jihane Maliki, Genève, Suisse.
            <br />
            Contact : hello@hilmy.io
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            2. Données collectées
          </h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Utilisatrices :</strong> adresse email, prénom, ville.
            </li>
            <li>
              <strong>Prestataires :</strong> adresse email, nom ou raison
              sociale, catégorie d&apos;activité, ville, description, numéro
              WhatsApp, compte Instagram, photos.
            </li>
            <li>
              <strong>Recommandations :</strong> témoignages écrits, notes,
              photos, tags, indicateur de prix.
            </li>
            <li>
              <strong>Lieux recommandés :</strong> nom, adresse, coordonnées
              géographiques (via Google Places API).
            </li>
            <li>
              <strong>Événements proposés :</strong> titre, description, date,
              lieu, flyer, lien d&apos;inscription.
            </li>
            <li>
              <strong>Signalements :</strong> identifiant du contenu signalé,
              motif du signalement.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            3. Finalités du traitement
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestion des comptes utilisatrices et prestataires.</li>
            <li>
              Mise en relation entre utilisatrices et prestataires via
              l&apos;annuaire.
            </li>
            <li>Modération des profils et traitement des signalements.</li>
            <li>
              Communication par email relative au fonctionnement du service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            4. Base légale
          </h2>
          <p>
            Le traitement de vos données repose sur votre consentement (lors de
            l&apos;inscription) et sur l&apos;intérêt légitime de Hilmy à
            assurer le bon fonctionnement et la sécurité du service (modération,
            signalements).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            5. Durée de conservation
          </h2>
          <p>
            Les données sont conservées tant que votre compte est actif. En cas
            de suppression de compte, vos données sont effacées dans un délai de
            30 jours, sauf obligation légale de conservation plus longue.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            6. Destinataires des données
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase Inc.</strong> : stockage des données et
              authentification.
            </li>
            <li>
              <strong>Vercel Inc.</strong> : hébergement du site web.
            </li>
            <li>
              <strong>Resend</strong> : envoi des emails transactionnels (liens
              de connexion).
            </li>
            <li>
              <strong>Google LLC</strong> : identification et géolocalisation des
              lieux recommandés (Google Places API).
            </li>
          </ul>
          <p className="mt-2">
            Aucune donnée n&apos;est vendue ou partagée à des fins publicitaires.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            7. Vos droits
          </h2>
          <p>
            Conformément au RGPD et à la LPD, vous disposez des droits
            suivants :
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Droit d&apos;accès à vos données personnelles.</li>
            <li>Droit de rectification des données inexactes.</li>
            <li>Droit à l&apos;effacement (droit à l&apos;oubli).</li>
            <li>Droit à la portabilité de vos données.</li>
            <li>Droit d&apos;opposition au traitement.</li>
            <li>Droit de retirer votre consentement à tout moment.</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à hello@hilmy.io.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            8. Réclamation
          </h2>
          <p>
            Si vous estimez que le traitement de vos données n&apos;est pas
            conforme, vous pouvez introduire une réclamation auprès de
            l&apos;autorité de protection des données compétente :
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Suisse</strong> : Préposé fédéral à la protection des
              données et à la transparence (PFPDT).
            </li>
            <li>
              <strong>France</strong> : Commission nationale de
              l&apos;informatique et des libertés (CNIL).
            </li>
            <li>
              <strong>Belgique</strong> : Autorité de protection des données
              (APD).
            </li>
            <li>
              <strong>Luxembourg</strong> : Commission nationale pour la
              protection des données (CNPD).
            </li>
          </ul>
          <p className="mt-2">
            Les utilisatrices résidant dans l&apos;Union européenne bénéficient
            de l&apos;ensemble des protections prévues par le RGPD.
          </p>
        </section>
      </div>
    </>
  );
}
