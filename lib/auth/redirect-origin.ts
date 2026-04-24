// Retourne l'origin du site depuis lequel l'utilisatrice interagit.
//
// NE PAS hardcoder `https://hilmy.io` : sur Vercel preview,
// `process.env.NODE_ENV === "production"` vaut aussi `true`. Hardcoder
// prod enverrait les emails recovery/confirmation vers hilmy.io même
// quand la user teste sur une URL preview, cassant tout le flow
// callback (voir Stage 11 — bug reset password).
//
// En prod réelle, la request arrive sur https://hilmy.io → origin correct.
// En preview, origin = https://hilmy-xxx.vercel.app → correct.
// En dev local, origin = http://localhost:PORT → correct.
//
// Supabase Auth doit avoir ces 3 patterns dans "Redirect URLs" :
//   https://hilmy.io/auth/callback
//   https://*.vercel.app/auth/callback
//   http://localhost:*_/auth/callback  (remplacer _ par rien — wildcard)
export function getRequestOrigin(request: Request): string {
  return new URL(request.url).origin;
}
