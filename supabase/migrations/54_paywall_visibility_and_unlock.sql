-- =====================================================================
-- HILMY · 54 — Paywall = visibilité publique, pas entrée du funnel
--                + déverrouillage de l'inscription prestataire
--
-- CONTEXTE
--   Depuis le verrouillage paywall (~2026-05-11, posé en live SANS
--   migration versionnée), l'inscription prestataire est cassée :
--   le trigger BEFORE INSERT `lock_profile_insert()` réécrit le
--   status de TOUTE insertion authenticated en 'draft'. Or 'draft'
--   est un état orphelin :
--     - invisible dans l'annuaire (RLS public = status='approved'),
--     - absent de la file admin (`prestataires-a-valider` = 'pending'),
--     - jamais touché par le webhook Stripe (qui ne set que `palier`).
--   Résultat : fiche écrite nulle part + 404. 0 inscription réussie
--   depuis le lock (live : 0 pending, 1 draft, 22 approved, 4 rejected).
--
-- DÉCISION (Modèle B, validée Jiji)
--   Le PAIEMENT — et non la validation admin — déclenche la visibilité.
--   La validation admin devient un pouvoir de SUSPENSION a posteriori
--   (retirer une fiche si la prestataire n'est pas une femme ou ne
--   respecte pas les règles).
--     1. L'inscription recrée un `status='pending'` (état neutre, plus
--        un point de blocage : une pending PAYÉE est déjà visible).
--     2. Une fiche est publique SSI :
--          status NOT IN ('suspended','rejected','ghost','draft')
--          AND ( paywall_exempt=true
--                OR abonnement actif/trialing/past_due )
--        ⮑ la visibilité NE DÉPEND PLUS de status='approved'.
--     3. Les 22 fiches approved actuelles (fondatrices incluses) sont
--        grandfathered À VIE via `paywall_exempt=true`.
--     4. La fenêtre founders est fermée (plus d'auto-flag is_founder).
--
--   DÉVIATION ASSUMÉE (à valider) : la règle demandée était
--   `status NOT IN ('suspended','rejected')`. J'ajoute 'ghost' et
--   'draft' à l'exclusion par défense en profondeur :
--     - 'ghost'  = fiches importées de l'annuaire, non réclamées →
--                  ne doivent jamais devenir publiques par accident.
--     - 'draft'  = brouillons → idem.
--   En pratique ces fiches n'ont ni abo ni paywall_exempt donc la 2e
--   condition les exclut déjà, mais l'exclusion explicite évite toute
--   fuite si un flag leur était posé un jour par erreur.
--
--   ⚠️ Le paywall N'EST PAS désactivé : une fiche SANS abonnement actif
--   et SANS exemption reste invisible, quel que soit son status. Le
--   paiement reste le cœur du business model.
--
-- TRAÇABILITÉ ("plus de SQL posé en live sans trace")
--   Cette migration re-déclare AUSSI les objets posés en live hors
--   versioning (lock_profile_insert corrigé, lock_profile_update
--   inchangé, CHECK status, policies publiques nettoyées de leurs
--   doublons) pour resynchroniser git ↔ prod.
--
-- ⚠️ NE PAS APPLIQUER sans demande explicite de Jiji + backup.
--    Artefact en revue. Idempotente.
-- =====================================================================


-- =====================================================================
-- B.5 — Colonne paywall_exempt (grandfathering)
-- =====================================================================
-- Flag dédié plutôt que réutiliser is_founder : live is_founder=17
-- mais approved=22 → réutiliser is_founder laisserait 5 fiches
-- approuvées invisibles. On découple grandfathering ↔ statut founder.

alter table public.profiles
  add column if not exists paywall_exempt boolean not null default false;

comment on column public.profiles.paywall_exempt is
  'mig 54 — Grandfathering paywall. true = fiche publique sans abo '
  'Stripe actif (acquis historique). Posé à true pour les 22 fiches '
  'approved au moment du fix. Les nouvelles fiches restent à false : '
  'leur visibilité dépend d''un abonnement actif.';

-- Index partial : la grande majorité des profiles resteront false.
create index if not exists profiles_paywall_exempt_idx
  on public.profiles (paywall_exempt)
  where paywall_exempt = true;

-- Grandfathering des fiches déjà approuvées (capture les 22).
-- WHERE status='approved' = idempotent et borné aux acquis.
update public.profiles
  set paywall_exempt = true
  where status = 'approved';


-- =====================================================================
-- B.1 — lock_profile_insert() : clamp en 'pending' (et non 'draft')
-- =====================================================================
-- SEULE ligne changée vs le live : NEW.status := 'pending'.
-- Tous les autres garde-fous anti-tamper sont CONSERVÉS : une
-- inscription authenticated ne peut toujours pas s'auto-approuver,
-- se donner un palier, un stripe_customer_id, le flag founder, etc.
-- L'exception 'ghost' (imports admin) reste intacte.

create or replace function public.lock_profile_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if auth.role() = 'authenticated' then
    -- Modération : toute inscription entre en file de validation.
    -- 'ghost' (fiches importées) garde son statut ; tout le reste
    -- est forcé en 'pending' (← FIX : était 'draft', état orphelin).
    if new.status is distinct from 'ghost' then
      new.status := 'pending';
    end if;

    -- Monétisation & anti-tamper : valeurs imposées server-side.
    new.palier             := 'standard';
    new.stripe_customer_id := null;
    new.is_founder         := false;
    new.approved_at        := null;
    new.note_moyenne       := 0;
    new.nb_avis            := 0;
    new.nb_vues            := 0;
    -- paywall_exempt suit son DEFAULT false : aucune nouvelle fiche
    -- ne peut s'auto-exempter du paywall.
    new.paywall_exempt     := false;
  end if;

  return new;
end;
$$;

comment on function public.lock_profile_insert() is
  'mig 54 — BEFORE INSERT profiles. Force status=pending (file de '
  'validation) pour les inscriptions authenticated + verrouille les '
  'champs monétisation/réputation. ''ghost'' (imports) exempté.';


-- =====================================================================
-- B.3 — lock_profile_update() : re-déclaration À L'IDENTIQUE
-- =====================================================================
-- Aucun changement fonctionnel. Re-déclaré uniquement pour la
-- traçabilité git (l'objet vit en prod hors versioning). Empêche une
-- prestataire de s'auto-approuver / changer son palier via UPDATE.
-- On y ajoute paywall_exempt côté anti-tamper : impossible de se
-- l'octroyer soi-même par UPDATE.

create or replace function public.lock_profile_update()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if auth.role() = 'authenticated' then
    new.status            := old.status;
    new.palier            := old.palier;
    new.slug              := old.slug;
    new.user_id           := old.user_id;
    new.stripe_customer_id := old.stripe_customer_id;
    new.is_founder        := old.is_founder;
    new.approved_at       := old.approved_at;
    new.note_moyenne      := old.note_moyenne;
    new.nb_avis           := old.nb_avis;
    new.nb_vues           := old.nb_vues;
    new.source_import     := old.source_import;
    new.paywall_exempt    := old.paywall_exempt;
  end if;

  return new;
end;
$$;

comment on function public.lock_profile_update() is
  'mig 54 — BEFORE UPDATE profiles. Anti-self-approval : fige les '
  'champs sensibles (status, palier, stripe, founder, paywall_exempt…) '
  'pour les UPDATE authenticated. Re-déclaré pour traçabilité git.';


-- =====================================================================
-- B.7 — CHECK constraint status : re-déclaration (traçabilité)
-- =====================================================================
-- Identique au live. 'draft' + 'suspended' CONSERVÉS (décision Jiji) :
-- 'draft' n'est plus produit par l'inscription mais reste un état
-- valide pour d'éventuels usages futurs ; 'suspended' = levier modé.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_status_check'
  ) then
    alter table public.profiles drop constraint profiles_status_check;
  end if;

  alter table public.profiles
    add constraint profiles_status_check
    check (status in (
      'draft', 'pending', 'approved', 'rejected', 'suspended', 'ghost'
    ));
end $$;


-- =====================================================================
-- B.4 — Visibilité publique : helper abo actif + policy SELECT unique
-- =====================================================================
-- Pourquoi un helper SECURITY DEFINER ?
--   La RLS de `subscriptions` interdit toute lecture à anon
--   (subscriptions_owner_read = authenticated owner only). Une
--   sous-requête `subscriptions` dans la policy SELECT de `profiles`
--   échouerait donc côté visiteur anonyme. Le helper, en SECURITY
--   DEFINER, lit subscriptions avec les droits du propriétaire de la
--   fonction et expose UNIQUEMENT un booléen "abo actif ?". Aucune
--   donnée Stripe n'est divulguée.
--
-- DÉVIATION ASSUMÉE (à valider) : le helper est volontairement scopé
--   aux subscriptions (`profile_has_active_subscription`) et NON nommé
--   `profile_is_publicly_visible`. Raison : un helper qui relirait
--   `profiles` (pour status + paywall_exempt) créerait une récursion
--   RLS sur la table qu'on est en train de policer. On inline donc
--   `status` et `paywall_exempt` directement dans la policy (lecture
--   de la row courante, pas de récursion) et on ne délègue au helper
--   que la partie subscriptions inaccessible à anon.

create or replace function public.profile_has_active_subscription(p_profile_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path to 'public'
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.profile_id = p_profile_id
      and s.status in ('active', 'trialing', 'past_due')
      and s.current_period_end > now()
  );
$$;

comment on function public.profile_has_active_subscription(uuid) is
  'mig 54 — SECURITY DEFINER. Retourne true si le profile a un abo '
  'Stripe actif/trialing/past_due non expiré. Lecture seule, n''expose '
  'qu''un booléen (anon ne peut pas lire subscriptions en direct). '
  'Utilisé par la policy SELECT publique de profiles.';

-- Révoquer l'accès large puis n'autoriser que les rôles applicatifs.
revoke all on function public.profile_has_active_subscription(uuid) from public;
grant execute on function public.profile_has_active_subscription(uuid)
  to anon, authenticated;

-- ─── Nettoyage des policies SELECT publiques en double ──────────────
-- Live = 2 policies publiques redondantes sur status='approved' :
--   "public read approved profiles" + "Public peut voir les profils
--   approuves". On les remplace par UNE seule policy gated paywall.
-- Les policies owner-select et ghost-select ne sont PAS touchées.

drop policy if exists "public read approved profiles" on public.profiles;
drop policy if exists "Public peut voir les profils approuves" on public.profiles;
drop policy if exists "public read visible profiles" on public.profiles;

create policy "public read visible profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (
    status not in ('suspended', 'rejected', 'ghost', 'draft')
    and (
      paywall_exempt = true
      or public.profile_has_active_subscription(id)
    )
  );

