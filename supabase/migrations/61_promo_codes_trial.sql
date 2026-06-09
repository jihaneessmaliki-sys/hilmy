-- =====================================================================
-- HILMY · 61 — promo_codes : support type='trial' (ENSEMBLE essai gratuit)
--
-- Étend la table promo_codes (mig 35) pour gérer des codes "essai gratuit
-- à date fixe" en plus des codes "remise %". Seed du code ENSEMBLE :
-- essai gratuit jusqu'au 1er septembre 2026 (date fixe, heure suisse),
-- puis bascule auto en prix plein. Distribué manuellement par Jiji.
--
-- ENSEMBLE remplace LANCEMENT50 comme offre de lancement (LANCEMENT50
-- s'éteint via le flag NEXT_PUBLIC_PROMO_LANCEMENT=false côté Vercel).
--
-- Kill switch : UPDATE promo_codes SET active=false WHERE lower(code)='ensemble';
--   → coupe instantanément le preview front (RLS active=true) ET la
--     résolution serveur du trial (.eq('active', true)).
--
-- Idempotente. Dry-run conseillé (BEGIN; \i ...; ROLLBACK;) avant prod.
-- ⚠️ Ne pas exécuter en prod sans backup récent + validation Jiji.
-- Exécuter via : bash scripts/run-migration.sh supabase/migrations/61_promo_codes_trial.sql
-- =====================================================================

-- ─── 1. Colonne type ─────────────────────────────────────────────────
-- 'discount' par défaut → toutes les lignes existantes (COPINE10) restent
-- des codes remise sans changement de comportement.
alter table public.promo_codes
  add column if not exists type text not null default 'discount';

-- ─── 2. Colonne trial_end ────────────────────────────────────────────
-- Date de fin de l'essai gratuit (fixe, identique pour toutes). NULL pour
-- les codes 'discount'. Le webhook Stripe écrira current_period_end =
-- trial_end ; profile_has_active_subscription reconnaît trialing.
alter table public.promo_codes
  add column if not exists trial_end timestamptz;

-- ─── 3. discount_pct devient nullable ────────────────────────────────
-- Un code 'trial' n'a pas de pourcentage.
alter table public.promo_codes
  alter column discount_pct drop not null;

-- ─── 4. CHECK conditionnel par type ──────────────────────────────────
-- On retire l'ancien CHECK inline (discount_pct>0 AND <=100), nommé
-- automatiquement promo_codes_discount_pct_check, par lookup robuste,
-- puis on pose un CHECK de forme conditionnelle.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.promo_codes'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%discount_pct%'
  loop
    execute format('alter table public.promo_codes drop constraint %I', c);
  end loop;
end $$;

alter table public.promo_codes
  drop constraint if exists promo_codes_type_check;
alter table public.promo_codes
  add constraint promo_codes_type_check check (type in ('discount', 'trial'));

alter table public.promo_codes
  drop constraint if exists promo_codes_shape_check;
alter table public.promo_codes
  add constraint promo_codes_shape_check check (
    (type = 'discount' and discount_pct between 1 and 100 and trial_end is null)
    or
    (type = 'trial'    and trial_end is not null)
  );

comment on column public.promo_codes.type is
  'discount = remise % (discount_pct) ; trial = essai gratuit jusqu''à trial_end.';
comment on column public.promo_codes.trial_end is
  'Fin de l''essai gratuit (date fixe). Posé sur subscription_data.trial_end '
  'au checkout Stripe. NULL pour les codes discount.';

-- ─── 5. Seed ENSEMBLE ────────────────────────────────────────────────
-- Essai gratuit jusqu'au 1er sept 2026 00:00 heure suisse (Europe/Zurich
-- = UTC+02 en été). valid_until = 25 août 2026 : ferme la redemption ~1
-- semaine avant trial_end pour respecter la contrainte Stripe
-- "trial_end >= now + 48h". max_uses NULL = illimité (kill via active).
insert into public.promo_codes
  (code, type, discount_pct, trial_end, applies_to_palier,
   valid_from, valid_until, max_uses, notes)
values
  ('ENSEMBLE', 'trial', null, '2026-09-01 00:00:00+02', 'all',
   now(), '2026-08-25 23:59:59+02', null,
   'Essai gratuit jusqu''au 1er sept 2026 (date fixe). Offre de lancement, '
   'remplace LANCEMENT50. Distribué manuellement par Jiji.')
on conflict ((lower(code))) do update
  set type              = excluded.type,
      discount_pct      = excluded.discount_pct,
      trial_end         = excluded.trial_end,
      applies_to_palier = excluded.applies_to_palier,
      valid_until       = excluded.valid_until,
      max_uses          = excluded.max_uses,
      active            = true,
      notes             = excluded.notes;

-- ─── 6. Reload PostgREST schema cache ────────────────────────────────
notify pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- delete from public.promo_codes where lower(code) = 'ensemble';
-- alter table public.promo_codes drop constraint if exists promo_codes_shape_check;
-- alter table public.promo_codes drop constraint if exists promo_codes_type_check;
-- alter table public.promo_codes drop column if exists trial_end;
-- alter table public.promo_codes drop column if exists type;
-- -- Restaurer l'ancien CHECK + NOT NULL sur discount_pct (état mig 35) :
-- alter table public.promo_codes
--   add constraint promo_codes_discount_pct_check
--   check (discount_pct > 0 and discount_pct <= 100);
-- alter table public.promo_codes alter column discount_pct set not null;
-- notify pgrst, 'reload schema';
-- =====================================================================
