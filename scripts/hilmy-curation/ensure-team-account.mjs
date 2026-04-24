// =====================================================================
// HILMY · Curation · Ensure "Équipe Hilmy" account exists
// =====================================================================
// Idempotent : crée (ou réutilise) l'utilisatrice auth "hilmy.io@hotmail.com"
// + user_profiles("Équipe Hilmy", Genève, Suisse). Email auto-confirmé.
//
// Usage : node --env-file=.env.local scripts/hilmy-curation/ensure-team-account.mjs
// Output : print user_id à coller dans les scripts suivants.
// =====================================================================

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = "hilmy.io@hotmail.com";
const PRENOM = "Équipe Hilmy";
const VILLE = "Genève";
const PAYS = "Suisse";

if (!URL || !KEY) {
  console.error("❌ env manquant (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const AUTH = `${URL}/auth/v1`;
const REST = `${URL}/rest/v1`;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function findAuthUserIdByEmail(email) {
  // auth.admin.listUsers : https://supabase.com/docs/reference/api/admin-listusers
  // Filter via ?email= (beta feature ; si absent, on filtre en JS).
  const res = await fetch(`${AUTH}/admin/users?per_page=200`, { headers: H });
  if (!res.ok) throw new Error(`listUsers: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const list = data.users ?? data; // shape varies
  const hit = list.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
  );
  return hit ? hit.id : null;
}

async function createAuthUser(email) {
  // Generate a random strong password (not used, email will be PW-reset if needed)
  const pw =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
  const res = await fetch(`${AUTH}/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      email,
      password: pw,
      email_confirm: true,
      user_metadata: { signupType: "member", display_name: PRENOM },
    }),
  });
  if (!res.ok) throw new Error(`createUser: ${res.status} ${await res.text()}`);
  const user = await res.json();
  return { id: user.id, password: pw };
}

async function upsertUserProfile(userId) {
  // Check if user_profile exists
  const existing = await fetch(
    `${REST}/user_profiles?user_id=eq.${userId}&select=id,user_id,prenom`,
    { headers: H }
  );
  if (!existing.ok) throw new Error(`user_profiles select: ${existing.status}`);
  const rows = await existing.json();
  if (rows.length > 0) {
    console.log(`  ↪ user_profiles existe déjà (id=${rows[0].id})`);
    return rows[0];
  }
  // Insert
  const res = await fetch(`${REST}/user_profiles`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      prenom: PRENOM,
      ville: VILLE,
      pays: PAYS,
      signupType: "member",
    }),
  });
  if (!res.ok)
    throw new Error(`user_profiles insert: ${res.status} ${await res.text()}`);
  const [row] = await res.json();
  console.log(`  ↪ user_profiles créé (id=${row.id})`);
  return row;
}

async function main() {
  console.log("🌱 Ensure Équipe Hilmy account\n");
  console.log(`→ Recherche auth.user pour ${EMAIL}…`);
  let userId = await findAuthUserIdByEmail(EMAIL);
  if (userId) {
    console.log(`  ✓ auth.user existe déjà : ${userId}`);
  } else {
    console.log("  ↪ absent. Création…");
    const { id, password } = await createAuthUser(EMAIL);
    userId = id;
    console.log(`  ✓ auth.user créé : ${userId}`);
    console.log(`  ℹ password temp (non stocké ailleurs) : ${password}`);
    console.log(`    → si besoin de login, passe par password reset.`);
  }

  console.log("\n→ Ensure user_profiles…");
  await upsertUserProfile(userId);

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`✅ Équipe Hilmy user_id = ${userId}`);
  console.log("═══════════════════════════════════════════════════");
  console.log(
    "\nÀ réutiliser dans scripts/hilmy-curation/*.mjs via --env ou copier-coller."
  );
}

main().catch((e) => {
  console.error("\n💥 FAILED:", e.message);
  process.exit(1);
});
