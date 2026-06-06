-- 56_backfill_whatsapp_e164.sql
--
-- Backfill ponctuel : normalise en E.164 (+indicatif + numéro, sans 0 initial,
-- sans espaces) les numéros WhatsApp cassés saisis avant l'ajout du sélecteur
-- d'indicatif pays. Pays confirmés manuellement par l'équipe (numéros nationaux
-- sans indicatif = ambiguïté que le code ne peut pas lever automatiquement).
--
-- Idempotent : chaque UPDATE matche la chaîne stockée EXACTE. Une fois appliqué,
-- l'ancienne valeur n'existe plus → re-run sans effet. Aucune autre ligne touchée.
-- (TENDANCES COIFFURES volontairement ignorée : fiche test en statut 'rejected'.)

begin;

update public.profiles set whatsapp = '+33652978555'
  where whatsapp = '0652978555';        -- Lucie Mathieu (Cavaillon) → 🇫🇷

update public.profiles set whatsapp = '+33745027254'
  where whatsapp = '0745027254';        -- Naya traiteur (Publier) → 🇫🇷

update public.profiles set whatsapp = '+41793448994'
  where whatsapp = '0793448994';        -- Stukkkkkkkk (Genève) → 🇨🇭

update public.profiles set whatsapp = '+41787138602'
  where whatsapp = '0041 78 713 86 02'; -- Coiffure En Vogue (Montreal) → 🇨🇭

update public.profiles set whatsapp = '+33760298185'
  where whatsapp = '+330760298185';     -- La Cosmeticaire (Ségny) → 🇫🇷

commit;
