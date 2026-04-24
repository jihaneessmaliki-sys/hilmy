import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type SubscribePayload = {
  email?: string
  source?: string
}

export async function POST(request: Request) {
  let payload: SubscribePayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const email = payload.email?.trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: "Ton email a l'air bancal, check-le." },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()

    // upsert = si l'email existe déjà, on ne fait rien (idempotent).
    // La table waitlist n'a pas de colonne `source` (vérifié via OpenAPI
    // Stage 5) — on ignore le champ pour l'instant, à ajouter via ALTER
    // si tu veux tracer la provenance.
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      // 23505 = violation contrainte unique → déjà inscrite, c'est OK
      if (error.code === '23505') {
        return NextResponse.json({
          ok: true,
          message: 'Tu étais déjà dans le carnet, rassure-toi 💌',
        })
      }
      return NextResponse.json(
        { error: "Petit pépin de notre côté. Réessaie dans un instant." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Bienvenue dans le carnet 💌',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    if (message.includes('Missing environment variable')) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète.' },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: "Petit pépin de notre côté. Réessaie dans un instant." },
      { status: 500 },
    )
  }
}
