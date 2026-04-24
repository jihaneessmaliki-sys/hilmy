#!/usr/bin/env bash
# Vérifie le résultat de l'exécution des 8 migrations Stage 4.
# Aucune modification, lecture seule.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)
API="https://api.supabase.com/v1/projects/$PROJECT_REF/database/query"
AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")

run_query() {
  local label="$1"
  local query="$2"
  local payload
  payload=$(jq -Rs '{query: .}' <<< "$query")
  echo ""
  echo "─── $label ───"
  curl -sS "${AUTH[@]}" -X POST "$API" -d "$payload" \
    | jq -r 'if type=="array" then if length==0 then "(aucun résultat)" else (map(to_entries|map("\(.key)=\(.value)")|join(" · "))|join("\n")) end else . end'
}

echo "════════════════════════════════════════════════════════════════"
echo "STAGE 4 · Vérifications post-exécution"
echo "════════════════════════════════════════════════════════════════"

run_query "1. profiles : 14 nouvelles colonnes" \
"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name IN ('tagline','email','site_web','linkedin','services','galerie','prix_from','prix_gamme','devise','source_import','approved_at','note_moyenne','nb_avis','nb_vues') ORDER BY column_name;"

run_query "2. places : 3 nouvelles colonnes" \
"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='places' AND column_name IN ('slug','description','photos') ORDER BY column_name;"

run_query "3. events : 5 nouvelles colonnes" \
"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name IN ('slug','visibility','places_max','inscrites_count','prestataire_id') ORDER BY column_name;"

run_query "4. recommendations : 2 nouvelles colonnes" \
"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='recommendations' AND column_name IN ('reponse_pro','reponse_date') ORDER BY column_name;"

run_query "5. Nouvelle table favoris" \
"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='favoris';"

run_query "6. Nouvelle table event_inscriptions" \
"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='event_inscriptions';"

run_query "7. RLS activée sur favoris et event_inscriptions" \
"SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('favoris','event_inscriptions') ORDER BY tablename;"

run_query "8. Policies RLS créées (favoris + event_inscriptions)" \
"SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('favoris','event_inscriptions') ORDER BY tablename, policyname;"

run_query "9. Triggers de compteurs créés" \
"SELECT tgname, tgrelid::regclass as table_name FROM pg_trigger WHERE tgname IN ('recommendations_refresh_prestataire_stats','event_inscriptions_refresh_count','profiles_approved_at_trigger','recommendations_reponse_date','event_inscriptions_updated_at') ORDER BY tgname;"

run_query "10. CHECK constraint profiles.categorie (10 valeurs)" \
"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='profiles_categorie_check';"

run_query "11. CHECK constraint places.hilmy_category (9 valeurs)" \
"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='places_hilmy_category_check';"

run_query "12. 4 buckets Storage créés" \
"SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('prestataire-photos','recommendation-photos','event-flyers','user-avatars') ORDER BY id;"

run_query "13. Policies Storage créées" \
"SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'hilmy_buckets_%' ORDER BY policyname;"

run_query "14. ⚠️ PRÉSERVATION : user_profiles doit TOUJOURS avoir 2 lignes" \
"SELECT COUNT(*) as rows_user_profiles FROM public.user_profiles;"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Vérifications terminées."
echo "════════════════════════════════════════════════════════════════"
