import nodemailer from "nodemailer";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  return process.env[name]?.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailLayout({
  preview,
  title,
  intro,
  ctaLabel,
  ctaHref,
  footer,
}: {
  preview: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  footer: string;
}) {
  const safePreview = escapeHtml(preview);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeLabel = escapeHtml(ctaLabel);
  const safeFooter = escapeHtml(footer);
  const safeHref = ctaHref;

  return `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Georgia, serif; color:#4a4a4a;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:30px; line-height:1.2; color:#0f3d2e; font-weight:600;">${safeTitle}</h1>
          <p style="margin:0 0 24px; font-family: Arial, sans-serif; font-size:15px; line-height:1.7; color:#8a8578;">${safeIntro}</p>
          <a href="${safeHref}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:#0f3d2e; color:#ffffff; text-decoration:none; font-family: Arial, sans-serif; font-size:14px; font-weight:600;">${safeLabel}</a>
          <p style="margin:24px 0 0; font-family: Arial, sans-serif; font-size:12px; line-height:1.7; color:#8a8578;">${safeFooter}</p>
          <p style="margin:16px 0 0; font-family: Arial, sans-serif; font-size:11px; line-height:1.7; color:#b0aa9d; word-break:break-all;">${safeHref}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildRichLayout({
  preview,
  title,
  paragraphs,
  quote,
  ctaLabel,
  ctaHref,
  footer,
}: {
  preview: string;
  title: string;
  paragraphs: string[];
  quote?: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer: string;
}) {
  const safePreview = escapeHtml(preview);
  const safeTitle = escapeHtml(title);
  const safeFooter = escapeHtml(footer);
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px; font-family: Arial, sans-serif; font-size:15px; line-height:1.7; color:#4a4a4a;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const quoteHtml = quote
    ? `<blockquote style="margin:16px 0 24px; padding:16px 20px; background:#f5f0e6; border-left:3px solid #c9a961; font-family: Georgia, serif; font-style:italic; font-size:15px; line-height:1.65; color:#4a4a4a;">« ${escapeHtml(quote)} »</blockquote>`
    : "";
  const ctaHtml =
    ctaLabel && ctaHref
      ? `<div style="margin:8px 0 24px;"><a href="${ctaHref}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:#0f3d2e; color:#ffffff; text-decoration:none; font-family: Arial, sans-serif; font-size:14px; font-weight:600;">${escapeHtml(ctaLabel)}</a></div>`
      : "";
  const signature = `<p style="margin:24px 0 4px; font-family: Georgia, serif; font-style:italic; font-size:15px; color:#0f3d2e;">— Sara, pour Hilmy</p>`;

  return `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Georgia, serif; color:#4a4a4a;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:28px; line-height:1.2; color:#0f3d2e; font-weight:600;">${safeTitle}</h1>
          ${bodyHtml}
          ${quoteHtml}
          ${ctaHtml}
          ${signature}
          <p style="margin:20px 0 0; font-family: Arial, sans-serif; font-size:11px; line-height:1.7; color:#b0aa9d;">${safeFooter}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const from = getOptionalEnv("EMAIL_FROM") || "Hilmy <hello@hilmy.io>";
  const resendApiKey = getOptionalEnv("RESEND_API_KEY");
  const recipients = Array.isArray(to) ? to : [to];

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Resend email failed: ${response.status} ${errorText}`.trim());
    }

    return;
  }

  const transporter = nodemailer.createTransport({
    host: getOptionalEnv("BREVO_SMTP_HOST") || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT || 587),
    secure: false,
    auth: {
      user: getRequiredEnv("BREVO_SMTP_USER"),
      pass: getRequiredEnv("BREVO_SMTP_KEY"),
    },
  });

  await transporter.sendMail({
    from,
    to: recipients.join(", "),
    subject,
    html,
  });
}

function getFounderRecipients() {
  const value = getOptionalEnv("FOUNDER_NOTIFICATION_EMAILS");

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Notification founders à chaque nouvel événement publié (Stage 9 chantier 2A).
 * Best-effort : si FOUNDER_NOTIFICATION_EMAILS n'est pas configuré, on no-op.
 */
export async function sendNewEventToFounders({
  eventTitle,
  eventDate,
  city,
  organisatriceEmail,
  eventUrl,
}: {
  eventTitle: string;
  eventDate: string;
  city?: string | null;
  organisatriceEmail?: string | null;
  eventUrl: string;
}) {
  const recipients = getFounderRecipients();
  if (recipients.length === 0) return;

  const safeTitle = escapeHtml(eventTitle);
  const safeCity = escapeHtml(city ?? "—");
  const safeOrg = escapeHtml(organisatriceEmail ?? "inconnue");
  const dateFr = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendEmail({
    to: recipients,
    subject: `Nouvel événement publié — ${eventTitle}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Arial, sans-serif; color:#4a4a4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px; font-family: Georgia, serif;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:24px; line-height:1.2; color:#0f3d2e; font-family: Georgia, serif; font-weight:600;">Nouvel événement publié</h1>
          <p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#8a8578;">Une membre vient de publier un événement sur Hilmy.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; width:160px;">Titre</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${safeTitle}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">Date</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${escapeHtml(dateFr)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">Ville</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${safeCity}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; border-bottom:1px solid #eee;">Organisatrice</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a; border-bottom:1px solid #eee; word-break:break-all;">${safeOrg}</td>
            </tr>
          </table>
          <div style="margin:24px 0 0;">
            <a href="${eventUrl}" style="display:inline-block; padding:12px 20px; border-radius:999px; background:#0f3d2e; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600;">Voir la fiche</a>
          </div>
          <p style="margin:20px 0 0; font-size:11px; line-height:1.7; color:#b0aa9d;">Notification automatique — pas de validation admin requise pour les événements (Stage 9).</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}

