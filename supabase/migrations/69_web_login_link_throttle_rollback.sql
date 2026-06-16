-- Rollback mig 69 — rate-limit hand-off auth mobile→web.
drop function if exists public.web_login_link_allow(uuid);
drop table if exists public.web_login_link_attempts;
