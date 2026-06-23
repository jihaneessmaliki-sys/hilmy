/**
 * Scaffold Instagram — VOIE OFFICIELLE uniquement (Instagram API with Instagram
 * Login). AUCUN scraping, jamais.
 *
 * Ce module est DORMANT tant que l'app Meta n'est pas validée : tout est gardé
 * derrière `getInstagramConfig()`, qui renvoie `null` si les variables d'env
 * `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` sont absentes. Les routes OAuth
 * refusent alors de démarrer (redirect "non configuré"), donc rien ne casse en
 * prod tant que les clés ne sont pas fournies côté Vercel.
 *
 * Données ciblées (et UNIQUEMENT celles-ci) :
 *   - username
 *   - biography (bio)
 *   - profile_picture_url (photo de profil)
 *   - 6 derniers posts (media_url + permalink + caption)
 *
 * Scopes : `instagram_business_basic` (lecture profil + media d'un compte
 * Business ou Creator connecté par sa propriétaire). On ne demande RIEN de
 * plus (pas de publication, pas de messagerie, pas d'insights).
 *
 * Réf. Meta : "Instagram API with Instagram Login" (remplace l'ancien
 * Instagram Basic Display, déprécié le 4 décembre 2024).
 */

const AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com";

// On ne demande que la lecture basique du profil + des médias.
export const INSTAGRAM_SCOPES = ["instagram_business_basic"] as const;

// Nombre de posts importés pour la galerie de la fiche.
export const INSTAGRAM_POST_COUNT = 6;

export type InstagramConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export function instagramRedirectUri(): string {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.hilmy.io"
  ).replace(/\/$/, "");
  return `${site}/api/onboarding/instagram/callback`;
}

/**
 * Renvoie la config Instagram, ou `null` si l'app Meta n'est pas branchée.
 * C'est le seul point de vérité : si ça renvoie null, la feature est OFF.
 */
export function getInstagramConfig(): InstagramConfig | null {
  const appId = process.env.INSTAGRAM_APP_ID?.trim();
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret, redirectUri: instagramRedirectUri() };
}

export function isInstagramConfigured(): boolean {
  return getInstagramConfig() !== null;
}

/** URL d'autorisation OAuth vers laquelle on redirige la prestataire. */
export function instagramAuthorizeUrl(state: string): string {
  const cfg = getInstagramConfig();
  if (!cfg) throw new Error("Instagram non configuré");
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

type ShortTokenResponse = { access_token: string; user_id: string };

/** Échange le `code` OAuth contre un access token court (1h). */
export async function exchangeCodeForToken(
  code: string,
): Promise<ShortTokenResponse | null> {
  const cfg = getInstagramConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    code,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<ShortTokenResponse>;
  if (!data.access_token || !data.user_id) return null;
  return { access_token: data.access_token, user_id: String(data.user_id) };
}

export type InstagramPost = {
  id: string;
  media_url: string | null;
  permalink: string | null;
  caption: string | null;
};

export type InstagramImport = {
  username: string;
  biography: string | null;
  profile_picture_url: string | null;
  posts: InstagramPost[];
};

/**
 * Récupère le profil (username, bio, photo) + les 6 derniers posts via la
 * Graph API Instagram. Aucune donnée n'est persistée ici : on renvoie l'objet
 * brut, c'est la couche au-dessus (preview puis publication) qui décide.
 */
export async function fetchInstagramImport(
  accessToken: string,
): Promise<InstagramImport | null> {
  const profileFields = "username,biography,profile_picture_url";
  const profileRes = await fetch(
    `${GRAPH_BASE}/me?fields=${profileFields}&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!profileRes.ok) return null;
  const profile = (await profileRes.json()) as {
    username?: string;
    biography?: string;
    profile_picture_url?: string;
  };

  const mediaFields = "id,media_url,permalink,caption,media_type";
  const mediaRes = await fetch(
    `${GRAPH_BASE}/me/media?fields=${mediaFields}&limit=${INSTAGRAM_POST_COUNT}&access_token=${encodeURIComponent(accessToken)}`,
  );
  const media = mediaRes.ok
    ? ((await mediaRes.json()) as {
        data?: {
          id: string;
          media_url?: string;
          permalink?: string;
          caption?: string;
        }[];
      })
    : { data: [] };

  return {
    username: profile.username ?? "",
    biography: profile.biography ?? null,
    profile_picture_url: profile.profile_picture_url ?? null,
    posts: (media.data ?? []).slice(0, INSTAGRAM_POST_COUNT).map((m) => ({
      id: m.id,
      media_url: m.media_url ?? null,
      permalink: m.permalink ?? null,
      caption: m.caption ?? null,
    })),
  };
}