export async function sendSignupEmail(to: string, confirmationUrl: string) {
  await sendEmail({
    to,
    subject: "Bienvenue sur Hilmy",
    html: buildEmailLayout({
      preview: "Confirme ton compte Hilmy",
      title: "Confirme ton compte",
      intro: "Ton compte est presque prêt. Clique sur le bouton ci-dessous pour confirmer ton email et rejoindre Hilmy.",
      ctaLabel: "Confirmer mon compte",
      ctaHref: confirmationUrl,
      footer: "Si tu n'es pas à l'origine de cette demande, tu peux ignorer ce message.",
    }),
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: "Réinitialise ton mot de passe Hilmy",
    html: buildEmailLayout({
      preview: "Réinitialise ton mot de passe",
      title: "Réinitialise ton mot de passe",
      intro: "On a reçu une demande de réinitialisation. Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.",
      ctaLabel: "Changer mon mot de passe",
      ctaHref: resetUrl,
      footer: "Si tu n'as rien demandé, tu peux ignorer cet email en toute sécurité.",
    }),
  });
}

function getSiteUrl() {
  return (
    getOptionalEnv("NEXT_PUBLIC_SITE_URL") ||
    getOptionalEnv("SITE_URL") ||
    "https://hilmy.io"
  );
}

/**
 * Stage 7 — 5 emails transactionnels.
 * Tous en voix Sara (tutoiement, chaleureux, "entre copines").
 * Layout rich via buildRichLayout (signature "— Sara, pour Hilmy").
 */

export async function sendFicheApprouvee({
  to,
  prenom,
  nomFiche,
  ficheSlug,
}: {
  to: string;
  prenom: string;
  nomFiche: string;
  ficheSlug: string;
}) {
  const ficheUrl = `${getSiteUrl()}/prestataire-v2/${ficheSlug}`;
  await sendEmail({
    to,
    subject: "Ta fiche Hilmy est en ligne 🌸",
    html: buildRichLayout({
      preview: `Ta fiche ${nomFiche} est publiée`,
      title: `${prenom}, ta fiche est en ligne.`,
      paragraphs: [
        `Bonne nouvelle : ta fiche ${nomFiche} vient d'être validée par l'équipe. Elle est maintenant visible dans l'annuaire — les copines peuvent la découvrir, la sauvegarder, et surtout te contacter directement sur WhatsApp.`,
        `On te conseille de la partager toi-même à une ou deux clientes proches pour amorcer les premiers avis. Les trois premiers comptent triple pour la mise en avant.`,
      ],
      ctaLabel: "Voir ma fiche publique",
      ctaHref: ficheUrl,
      footer:
        "Tu peux gérer ta fiche à tout moment depuis ton dashboard. Un souci ? Réponds directement à cet email.",
    }),
  });
}

