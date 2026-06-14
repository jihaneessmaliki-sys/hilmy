/**
 * backfill-pays-prestataires.mjs — script ONE-SHOT local (PR2).
 *
 * Objectif : rattraper les fiches prestataires (table `profiles`) créées avant
 * la capture automatique du pays (PR1). On géocode leur `ville` via Google
 * Geocoding API (language=fr) pour en déduire le `pays`, et on remplit la
 * colonne `pays` UNIQUEMENT là où elle est vide.
 *
 * ⚠️ Ce script n'est JAMAIS appelé par l'app en production. Il s'exécute à la
 *    main depuis la machine de dev. Il lit ses secrets depuis `.env.local`
 *    (aucune clé en dur). Il utilise la clé service-role en LOCAL uniquement.
 *
 * Modes (aucune écriture sauf --apply) :
 *   node scripts/backfill-pays-prestataires.mjs --sample
 *       → géocode l'échantillon de validation + compte les fiches. N'écrit rien.
 *   node scripts/backfill-pays-prestataires.mjs --dry-run
 *       → géocode TOUTES les villes distinctes sans pays. N'écrit rien.
 *   node scripts/backfill-pays-prestataires.mjs --apply
 *       → géocode puis UPDATE `pays` là où il est vide. Écrit en base.
 *
 * Garde-fou : une ville non résolue par Google (ZERO_RESULTS / pas de country)
 * n'est PAS écrite → la fiche reste `pays = NULL` → bucket « Pays non précisé ».
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE || !GOOGLE_KEY) {
  console.error(
    'Secrets manquants dans .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY',
  )
  process.exit(1)
}

const MODE = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--dry-run')
    ? 'dry-run'
    : process.argv.includes('--sample')
      ? 'sample'
      : null

if (!MODE) {
  console.error('Précise un mode : --sample | --dry-run | --apply')
  process.exit(1)
}

// Échantillon de validation demandé (cas simples + 2 pièges).
const SAMPLE = [
  'Genève',
  'Bruxelles',
  'Toulouse',
  "Genève Et a L'international",
  'Publier',
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

const isEmpty = (v) => !v || String(v).trim() === ''

/**
 * Géocode une ville via la Places API v1 (searchText) → { pays, status,
 * formatted }. On utilise Places v1 (et non Geocoding) car c'est l'API activée
 * sur la clé Hilmy — la même que l'app. Le pays est le `country.longText` (FR).
 */
async function geocode(ville) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.formattedAddress,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: ville, languageCode: 'fr' }),
  })
  const json = await res.json()
  if (json.error) {
    return { pays: null, status: json.error.status || 'ERROR', formatted: null }
  }
  const top = json.places?.[0]
  if (!top) return { pays: null, status: 'ZERO_RESULTS', formatted: null }
  const countryComp = top.addressComponents?.find((c) =>
    c.types?.includes('country'),
  )
  return {
    pays: countryComp?.longText ?? null,
    status: 'OK',
    formatted: top.formattedAddress ?? null,
  }
}

/** Récupère toutes les fiches sans pays, groupées par ville exacte (trim). */
async function fetchVillesSansPays() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, ville, pays')
  if (error) throw new Error(error.message)
  const groups = new Map() // villeTrim -> { ville, ids: [] }
  for (const row of data) {
    if (!isEmpty(row.pays)) continue
    if (isEmpty(row.ville)) continue // pas de ville → ingéocodable, on laisse NULL
    const key = row.ville.trim()
    if (!groups.has(key)) groups.set(key, { ville: key, ids: [] })
    groups.get(key).ids.push(row.id)
  }
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length)
}

function printRow(ville, nb, pays, status) {
  const paysAff = pays ?? `— (NULL → « Pays non précisé »)`
  console.log(
    `  ${ville.padEnd(34)} | fiches: ${String(nb).padStart(2)} | Google: ${status.padEnd(12)} | pays: ${paysAff}`,
  )
}

async function run() {
  console.log(`\n=== Backfill pays — MODE: ${MODE} ===\n`)

  if (MODE === 'sample') {
    // Comptage réel des fiches concernées pour l'échantillon.
    const groups = await fetchVillesSansPays()
    const counts = new Map(groups.map((g) => [g.ville, g.ids.length]))
    console.log('Échantillon (aucune écriture) :\n')
    for (const ville of SAMPLE) {
      const { pays, status } = await geocode(ville)
      printRow(ville, counts.get(ville) ?? 0, pays, status)
    }
    console.log('\n(stop — en attente de validation de l’échantillon)')
    return
  }

  // dry-run + apply : on traite toutes les villes distinctes sans pays.
  const groups = await fetchVillesSansPays()
  console.log(`${groups.length} villes distinctes sans pays :\n`)

  let resolved = 0
  let updated = 0
  const unresolved = []

  for (const g of groups) {
    const { pays, status } = await geocode(g.ville)
    printRow(g.ville, g.ids.length, pays, status)
    if (!pays) {
      unresolved.push(g.ville)
      continue
    }
    resolved++
    if (MODE === 'apply') {
      const { error } = await supabase
        .from('profiles')
        .update({ pays })
        .in('id', g.ids)
      if (error) {
        console.error(`    ⚠️ UPDATE échec pour ${g.ville}: ${error.message}`)
      } else {
        updated += g.ids.length
      }
    }
  }

  console.log(
    `\nRésumé : ${resolved}/${groups.length} villes résolues` +
      (MODE === 'apply' ? ` — ${updated} fiches mises à jour.` : ' (dry-run, aucune écriture).'),
  )
  if (unresolved.length) {
    console.log(
      `Non résolues (restent « Pays non précisé ») : ${unresolved.join(', ')}`,
    )
  }
}

run().catch((e) => {
  console.error('Erreur :', e.message)
  process.exit(1)
})
