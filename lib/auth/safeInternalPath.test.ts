// Tests safeInternalPath — exécutables sans runner :
//   node --experimental-strip-types lib/auth/safeInternalPath.test.ts
// (le repo n'a pas de vitest/jest ; on reste autonome et zéro dépendance.)

import { safeInternalPath } from './safeInternalPath.ts'

let passed = 0
let failed = 0
function expect(input: string | null | undefined, fallback: string, want: string) {
  const got = safeInternalPath(input, fallback)
  const ok = got === want
  if (ok) passed++
  else {
    failed++
    console.error(`FAIL  safeInternalPath(${JSON.stringify(input)}) → ${JSON.stringify(got)} (attendu ${JSON.stringify(want)})`)
  }
}

const FB = '/onboarding'

// — Bypass open-redirect : doivent TOUS tomber sur le fallback —
expect('//evil.com', FB, FB)
expect('/\\evil.com', FB, FB)
expect('https:/evil.com', FB, FB)
expect('https://evil.com', FB, FB)
expect('http://evil.com', FB, FB)
expect('javascript:alert(1)', FB, FB)
expect('data:text/html,x', FB, FB)
expect('/tarifs\\@evil.com', FB, FB)   // backslash
expect('/\t/evil', FB, FB)             // ne commence pas par "/x" autorisé
expect('evil.com', FB, FB)             // pas de "/" en tête
expect('', FB, FB)
expect(null, FB, FB)
expect(undefined, FB, FB)
expect('/secret/admin', FB, FB)        // chemin interne mais hors allowlist

// — Chemins légitimes : doivent passer tels quels —
expect('/tarifs', FB, '/tarifs')
expect('/tarifs?palier=premium&context=onboarding', FB, '/tarifs?palier=premium&context=onboarding')
expect('/mon-compte', FB, '/mon-compte')
expect('/mon-profil-prestataire', FB, '/mon-profil-prestataire')
expect('/dashboard/abonnement', FB, '/dashboard/abonnement')
expect('/onboarding', FB, '/onboarding')

console.log(`\n${passed} passés, ${failed} échoués`)
if (failed > 0) {
  // @ts-expect-error — Node global
  process.exit(1)
}
