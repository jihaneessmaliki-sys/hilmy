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
  const ficheUrl = `${getSiteUrl()}/prestataires/${ficheSlug}`;
  await sendEmail({
    to,
    subject: "Bienvenue dans Hilmy 🌸",
    html: buildRichLayout({
      preview: `Ta fiche ${nomFiche} est en ligne`,
      title: `${prenom}, bienvenue dans Hilmy.`,
      paragraphs: [
        `Ça y est, tu fais partie des copines. Ta fiche est en ligne dans l'annuaire et les clientes peuvent déjà te trouver. Si tu ne l'as pas encore fait, prends deux minutes pour la compléter — plus elle est vivante, plus on te repère. À très vite 🌸`,
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
  await sendEmail({
    to,
    subject: "Ta fiche Hilmy a été retirée",
    html: buildRichLayout({
      preview: `Ta fiche ${nomFiche} a été retirée de l'annuaire`,
      title: `${prenom}, ta fiche a été retirée.`,
      paragraphs: [
        `Après vérification, ta fiche ne correspond pas à ce qu'on accueille dans Hilmy, et nous l'avons retirée de l'annuaire. Ton abonnement a été annulé et remboursé. Si tu penses qu'il s'agit d'une erreur, tu peux nous écrire en répondant à cet email.`,
      ],
      footer:
        "Hilmy · Réponds directement à cet email pour toute question.",
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

/**
 * Stats hebdo prestataires Premium / Cercle Pro (Phase 4 — promesse /tarifs).
 * Envoyée chaque lundi matin par /api/cron/stats-hebdo.
 *
 * Best-effort : on ne block pas le cron si une seule envoi rate (catch
 * côté caller pour log + continuer).
 */
export async function sendStatsHebdoPrestataire({
  to,
  prenom,
  nomFiche,
  ficheSlug,
  views7d,
  views7dPrev,
  contacts7d,
  contacts7dPrev,
  palierLabel,
}: {
  to: string;
  prenom: string;
  nomFiche: string;
  ficheSlug: string;
  views7d: number;
  views7dPrev: number;
  contacts7d: number;
  contacts7dPrev: number;
  palierLabel: string;
}) {
  const dashboardUrl = `${getSiteUrl()}/dashboard/prestataire`;

  function trendLine(label: string, current: number, prev: number): string {
    if (prev === 0 && current === 0) {
      return `${label} : ${current} cette semaine.`;
    }
    if (prev === 0) {
      return `${label} : ${current} cette semaine (premier signal — bravo).`;
    }
    const delta = current - prev;
    const pct = Math.round((delta / prev) * 100);
    if (delta > 0) {
      return `${label} : ${current} cette semaine (+${pct}% vs semaine dernière).`;
    }
    if (delta < 0) {
      return `${label} : ${current} cette semaine (${pct}% vs semaine dernière).`;
    }
    return `${label} : ${current} cette semaine (stable).`;
  }

  await sendEmail({
    to,
    subject: `Tes stats Hilmy de la semaine — ${nomFiche}`,
    html: buildRichLayout({
      preview: `${views7d} vues · ${contacts7d} contacts cette semaine`,
      title: `${prenom}, ta semaine en chiffres.`,
      paragraphs: [
        `Voici un petit résumé de ce qui s'est passé sur ta fiche ${nomFiche} (palier ${palierLabel}) ces 7 derniers jours.`,
        trendLine("Vues fiche", views7d, views7dPrev),
        trendLine("Tap-to-contact (WhatsApp, email, réseaux…)", contacts7d, contacts7dPrev),
        contacts7d === 0 && views7d > 0
          ? `Beaucoup de visites mais peu de contacts ? Vérifie tes canaux (WhatsApp, Instagram) — c'est souvent là que ça bloque.`
          : `Continue ce que tu fais — chaque semaine, ça se construit.`,
      ],
      ctaLabel: "Voir mon dashboard détaillé",
      ctaHref: dashboardUrl,
      footer:
        "Tu reçois cet email parce que tu es abonnée Premium ou Cercle Pro. Tu peux désactiver les stats hebdo depuis tes paramètres dashboard.",
    }),
  });
}

/**
 * Module Je cherche (Phase 6) — 3 emails transactionnels.
 */

export async function sendNewResponseToDemandeuse({
  to,
  prenom,
  demandeTitle,
  demandeId,
  responderPrenom,
  responseExcerpt,
  prestataireNom,
}: {
  to: string;
  prenom: string;
  demandeTitle: string;
  demandeId: string;
  responderPrenom: string;
  responseExcerpt: string;
  prestataireNom?: string | null;
}) {
  const url = `${getSiteUrl()}/je-cherche/${demandeId}`;
  const excerpt =
    responseExcerpt.length > 200
      ? `${responseExcerpt.slice(0, 200).trim()}…`
      : responseExcerpt;
  await sendEmail({
    to,
    subject: `Une copine t'a répondu sur "${demandeTitle}"`,
    html: buildRichLayout({
      preview: `${responderPrenom} a partagé une reco`,
      title: `${prenom}, ${responderPrenom} t'a répondu.`,
      paragraphs: [
        `Voici ce que ${responderPrenom} a partagé sur ta demande "${demandeTitle}" :`,
      ],
      quote: prestataireNom
        ? `${excerpt}\n\n— Adresse recommandée : ${prestataireNom}`
        : excerpt,
      ctaLabel: "Voir la reco",
      ctaHref: url,
      footer:
        "Tu peux marquer ta demande comme trouvée depuis la page si la reco te convient. Et n'hésite pas à remercier la copine d'un ♥.",
    }),
  });
}

export async function sendDemandeResolvedToFounders({
  demandeTitle,
  demandeId,
  responseCount,
  resolvedAt,
}: {
  demandeTitle: string;
  demandeId: string;
  responseCount: number;
  resolvedAt: string;
}) {
  const recipients = getFounderRecipients();
  if (recipients.length === 0) return;
  const url = `${getSiteUrl()}/je-cherche/${demandeId}`;
  await sendEmail({
    to: recipients,
    subject: `[STATS] Demande résolue : "${demandeTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Arial, sans-serif; color:#4a4a4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px; font-family: Georgia, serif;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:22px; line-height:1.2; color:#0f3d2e; font-family: Georgia, serif; font-weight:600;">Demande résolue</h1>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr><td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; width:160px;">Titre</td><td style="padding:10px 0; border-top:1px solid #eee;">${escapeHtml(demandeTitle)}</td></tr>
            <tr><td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e;">Réponses</td><td style="padding:10px 0; border-top:1px solid #eee;">${responseCount}</td></tr>
            <tr><td style="padding:10px 0; border-top:1px solid #eee; font-weight:600; color:#0f3d2e; border-bottom:1px solid #eee;">Résolue à</td><td style="padding:10px 0; border-top:1px solid #eee; border-bottom:1px solid #eee;">${escapeHtml(resolvedAt)}</td></tr>
          </table>
          <div style="margin:24px 0 0;">
            <a href="${url}" style="display:inline-block; padding:12px 20px; border-radius:999px; background:#0f3d2e; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600;">Voir la demande</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}

export async function sendSignalementToFounders({
  reason,
  comment,
  targetType,
  targetId,
  targetExcerpt,
  reporterPrenom,
}: {
  reason: string;
  comment?: string | null;
  targetType: "demande" | "response";
  targetId: string;
  targetExcerpt: string;
  reporterPrenom?: string | null;
}) {
  const recipients = getFounderRecipients();
  if (recipients.length === 0) return;
  const safeExcerpt =
    targetExcerpt.length > 300
      ? `${targetExcerpt.slice(0, 300).trim()}…`
      : targetExcerpt;
  await sendEmail({
    to: recipients,
    subject: `[SIGNALEMENT] ${reason} sur ${targetType}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:24px; background:#f5f0e6; font-family: Arial, sans-serif; color:#4a4a4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto;">
      <tr>
        <td style="padding:24px; background:#ffffff; border:1px solid rgba(201,169,97,0.2); border-radius:16px;">
          <div style="font-size:28px; line-height:1; color:#0f3d2e; margin-bottom:20px; font-family: Georgia, serif;">Hilmy</div>
          <h1 style="margin:0 0 16px; font-size:22px; line-height:1.2; color:#0f3d2e; font-family: Georgia, serif; font-weight:600;">Nouveau signalement</h1>
          <p style="margin:0 0 12px; font-size:14px; color:#4a4a4a;">
            <strong>Cible :</strong> ${escapeHtml(targetType)} (${escapeHtml(targetId)})<br/>
            <strong>Raison :</strong> ${escapeHtml(reason)}<br/>
            <strong>Reporter :</strong> ${escapeHtml(reporterPrenom ?? "anonyme")}
          </p>
          ${
            comment
              ? `<p style="margin:0 0 16px; font-size:13px; padding:12px; background:#f5f0e6; border-radius:8px;"><em>"${escapeHtml(comment)}"</em></p>`
              : ""
          }
          <p style="margin:16px 0 8px; font-size:12px; font-weight:600; color:#0f3d2e;">Extrait du contenu signalé :</p>
          <blockquote style="margin:0 0 16px; padding:12px 16px; background:#fef6f5; border-left:3px solid #d4847a; font-size:13px; line-height:1.55;">${escapeHtml(safeExcerpt)}</blockquote>
          <a href="${getSiteUrl()}/admin/je-cherche-signalements" style="display:inline-block; padding:12px 20px; border-radius:999px; background:#0f3d2e; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600;">Voir dans l'admin</a>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}

/**
 * Devis Express (Cercle Pro · Phase 4) — email envoyé à la prestataire
 * quand une utilisatrice soumet une demande de devis depuis sa fiche.
 *
 * Le contact (téléphone, email) de l'utilisatrice est inclus pour que
 * la prestataire puisse répondre directement out-of-band. La trace
 * en DB sert d'archive + dashboard.
 */
export async function sendDevisExpressEmail({
  to,
  prestaPrenom,
  ficheNom,
  utilisatricePrenom,
  utilisatriceEmail,
  utilisatriceTelephone,
  message,
  dashboardUrl,
}: {
  to: string;
  prestaPrenom: string;
  ficheNom: string;
  utilisatricePrenom: string;
  utilisatriceEmail: string;
  utilisatriceTelephone?: string | null;
  message: string;
  dashboardUrl: string;
}) {
  const contactLines = [
    `Email : ${utilisatriceEmail}`,
    utilisatriceTelephone ? `Téléphone : ${utilisatriceTelephone}` : null,
  ].filter(Boolean) as string[];

  await sendEmail({
    to,
    subject: `Demande de devis — ${utilisatricePrenom} via Hilmy`,
    html: buildRichLayout({
      preview: `${utilisatricePrenom} te contacte pour un devis`,
      title: `${prestaPrenom}, ${utilisatricePrenom} te demande un devis.`,
      paragraphs: [
        `Une copine vient de soumettre une demande de devis sur ta fiche ${ficheNom} via Hilmy. Voici son message :`,
      ],
      quote: message,
      ctaLabel: "Voir mes demandes de devis",
      ctaHref: dashboardUrl,
      footer: `Pour répondre, écris-lui directement : ${contactLines.join(" · ")}. Tu peux marquer cette demande comme traitée depuis ton dashboard.`,
    }),
  });
}

/* ───────────────────────────────────────────────────────────────
   Pro Perks (mig 50 — Phase 5)

   Trois notifications encadrent le workflow de modération :
   1. sendPerkPendingReview  → admins/founders quand un presta soumet
   2. sendPerkApproved        → presta quand admin valide
   3. sendPerkRejected        → presta quand admin refuse (+ raison)

   Recipients admins via getFounderRecipients() — décision D3 Phase 5
   (un seul canal admin/founders, cf sendNewEventToFounders pattern).
   ─────────────────────────────────────────────────────────────── */

/**
 * Notification founders : un prestataire vient de soumettre un perk
 * pour modération. Best-effort : no-op si FOUNDER_NOTIFICATION_EMAILS
 * absent.
 */
export async function sendPerkPendingReview({
  perkTitle,
  prestaNom,
  discountLabel,
  adminUrl,
}: {
  perkTitle: string;
  prestaNom: string;
  discountLabel: string;
  adminUrl: string;
}) {
  const recipients = getFounderRecipients();
  if (recipients.length === 0) return;

  await sendEmail({
    to: recipients,
    subject: `Nouvelle offre Cercle Pro à modérer — ${perkTitle}`,
    html: buildRichLayout({
      preview: `${prestaNom} vient de soumettre une offre pour les Copines`,
      title: "Une offre Cercle Pro à modérer.",
      paragraphs: [
        `${prestaNom} vient de créer une nouvelle offre pour les Copines : « ${perkTitle} » — ${discountLabel}.`,
        "Elle est en file de modération. Valide-la pour qu'elle apparaisse aux Copines, ou refuse-la avec une raison si elle ne convient pas.",
      ],
      ctaLabel: "Voir la queue de modération",
      ctaHref: adminUrl,
      footer: "Tu reçois ce mail parce que ton email est listé dans FOUNDER_NOTIFICATION_EMAILS.",
    }),
  });
}

/**
 * Notification prestataire : son perk a été approuvé et est en ligne
 * pour les Copines. Copy Sara stricte (cf brief Phase 5).
 */
export async function sendPerkApproved({
  to,
  prestaPrenom,
  perkTitle,
  dashboardUrl,
}: {
  to: string;
  prestaPrenom: string;
  perkTitle: string;
  dashboardUrl: string;
}) {
  await sendEmail({
    to,
    subject: `Ton offre Copines est en ligne — ${perkTitle}`,
    html: buildRichLayout({
      preview: `Ton offre ${perkTitle} est validée`,
      title: `${prestaPrenom}, ton offre est en ligne.`,
      paragraphs: [
        `Ton offre « ${perkTitle} » est en ligne. Les Copines peuvent maintenant en profiter.`,
        "Elles vont la voir apparaître dans leurs avantages, et chaque code utilisé sera tracé dans ton dashboard.",
      ],
      ctaLabel: "Voir mon offre",
      ctaHref: dashboardUrl,
      footer: "La team Hilmy.",
    }),
  });
}

/**
 * Notification prestataire : son perk a été refusé avec une raison.
 * La raison est obligatoire côté UI admin (cf PerkModerationRow).
 */
export async function sendPerkRejected({
  to,
  prestaPrenom,
  perkTitle,
  rejectionReason,
  dashboardUrl,
}: {
  to: string;
  prestaPrenom: string;
  perkTitle: string;
  rejectionReason: string;
  dashboardUrl: string;
}) {
  await sendEmail({
    to,
    subject: `Ton offre Copines n'a pas pu être validée — ${perkTitle}`,
    html: buildRichLayout({
      preview: `Ton offre ${perkTitle} n'a pas été validée`,
      title: `${prestaPrenom}, on a une remarque sur ton offre.`,
      paragraphs: [
        `Ton offre « ${perkTitle} » n'a pas pu être validée. Raison : ${rejectionReason}.`,
        "Tu peux la modifier et la resoumettre quand tu veux. Si tu veux en discuter, réponds à ce mail — on lit tout.",
      ],
      ctaLabel: "Modifier mon offre",
      ctaHref: dashboardUrl,
      footer: "La team Hilmy.",
    }),
  });
}

/* ───────────────────────────────────────────────────────────────
   Pass Copine welcome (mig 50 — Phase 6)

   Déclenché par le webhook Stripe customer.subscription.created (et
   par checkout.session.completed via persistCopineSubscription) à la
   PREMIÈRE activation Copine — détecté côté webhook par
   `copine_since IS NULL avant l'UPDATE`. Pas de table dédiée pour
   l'idempotence — risque résiduel de doublon en cas de re-trigger
   Stripe en parallèle (acceptable cf décision D2 Phase 6).
   ─────────────────────────────────────────────────────────────── */

/**
 * Email de bienvenue Pass Copine — envoyé au premier abo réussi.
 * Best-effort : la fonction lève si Resend/Brevo down ; le caller
 * (webhook) catch et log pour ne pas faire échouer le webhook lui-même.
 */
export async function sendCopineWelcome({
  to,
  prenom,
  dashboardUrl,
}: {
  to: string;
  /** Prénom de la Copine — fallback "coucou" si absent. */
  prenom: string | null;
  dashboardUrl: string;
}) {
  const safePrenom = prenom && prenom.length > 0 ? prenom : "coucou";
  await sendEmail({
    to,
    subject: "Bienvenue dans la team Copines",
    html: buildRichLayout({
      preview: "Tu es officiellement Copine Hilmy",
      title: `Coucou ${safePrenom},`,
      paragraphs: [
        "Te voilà officiellement Copine Hilmy. Ton badge est posé, tes favoris débloqués, tes avantages Cercle Pro t'attendent.",
        "Voici ce que tu peux faire dès maintenant :",
        "1. Découvrir les avantages Copines de tes prestataires préférées",
        "2. T'inscrire aux Rendez-vous Hilmy en accès anticipé, 48h avant tout le monde",
        "3. Sauvegarder toutes les adresses qui te font envie, sans limite",
        "Si tu as une question, réponds à cet email. On lit tout.",
      ],
      ctaLabel: "Voir mes avantages",
      ctaHref: dashboardUrl,
      footer: "La team Hilmy.",
    }),
  });
}