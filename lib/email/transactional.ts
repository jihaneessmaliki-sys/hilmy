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