export async function sendFicheRejetee({
  to,
  prenom,
  nomFiche,
  raisons,
}: {
  to: string;
  prenom: string;
  nomFiche: string;
  raisons: string;
}) {
  const dashboardUrl = `${getSiteUrl()}/dashboard/prestataire/fiche`;
  await sendEmail({
    to,
    subject: "Ta fiche Hilmy nécessite quelques ajustements",
    html: buildRichLayout({
      preview: "Petits ajustements à apporter avant publication",
      title: `${prenom}, on a besoin de quelques ajustements.`,
      paragraphs: [
        `Merci d'avoir créé ta fiche ${nomFiche}. Avant de la mettre en ligne, on aimerait que tu revoies certains points — c'est pour que tout soit à la hauteur de ce que tu proposes.`,
        `Voici ce qu'on te suggère :`,
      ],
      quote: raisons,
      ctaLabel: "Modifier ma fiche",
      ctaHref: dashboardUrl,
      footer:
        "Dès que tu as fait les ajustements, resoumet — on la repasse en revue sous 24h.",
    }),
  });
}

export async function sendNouvelAvisRecu({
  to,
  prestaPrenom,
  auteurPrenom,
  avisExcerpt,
  ficheSlug,
}: {
  to: string;
  prestaPrenom: string;
  auteurPrenom: string;
  avisExcerpt: string;
  ficheSlug: string;
}) {
  const avisUrl = `${getSiteUrl()}/dashboard/prestataire/avis`;
  const excerpt =
    avisExcerpt.length > 200
      ? `${avisExcerpt.slice(0, 200).trim()}…`
      : avisExcerpt;
  await sendEmail({
    to,
    subject: "Une copine a laissé un avis sur ta fiche ✨",
    html: buildRichLayout({
      preview: `${auteurPrenom} vient de laisser un avis`,
      title: `${prestaPrenom}, un nouvel avis vient d'arriver.`,
      paragraphs: [
        `${auteurPrenom} a partagé son expérience sur ta fiche. Voilà ce qu'elle a écrit :`,
      ],
      quote: excerpt,
      ctaLabel: "Répondre à cet avis",
      ctaHref: avisUrl,
      footer: `Ficheref: ${ficheSlug} — un mot de remerciement prend dix secondes et ça se voit dans les retours suivants.`,
    }),
  });
}

