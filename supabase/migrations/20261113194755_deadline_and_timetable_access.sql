-- Access rules for deadlines, timetables and timetable entries.
--
-- Same model as documents: members of a workspace read and edit what belongs
-- to it, everyone else gets nothing, and only the listed columns are writable.

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger deadlines_set_updated_at
before update on public.deadlines
for each row execute function private.set_updated_at();

create trigger timetables_set_updated_at
before update on public.timetables
for each row execute function private.set_updated_at();

create trigger timetable_entries_set_updated_at
before update on public.timetable_entries
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.deadlines, public.timetables, public.timetable_entries
from anon, authenticated;

grant select, delete
on public.deadlines, public.timetables, public.timetable_entries
to authenticated;

grant insert (id, workspace_id, title, due_date, due_time)
on public.deadlines to authenticated;
grant update (title, due_date, due_time, completed)
on public.deadlines to authenticated;

grant insert (id, workspace_id, name, days, start_hour, end_hour)
on public.timetables to authenticated;
grant update (name, days, start_hour, end_hour)
on public.timetables to authenticated;

-- timetable_id is not updatable, so an entry cannot move to another timetable.
grant insert (id, timetable_id, title, day, start_minute, end_minute, location, color)
on public.timetable_entries to authenticated;
grant update (title, day, start_minute, end_minute, location, color)
on public.timetable_entries to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

create policy "Members can read deadlines"
on public.deadlines for select to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can create deadlines"
on public.deadlines for insert to authenticated
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can update deadlines"
on public.deadlines for update to authenticated
using (workspace_id in (select private.current_user_workspace_ids()))
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can delete deadlines"
on public.deadlines for delete to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can read timetables"
on public.timetables for select to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can create timetables"
on public.timetables for insert to authenticated
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can update timetables"
on public.timetables for update to authenticated
using (workspace_id in (select private.current_user_workspace_ids()))
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can delete timetables"
on public.timetables for delete to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

-- An entry follows its timetable. The subquery runs under the caller's own
-- access to timetables, so it only finds timetables they are allowed to read.
create policy "Members can read timetable entries"
on public.timetable_entries for select to authenticated
using (exists (
  select 1 from public.timetables
  where timetables.id = timetable_entries.timetable_id
));

create policy "Members can create timetable entries"
on public.timetable_entries for insert to authenticated
with check (exists (
  select 1 from public.timetables
  where timetables.id = timetable_entries.timetable_id
));

create policy "Members can update timetable entries"
on public.timetable_entries for update to authenticated
using (exists (
  select 1 from public.timetables
  where timetables.id = timetable_entries.timetable_id
))
with check (exists (
  select 1 from public.timetables
  where timetables.id = timetable_entries.timetable_id
));

create policy "Members can delete timetable entries"
on public.timetable_entries for delete to authenticated
using (exists (
  select 1 from public.timetables
  where timetables.id = timetable_entries.timetable_id
));
