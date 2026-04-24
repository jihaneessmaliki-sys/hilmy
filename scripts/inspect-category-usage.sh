#!/usr/bin/env bash
# Vérifie les valeurs distinctes de certaines colonnes pour s'assurer que
# les CHECK constraints qu'on va poser n'entreront pas en conflit avec
# des données existantes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

BASE="${NEXT_PUBLIC_SUPABASE_URL}/rest/v1"
HDR_APIKEY=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY")
HDR_AUTH=(-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

echo "─────── profiles ───────"
echo "Total rows :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" \
  -H "Prefer: count=exact" -H "Range: 0-0" -I "$BASE/profiles" | grep -i "content-range" || echo "  (0)"

echo ""
echo "Catégories distinctes :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" "$BASE/profiles?select=categorie" | jq -r '[.[].categorie] | unique | .[]' 2>/dev/null | sed 's/^/  • /' || echo "  (aucune)"

echo ""
echo "Status distincts :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" "$BASE/profiles?select=status" | jq -r '[.[].status] | unique | .[]' 2>/dev/null | sed 's/^/  • /' || echo "  (aucune)"

echo ""
echo "─────── places ───────"
echo "Total rows :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" \
  -H "Prefer: count=exact" -H "Range: 0-0" -I "$BASE/places" | grep -i "content-range" || echo "  (0)"

echo ""
echo "Catégories hilmy_category distinctes :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" "$BASE/places?select=hilmy_category" | jq -r '[.[].hilmy_category] | unique | .[]' 2>/dev/null | sed 's/^/  • /' || echo "  (aucune)"

echo ""
echo "─────── events ───────"
echo "Total rows :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" \
  -H "Prefer: count=exact" -H "Range: 0-0" -I "$BASE/events" | grep -i "content-range" || echo "  (0)"

echo ""
echo "Status distincts :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" "$BASE/events?select=status" | jq -r '[.[].status] | unique | .[]' 2>/dev/null | sed 's/^/  • /' || echo "  (aucune)"

echo ""
echo "─────── recommendations ───────"
echo "Total rows :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" \
  -H "Prefer: count=exact" -H "Range: 0-0" -I "$BASE/recommendations" | grep -i "content-range" || echo "  (0)"

echo ""
echo "Types distincts :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" "$BASE/recommendations?select=type" | jq -r '[.[].type] | unique | .[]' 2>/dev/null | sed 's/^/  • /' || echo "  (aucune)"

echo ""
echo "─────── user_profiles ───────"
echo "Total rows :"
curl -s "${HDR_APIKEY[@]}" "${HDR_AUTH[@]}" \
  -H "Prefer: count=exact" -H "Range: 0-0" -I "$BASE/user_profiles" | grep -i "content-range" || echo "  (0)"
