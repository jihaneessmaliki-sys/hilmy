-- =====================================================================
-- HILMY · 10 — RLS : permettre le soft-delete par l'owner
--
-- Bug observé : UPDATE status='removed' depuis le dashboard levait
--   "new row violates row-level security policy for table X"
-- Cause : après UPDATE, la row sort du scope du SELECT policy
--   (status='published' only) → PostgREST refuse le post-update check.
-- Fix : le SELECT inclut désormais les rows de l'owner quel que soit
--   le status. UPDATE gagne aussi un WITH CHECK explicite.
-- =====================================================================

-- recommendations
drop policy if exists "Authenticated users can read published recommendations"
  on public.recommendations;
create policy "Read published or own recommendations"
  on public.recommendations
  for select
  using (
    (auth.uid() is not null and status = 'published')
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own recommendations"
  on public.recommendations;
create policy "Update own recommendations"
  on public.recommendations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- events
drop policy if exists "Anyone can read published events" on public.events;
create policy "Read published or own events"
  on public.events
  for select
  using (status = 'published' or auth.uid() = user_id);

drop policy if exists "Users can update own events" on public.events;
create policy "Update own events"
  on public.events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
