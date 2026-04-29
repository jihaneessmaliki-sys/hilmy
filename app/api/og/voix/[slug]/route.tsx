import { ImageResponse } from "next/og";
import { getVoixBySlug } from "@/lib/supabase/queries/voix";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

// Source de vérité pour ces hex : app/globals.css @theme inline.
// Si tu modifies ici, vérifie l'alignement avec --color-vert-soft etc.
const COLORS = {
  vert: "#0F3D2E",
  vertSoft: "#1a4a3a",
  or: "#C9A961",
  orLight: "#E5D4AF",
  creme: "#F5F0E6",
};

const FRAUNCES_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

/**
 * Charge un sous-ensemble de glyphs Google Fonts pour un texte donné.
 * Utilise le paramètre &text= : Google retourne uniquement les
 * caractères présents → payload minimal (~3-5 KB par fonte).
 *
 * User-Agent custom pour forcer Google à retourner du WOFF/TTF
 * (Satori, le moteur de rendu de next/og, n'accepte pas WOFF2).
 */
async function loadFontSubset(
  family: string,
  weight: number,
  italic: boolean,
  text: string,
): Promise<ArrayBuffer> {
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:${axis}&text=${encodeURIComponent(text)}&display=swap`;

  const css = await fetch(cssUrl, {
    headers: { "User-Agent": FRAUNCES_USER_AGENT },
  }).then((r) => r.text());

  const fontUrl = css.match(/src: url\((https:\/\/[^)]+)\)/)?.[1];
  if (!fontUrl) {
    throw new Error(`Font URL introuvable pour ${family} ${weight}`);
  }

  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

/**
 * Tronque une bio au dernier mot avant la limite, ajoute … (U+2026).
 */
function truncateBio(bio: string, max = 120): string {
  if (bio.length <= max) return bio;
  const truncated = bio.slice(0, max);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated;
  return cut + "…";
}

/**
 * GET /api/og/voix/[slug] — image OG dynamique 1200×630.
 * Cache 1h fresh + 24h stale-while-revalidate au niveau Vercel Edge.
 *
 * Edge cases :
 *   • slug introuvable → PNG fallback générique (status 200) pour ne
 *     pas casser le preview Insta/WA si quelqu'un partage un mauvais
 *     lien. Le fallback dit "Créatrice Hilmy — page introuvable".
 *   • recos_count = 0 → libellé "Premières recos à venir" (validé
 *     comme moins mou que "Pas encore de recos").
 *   • Voix désactivée (is_voix_hilmy = false ou slug NULL) : la vue
 *     voix_hilmy_public la filtre déjà → tombe dans le cas slug
 *     introuvable → fallback PNG.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { data: voix } = await getVoixBySlug(slug);

  if (!voix) {
    return await renderFallback();
  }

  // Belt-and-suspenders : la CHECK constraint user_profiles_voix_complete
  // (mig 24) garantit bio NOT NULL pour is_voix_hilmy=true, mais
  // un rollback partiel ou une modif manuelle DB pourrait laisser
  // un état incohérent. Coût zéro, robustesse garantie.
  if (!voix.bio) {
    return await renderFallback();
  }

  const bioTruncated = truncateBio(voix.bio);
  const initial = voix.prenom.charAt(0).toUpperCase();
  const counterLabel =
    voix.recos_count > 0
      ? `${voix.recos_count} recos partagées`
      : "Premières recos à venir";
  const footerSlug = `hilmy.io/${voix.slug}`;

  // Tous les textes qu'on doit pouvoir rendre — sert aux subsets fonts.
  // Pas de ✦ : Fraunces et DM Sans n'ont pas le glyph U+2726, ce qui
  // déclenche un fallback Satori → Google Fonts dynamic font 400.
  // L'identité visuelle de la badge passe par le fond `or`, le texte
  // uppercase et le tracking.
  const allText = [
    "CRÉATRICE",
    voix.prenom,
    bioTruncated,
    counterLabel,
    footerSlug,
    "Hilmy",
    initial,
    "«» ",
  ].join(" ");

  const [fraunces600, fraunces600Italic, dmSans600] = await Promise.all([
    loadFontSubset("Fraunces", 600, false, allText),
    loadFontSubset("Fraunces", 600, true, allText),
    loadFontSubset("DM Sans", 600, false, allText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          background: `linear-gradient(135deg, ${COLORS.vert} 0%, ${COLORS.vertSoft} 100%)`,
          fontFamily: "DM Sans",
          color: COLORS.creme,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: COLORS.or,
            color: COLORS.vert,
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 2,
            alignSelf: "flex-start",
          }}
        >
          CRÉATRICE
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 48,
            gap: 48,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 120,
              background: `linear-gradient(135deg, ${COLORS.or} 0%, ${COLORS.orLight} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Fraunces",
              fontSize: 120,
              fontWeight: 600,
              color: COLORS.vert,
              border: `4px solid ${COLORS.or}`,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 88,
                fontWeight: 600,
                lineHeight: 1.05,
                color: COLORS.creme,
              }}
            >
              {voix.prenom}
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 28,
                fontStyle: "italic",
                lineHeight: 1.4,
                color: COLORS.creme,
                marginTop: 18,
                opacity: 0.92,
              }}
            >
              {`« ${bioTruncated} »`}
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 36,
                fontWeight: 600,
                color: COLORS.or,
                marginTop: 24,
              }}
            >
              {counterLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            fontFamily: "DM Sans",
            fontSize: 24,
            color: COLORS.or,
            fontWeight: 600,
          }}
        >
          <span>{footerSlug}</span>
          <span style={{ letterSpacing: 1 }}>Hilmy</span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces600,
          weight: 600,
          style: "normal",
        },
        {
          name: "Fraunces",
          data: fraunces600Italic,
          weight: 600,
          style: "italic",
        },
        {
          name: "DM Sans",
          data: dmSans600,
          weight: 600,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

/**
 * PNG générique si la Voix n'existe pas (preview cassé évité).
 *
 * Charge Fraunces 600 normal pour rester cohérent avec le brand
 * (sinon Satori fait un fallback silencieux sur sa fonte par défaut
 * — sans-serif système, hors charte). Pas besoin d'italic ni de
 * DM Sans : le fallback n'a que 3 lignes en Fraunces.
 *
 * Cache-Control 5 min volontairement court : si la cause du 404 est
 * fixée (ex: slug typo), le preview se met à jour rapidement sur
 * tous les CDN sociaux.
 */
async function renderFallback(): Promise<ImageResponse> {
  const fallbackText = "Créatrice Hilmy Page introuvable hilmy.io";
  const fraunces600 = await loadFontSubset(
    "Fraunces",
    600,
    false,
    fallbackText,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${COLORS.vert} 0%, ${COLORS.vertSoft} 100%)`,
          color: COLORS.creme,
          padding: 80,
          fontFamily: "Fraunces",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            color: COLORS.creme,
          }}
        >
          Créatrice Hilmy
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 16,
            opacity: 0.85,
          }}
        >
          Page introuvable
        </div>
        <div
          style={{
            fontSize: 22,
            marginTop: 56,
            color: COLORS.or,
            fontWeight: 600,
          }}
        >
          hilmy.io
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces600,
          weight: 600,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
