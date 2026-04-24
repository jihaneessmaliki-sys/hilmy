#!/usr/bin/env bash
# Inspecte le schéma des 5 tables cibles via PostgREST OpenAPI.
# N'affiche QUE les noms de colonnes + types — aucune donnée.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load env
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || "$SUPABASE_SERVICE_ROLE_KEY" == "PLACEHOLDER_TO_REPLACE" || "$SUPABASE_SERVICE_ROLE_KEY" == "à_remplir_plus_tard" ]]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY non défini ou placeholder. Remplir .env.local."
  exit 1
fi

URL="${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/"
OPENAPI_JSON=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$URL")

if ! echo "$OPENAPI_JSON" | jq -e . >/dev/null 2>&1; then
  echo "❌ Réponse non-JSON depuis $URL"
  echo "$OPENAPI_JSON" | head -20
  exit 1
fi

TABLES=(profiles places events recommendations user_profiles favoris event_inscriptions waitlist reports event_reports place_reports recommendation_reports uploads admins)

echo "================================================================="
echo "SUPABASE · Inspection schéma — tables cibles"
echo "Source : OpenAPI PostgREST (pas d'accès aux données, schéma only)"
echo "================================================================="

for T in "${TABLES[@]}"; do
  echo ""
  echo "───── $T ─────"
  EXISTS=$(echo "$OPENAPI_JSON" | jq -r --arg t "$T" '.definitions | has($t)')
  if [[ "$EXISTS" != "true" ]]; then
    echo "  (absente)"
    continue
  fi
  echo "$OPENAPI_JSON" | jq -r --arg t "$T" '
    .definitions[$t].properties
    | to_entries
    | map("  • \(.key) : \(.value.format // .value.type)\(if .value.description then "  [" + (.value.description|gsub("\n";" ")|.[0:60]) + "]" else "" end)")
    | .[]
  '
done

echo ""
echo "================================================================="
echo "Inspection terminée."
echo "================================================================="
