#!/usr/bin/env bash
# Smoke test du rate limit Hilmy.
# Usage : ./scripts/test-rate-limit.sh   (suppose `npm run dev` lancé sur :3000)
#
# Attendu :
#   - signup     : 5 réponses != 429, puis 5 réponses 429 (max 5 / 15min)
#   - subscribe  : 5 réponses != 429, puis 5 réponses 429 (max 5 / 60s)
#   - places     : 30 OK puis bursts 429

set -u

BASE="${BASE:-http://localhost:3000}"

echo "=== /api/auth/signup (5 max / 15min) ==="
for i in $(seq 1 10); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit-test@hilmy.io","password":"motdepasse-bidon-12345"}')
  echo "  attempt $i  →  HTTP $code"
done

echo
echo "=== /api/subscribe (5 max / 60s) ==="
for i in $(seq 1 8); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/api/subscribe" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit-test@hilmy.io"}')
  echo "  attempt $i  →  HTTP $code"
done

echo
echo "=== Vérif headers de sécurité (HEAD /) ==="
curl -sI "$BASE/" | grep -iE 'strict-transport|x-frame|x-content|referrer|permissions-policy|content-security|report-to'

echo
echo "=== Test CSP report endpoint ==="
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/csp-report" \
  -H "Content-Type: application/csp-report" \
  -d '{"csp-report":{"document-uri":"http://localhost:3000/","violated-directive":"script-src","blocked-uri":"https://evil.example"}}')
echo "  /api/csp-report → HTTP $code (attendu : 204)"

echo
echo "Done. Si tu vois des 429 dans les blocs ci-dessus, le rate limit fonctionne."
echo "Pour relire les violations CSP : regarde le terminal où tourne 'npm run dev'."
