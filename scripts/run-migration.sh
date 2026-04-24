#!/usr/bin/env bash
# Exécute un fichier SQL via l'API Supabase Management.
# Usage : ./scripts/run-migration.sh supabase/migrations/01_alter_profiles.sql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <chemin-fichier.sql>" >&2
  exit 2
fi

FILE="$1"
if [[ ! -f "$FILE" ]]; then
  echo "❌ Fichier introuvable : $FILE" >&2
  exit 2
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" || "$SUPABASE_ACCESS_TOKEN" == "PLACEHOLDER_PAT" ]]; then
  echo "❌ SUPABASE_ACCESS_TOKEN absent ou placeholder." >&2
  exit 2
fi

PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)

# JSON-encode le contenu SQL avec jq (gère quotes, newlines, unicode)
PAYLOAD=$(jq -Rs '{query: .}' < "$FILE")

RESPONSE_BODY="/tmp/migration-resp-$$.txt"
HTTP_CODE=$(curl -sS -o "$RESPONSE_BODY" -w "%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "── $(basename "$FILE") ──"
echo "HTTP $HTTP_CODE"

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "✅ succès"
  # Si la réponse est un tableau non vide, on affiche un court aperçu
  if jq -e 'type=="array" and length>0' "$RESPONSE_BODY" >/dev/null 2>&1; then
    echo "Réponse : $(jq -c 'if length>3 then .[0:3]+["..."] else . end' "$RESPONSE_BODY")"
  fi
  rm -f "$RESPONSE_BODY"
  exit 0
else
  echo "❌ ÉCHEC"
  echo "Corps de la réponse :"
  cat "$RESPONSE_BODY"
  echo
  rm -f "$RESPONSE_BODY"
  exit 1
fi
