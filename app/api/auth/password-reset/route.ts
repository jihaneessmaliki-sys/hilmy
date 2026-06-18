import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/transactional";
import { getRequestOrigin } from "@/lib/auth/redirect-origin";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type PasswordResetPayload = {
  email?: string;
};

function getRedirectTo(request: Request) {
  return `${getRequestOrigin(request)}/auth/callback`;
}

// Anti-timing : on aligne la durée de toutes les réponses « non
// révélatrices » (succès comme email inconnu / échec generateLink) sur
// une cible constante. L'envoi email étant désormais fire-and-forget
// (cf. plus bas), la seule variance résiduelle entre « compte existe » et
// « compte inconnu » est la latence de generateLink ; le padding jusqu'à
// cette cible l'absorbe. Cible choisie > latence typique de generateLink.
const RESPONSE_TARGET_MS = 900;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 1. Rate-limit par IP — assoupli pour le trafic mobile NATé/CGNAT
  //    (plusieurs utilisatrices derrière une même IP sortante). Sert de
  //    garde-fou volumétrique, pas de protection par cible (cf. limite
  //    par email plus bas).
  const limitedByIp = enforceRateLimit(request, {
    tag: "auth-password-reset-ip",
    max: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limitedByIp) return limitedByIp;

  let payload: PasswordResetPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();

  // 400 sur email malformé : c'est une erreur de syntaxe, elle ne révèle
  // pas l'existence d'un compte (un email valide mais inconnu renverra un
  // 200, cf. plus bas).
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  // 2. Rate-limit par email — empêche le mail-bombing d'une cible précise
  //    par un attaquant qui tourne ses IP (la limite IP seule ne suffit
  //    pas). Le 429 est identique que le compte existe ou non → pas
  //    d'énumération via cette limite. La clé est un hash SHA-256 de
  //    l'email : on évite de garder une PII en clair dans le cache mémoire
  //    (cf. règle « jamais de PII en clair » AGENTS.md). Pas besoin de sel,
  //    le but est juste de ne pas stocker l'email lisible.
  const limitedByEmail = enforceRateLimit(request, {
    tag: "auth-password-reset-email",
    key: createHash("sha256").update(email).digest("hex"),
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (limitedByEmail) return limitedByEmail;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: getRedirectTo(request),
      },
    });

    if (error || !data?.properties?.hashed_token) {
      // Email inconnu ou échec generateLink : on NE révèle RIEN au client.
      // Log serveur uniquement, message STATIQUE (pas de `error.message`
      // brut — il peut contenir l'email ou des détails de compte selon la
      // version de gotrue → règle « jamais de PII dans les logs » AGENTS.md),
      // puis réponse 200 uniforme commune au cas nominal.
      console.error("[password-reset] generateLink échec — réponse 200 uniforme");
    } else {
      // Build a direct link to our own callback with the token_hash.
      // Bypasse Supabase /auth/v1/verify qui renvoie les tokens en hash
      // fragment (inaccessibles au server) — cf. Stage 12 diagnostic reset.
      const resetUrl = `${getRedirectTo(request)}?token_hash=${data.properties.hashed_token}&type=recovery`;

      // Fire-and-forget : on N'AWAIT PAS l'envoi. Sinon le chemin « email
      // existe » (generateLink + Resend/Brevo) durerait plus longtemps que
      // le chemin « email inconnu », rouvrant une fuite d'énumération par
      // timing sur la queue de distribution. L'erreur d'envoi est capturée
      // et loggée sans PII (runtime nodejs : le handler rend la main après
      // le return, l'envoi part avant freeze du conteneur).
      void sendPasswordResetEmail(email, resetUrl).catch(() => {
        console.error("[password-reset] envoi email échoué (post-réponse)");
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";

    // Config serveur incomplète : 503 légitime. Cet état est global (il ne
    // dépend pas de l'email fourni) donc ne permet aucune énumération.
    if (message.includes("Missing environment variable")) {
      return NextResponse.json(
        { error: "Configuration email incomplète côté serveur." },
        { status: 503 }
      );
    }

    // Toute autre erreur : log serveur STATIQUE (pas de `message` brut, il
    // peut contenir une URL/des params → PII) puis réponse 200 uniforme,
    // comme le cas nominal — on ne distingue jamais un échec d'un succès.
    console.error("[password-reset] erreur inattendue — réponse 200 uniforme");
  }

  // Réponse identique dans tous les cas non-config, alignée sur une durée
  // constante (anti-timing + anti-énumération).
  const elapsed = Date.now() - startedAt;
  if (elapsed < RESPONSE_TARGET_MS) {
    await sleep(RESPONSE_TARGET_MS - elapsed);
  }

  return NextResponse.json({ ok: true });
}
