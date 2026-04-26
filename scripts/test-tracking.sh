#!/usr/bin/env bash
# Smoke test du tracking Hilmy.
# Usage : ./scripts/test-tracking.sh [PROFILE_UUID]
#   - si PROFILE_UUID n'est pas fourni, on utilise un UUID existant à
#     remplacer manuellement dans la commande.
#
# Pré-requis :
#   - migration 15_tracking.sql appliquée (Supabase SQL Editor)
#   - npm run dev tourne sur :3000
#
# Attendu :
#   1. body manquant         → 400
#   2. profile_id non-uuid   → 400
#   3. profile_id inexistant → 400 (FK violation)
#   4. profile_id valide     → 204 + ligne en DB + nb_vues++
#   5. contact_type invalide → 400
#   6. contact_type valide   → 204

set -u

BASE="${BASE:-http://localhost:3000}"
PROFILE_ID="${1:-00000000-0000-0000-0000-000000000000}"

echo "=== /api/track/view ==="

echo "[1] body absent (POST sans content):"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/track/view")
echo "    HTTP $code   (attendu 400)"

echo "[2] profile_id non-uuid:"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/track/view" \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"pas-un-uuid"}')
echo "    HTTP $code   (attendu 400)"

echo "[3] profile_id inexistant (UUID valide mais pas en DB):"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/track/view" \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"00000000-0000-0000-0000-000000000000"}')
echo "    HTTP $code   (attendu 400)"

echo "[4] profile_id valide ($PROFILE_ID) — 3 hits debounce-bypass (différents Origin):"
for i in 1 2 3; do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/api/track/view" \
    -H "Content-Type: application/json" \
    -d "{\"profile_id\":\"$PROFILE_ID\"}")
  echo "    hit $i → HTTP $code   (attendu 204)"
done

echo
echo "=== /api/track/contact ==="

echo "[5] contact_type invalide:"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/track/contact" \
  -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_ID\",\"contact_type\":\"telegram\"}")
echo "    HTTP $code   (attendu 400)"

echo "[6] contact_type valide (whatsapp):"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/track/contact" \
  -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_ID\",\"contact_type\":\"whatsapp\"}")
echo "    HTTP $code   (attendu 204)"

echo
echo "Done."
echo "Vérifie côté DB (Supabase SQL Editor) :"
echo "  select count(*) from public.profile_views where profile_id = '$PROFILE_ID';"
echo "  select nb_vues from public.profiles where id = '$PROFILE_ID';"
echo "  select * from public.profile_contacts where profile_id = '$PROFILE_ID' order by clicked_at desc limit 5;"
