#!/usr/bin/env node
// Test isolé de la connexion Brevo SMTP avec les credentials de .env.local.
// Lecture-only côté .env, test en VERIFY (pas d'envoi) puis en envoi réel si demandé.
//
// Usage :
//   node scripts/test-brevo-smtp.mjs           → VERIFY seulement (auth + connexion)
//   node scripts/test-brevo-smtp.mjs --send    → envoie un email à BREVO_SMTP_USER

import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

function loadEnv() {
  try {
    const raw = readFileSync(
      new URL("../.env.local", import.meta.url),
      "utf8",
    );
    const env = {};
    for (const line of raw.split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return env;
  } catch (e) {
    console.error("Impossible de lire .env.local:", e.message);
    process.exit(1);
  }
}

function censor(value, keepStart = 4, keepEnd = 2) {
  if (!value) return "(absent)";
  if (value.length <= keepStart + keepEnd + 3) return "***";
  return `${value.slice(0, keepStart)}…${value.slice(-keepEnd)}`;
}

async function main() {
  const env = loadEnv();

  const host = env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(env.BREVO_SMTP_PORT || 587);
  const user = env.BREVO_SMTP_USER;
  const pass = env.BREVO_SMTP_KEY;
  const from = env.EMAIL_FROM || "Hilmy <hello@hilmy.io>";

  console.log("────────────── CONFIG ──────────────");
  console.log("  host :", host);
  console.log("  port :", port);
  console.log("  user :", user);
  console.log("  pass :", censor(pass, 6, 4));
  console.log("  from :", from);

  if (!user || !pass) {
    console.error("\n❌ BREVO_SMTP_USER ou BREVO_SMTP_KEY manquant. Abandon.");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // STARTTLS sur port 587
    auth: { user, pass },
    logger: true,
    debug: false,
  });

  console.log("\n────────────── VERIFY ─────────────");
  try {
    await transporter.verify();
    console.log("✅ Auth Brevo OK — connexion SMTP établie.");
  } catch (e) {
    console.error("❌ Verify a échoué :");
    console.error("  message    :", e.message);
    if (e.code) console.error("  code       :", e.code);
    if (e.responseCode) console.error("  responseCode:", e.responseCode);
    if (e.response) console.error("  response   :", e.response);
    process.exit(2);
  }

  if (!process.argv.includes("--send")) {
    console.log(
      "\n(Passe --send pour envoyer un email de test à " + user + ")",
    );
    return;
  }

  console.log("\n────────────── SEND ──────────────");
  // Destinataire : EMAIL_FROM s'il contient un email, sinon BREVO_SMTP_USER.
  // Override possible via --to=xxx@example.com
  const toArg = process.argv.find((a) => a.startsWith("--to="));
  const fromMatch = from.match(/<([^>]+)>/);
  const recipient =
    (toArg && toArg.slice(5)) || (fromMatch && fromMatch[1]) || user;
  console.log("  to (destinataire) :", recipient);
  try {
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: "HILMY · Test SMTP Stage 6A diagnostic",
      html: `<p>Test de connexion Brevo depuis <strong>scripts/test-brevo-smtp.mjs</strong>. Si tu lis ce mail, le transport fonctionne.</p>`,
    });
    console.log("✅ Email envoyé.");
    console.log("  messageId :", info.messageId);
    console.log("  accepted  :", info.accepted);
    console.log("  rejected  :", info.rejected);
    console.log("  response  :", info.response);
  } catch (e) {
    console.error("❌ sendMail a échoué :");
    console.error("  message     :", e.message);
    if (e.code) console.error("  code        :", e.code);
    if (e.responseCode) console.error("  responseCode:", e.responseCode);
    if (e.response) console.error("  response    :", e.response);
    process.exit(3);
  }
}

main().catch((e) => {
  console.error("Crash:", e);
  process.exit(99);
});
