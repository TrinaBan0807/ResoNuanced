-- ResoNuanced Beta 0.7 migration. Run in existing Supabase SQL Editor.
-- Assumes schema.sql and impact_setup.sql were previously run.
-- Enables authenticated authors to delete their own records; others cannot.
alter table public.discussions enable row level security;
alter table public.replies enable row level security;
alter table public.impact_reflections enable row level security;
drop policy if exists "delete own discussions" on public.discussions;
create policy "delete own discussions" on public.discussions
for delete to authenticated using (author_id=auth.uid());
drop policy if exists "delete own replies" on public.replies;
create policy "delete own replies" on public.replies
for delete to authenticated using (author_id=auth.uid());
drop policy if exists "delete own impact reflections" on public.impact_reflections;
create policy "delete own impact reflections" on public.impact_reflections
for delete to authenticated using (author_id=auth.uid());
-- The existing SELECT policies must remain enabled for delete().select('id').
-- ON DELETE CASCADE handles replies and impact reflections when a discussion is deleted.