comment on policy "public read visible profiles" on public.profiles is
  'mig 54 (Modèle B) — Visibilité publique = status non suspendu/refusé/'
  'ghost/draft ET (grandfathered OU abo actif). Le PAIEMENT déclenche la '
  'visibilité, plus la validation admin. Une pending payée est visible ; '
  'une approved non payée ne l''est pas. Remplace les 2 anciennes '
  'policies publiques (doublon, gating sur status=approved).';


-- =====================================================================
-- B.6 — Récupération de la fiche orpheline (Lucie Mathieu)
-- =====================================================================
-- Seule inscription post-lock : forcée en 'draft' par le bug. On la
-- replace en 'pending' (état neutre). Sous Modèle B elle restera
-- invisible tant qu'elle n'a pas d'abo actif — cohérent : elle n'a
-- jamais payé. Si on veut lui offrir la visibilité, poser
-- paywall_exempt=true manuellement (décision commerciale, hors mig).
-- Borné par id + status='draft' = idempotent, sans effet de bord.

update public.profiles
  set status = 'pending'
  where id = '128b0b66-9de1-43c8-8d1a-d764abd7f216'
    and status = 'draft';


-- =====================================================================
-- Fermeture de la fenêtre founders
-- =====================================================================
-- Décision Jiji : plus de nouveaux founders auto-flaggés. Le trigger
-- trg_auto_flag_founder lit app_config.founders_window_open ; on le
-- passe à false. Les 17 founders existants restent founders.

update public.app_config
  set founders_window_open = false,
      updated_at = now()
  where id = true;


-- =====================================================================
-- NOTIFY PostgREST — recharger le schéma exposé
-- =====================================================================
notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (manuel, si besoin de défaire la mig 54)
-- =====================================================================
-- -- 1. Restaurer la policy publique simple (sans paywall) :
-- drop policy if exists "public read visible profiles" on public.profiles;
-- create policy "public read approved profiles" on public.profiles
--   for select to anon, authenticated using (status = 'approved');
-- -- 2. Helper :
-- drop function if exists public.profile_has_active_subscription(uuid);
-- -- 3. Re-forcer 'draft' à l'insertion (revenir au comportement buggé) :
-- --    (déconseillé — recasse l'inscription)
-- -- 4. Colonne grandfathering :
-- drop index if exists public.profiles_paywall_exempt_idx;
-- alter table public.profiles drop column if exists paywall_exempt;
-- -- 5. Ré-ouvrir la fenêtre founders :
-- update public.app_config set founders_window_open = true where id = true;
-- notify pgrst, 'reload schema';
