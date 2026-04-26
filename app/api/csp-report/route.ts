import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Reçoit les rapports de violation CSP envoyés par les navigateurs.
 * Format legacy (report-uri) ET nouveau (Reporting API / report-to) sont
 * acceptés. Les violations sont loggées sur stdout, donc visibles dans :
 *   - `next dev` → terminal local
 *   - Vercel    → onglet "Logs" du déploiement
 *
 * Mode REPORT-ONLY actif : aucune ressource n'est bloquée, on observe
 * uniquement. Une fois la liste de violations stabilisée (24-48h prod),
 * basculer "Content-Security-Policy-Report-Only" → "Content-Security-Policy"
 * dans next.config.js.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    const body = await request.text()

    let parsed: unknown = body
    if (contentType.includes('json')) {
      try {
        parsed = JSON.parse(body)
      } catch {
        // garde le texte brut si JSON invalide
      }
    }

    console.warn('[CSP-VIOLATION]', JSON.stringify(parsed))
  } catch (err) {
    console.error('[CSP-REPORT] failed to parse', err)
  }

  return new NextResponse(null, { status: 204 })
}
