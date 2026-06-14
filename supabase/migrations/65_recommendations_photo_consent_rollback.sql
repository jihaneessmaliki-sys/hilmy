-- =====================================================================
-- HILMY · 65 ROLLBACK — retire la colonne de consentement photos.
-- Additif inverse : drop pur de la colonne. À ne lancer que si le code
-- qui écrit photo_consent_at n'est plus déployé (sinon l'écriture casse).
-- =====================================================================

alter table public.recommendations
  drop column if exists photo_consent_at;