export async function sendNouvelleInscriptionEvent({
  to,
  prestaPrenom,
  eventTitre,
  inscritePrenom,
  eventDate,
  dashboardUrl,
}: {
  to: string;
  prestaPrenom: string;
  eventTitre: string;
  inscritePrenom: string;
  eventDate: string;
  dashboardUrl?: string;
}) {
  const url =
    dashboardUrl || `${getSiteUrl()}/dashboard/prestataire/evenements`;
  const dateFr = new Date(eventDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  await sendEmail({
    to,
    subject: `Nouvelle inscription à ${eventTitre}`,
    html: buildRichLayout({
      preview: `${inscritePrenom} vient de s'inscrire`,
      title: `${prestaPrenom}, ${inscritePrenom} vient de s'inscrire.`,
      paragraphs: [
        `Bonne nouvelle : ${inscritePrenom} a réservé une place pour ton événement ${eventTitre} du ${dateFr}.`,
        `Tu peux voir la liste complète des inscrites depuis ton dashboard, et leur envoyer un mot de bienvenue si tu le souhaites.`,
      ],
      ctaLabel: "Voir mes événements",
      ctaHref: url,
      footer:
        "Chaque inscription compte — merci de prendre soin de celles qui viennent.",
    }),
  });
}

/**
 * Email envoyé aux inscrites quand un événement est annulé —
 * soit par l'organisatrice (Stage 11 chantier 3 · bug #6),
 * soit par l'équipe Hilmy (Stage 12 · sujet 2 admin retrait).
 */
export async function sendEventCancelledEmail({
  to,
  prenom,
  eventTitre,
  eventDate,
  raison,
  source = "organisatrice",
}: {
  to: string;
  prenom?: string | null;
  eventTitre: string;
  eventDate: string;
  raison?: string | null;
  /** Qui annule — change le wording de l'email */
  source?: "organisatrice" | "admin";
}) {
  const dateFr = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hello = prenom
    ? `${prenom}, l'événement est annulé.`
    : "L'événement est annulé.";

  const intro =
    source === "admin"
      ? `L'événement ${eventTitre} prévu ${dateFr} a dû être retiré par l'équipe Hilmy.`
      : `Désolée pour ce contretemps : l'événement ${eventTitre} prévu ${dateFr} ne pourra finalement pas avoir lieu.`;

  const raisonLine = raison
    ? source === "admin"
      ? `Motif communiqué par l'équipe : « ${raison} »`
      : `Mot de l'organisatrice : « ${raison} »`
    : source === "admin"
      ? `L'équipe Hilmy a décidé de le retirer.`
      : `L'organisatrice a dû l'annuler.`;

  const paragraphs = [
    intro,
    raisonLine,
    `Ton inscription est automatiquement annulée — tu n'as rien à faire.${source === "admin" ? " On comprend la déception ; merci d'avoir fait confiance au carnet." : " On te tient au courant si elle reprogramme un nouveau créneau."}`,
  ];

  await sendEmail({
    to,
    subject: `Événement annulé — ${eventTitre}`,
    html: buildRichLayout({
      preview: `${eventTitre} annulé`,
      title: hello,
      paragraphs,
      footer: "Tu peux retrouver d'autres moments à venir sur Hilmy.",
    }),
  });
}

export async function sendConfirmationInscriptionEvent({
  to,
  prenom,
  eventTitre,
  eventDate,
  eventVille,
  eventAdresse,
  eventUrl,
}: {
  to: string;
  prenom?: string;
  eventTitre: string;
  eventDate: string;
  eventVille?: string | null;
  /** Adresse précise — révélée uniquement dans l'email aux inscrites. */
  eventAdresse?: string | null;
  eventUrl?: string;
}) {
  const url = eventUrl || getSiteUrl();
  const dateFr = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hello = prenom ? `${prenom}, c'est validé.` : "C'est validé.";

  // Composition du "lieu" : adresse précise + ville si on a les deux, sinon juste ce qu'on a
  const lieuParts: string[] = [];
  if (eventAdresse) lieuParts.push(eventAdresse);
  if (eventVille && eventVille !== eventAdresse) lieuParts.push(eventVille);
  const lieuFull = lieuParts.join(", ");

  const paragraphs = [
    `Ton inscription à ${eventTitre} est enregistrée. Rendez-vous ${dateFr}${lieuFull ? `, ${lieuFull}` : ""}.`,
    eventAdresse
      ? `L'adresse précise n'est visible que pour les inscrites — prends bien note de la conserver pour le jour J.`
      : `On t'enverra un rappel la veille avec tous les détails pratiques.`,
    `Tu peux retrouver toutes les infos de l'événement sur ta page.`,
  ];

  await sendEmail({
    to,
    subject: `Inscription confirmée — ${eventTitre}`,
    html: buildRichLayout({
      preview: `${eventTitre} — ${dateFr}`,
      title: hello,
      paragraphs,
      ctaLabel: "Voir l'événement",
      ctaHref: url,
      footer:
        "Besoin d'annuler ? Tu peux le faire depuis ton dashboard jusqu'à 24h avant.",
    }),
  });
}

export async function sendFounderSignupNotification({
  email,
  signupType,
  redirectPath,
  userId,
  createdAt,
}: {
  email: string;
  signupType: "member" | "provider";
  redirectPath?: string;
  userId?: string;
  createdAt?: string;
}) {
  const recipients = getFounderRecipients();

  if (recipients.length === 0) {
    return;
  }

  const accountLabel = signupType === "provider" ? "Prestataire" : "Utilisatrice";
  const safeEmail = escapeHtml(email);
  const safeRedirectPath = escapeHtml(redirectPath || "/onboarding");
  const safeUserId = escapeHtml(userId || "inconnu");
  const safeCreatedAt = escapeHtml(createdAt || new Date().toISOString());

  await sendEmail({
    to: recipients,
    subject: `Nouvelle inscription Hilmy - ${accountLabel}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Arial, sans-serif; color:#4a4a4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px; font-family: Georgia, serif;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:28px; line-height:1.2; color:#0f3d2e; font-family: Georgia, serif; font-weight:600;">Nouvelle inscription</h1>
          <p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#8a8578;">Une nouvelle ${accountLabel.toLowerCase()} vient de créer un compte.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; width:180px;">Email</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">Type de compte</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${accountLabel}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">Parcours prévu</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a;">${safeRedirectPath}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">User ID Supabase</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a; word-break:break-all;">${safeUserId}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; border-bottom:1px solid #eee;">Créé à</td>
              <td style="padding:10px 0; border-top:1px solid #eee; color:#4a4a4a; border-bottom:1px solid #eee;">${safeCreatedAt}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}