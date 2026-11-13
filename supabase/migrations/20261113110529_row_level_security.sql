-- Access rules for workspaces, members and documents.
--
-- Model: a user sees and edits only what belongs to a workspace they are a
-- member of. Signed-out visitors get nothing. Every table is deny-by-default:
-- a privilege exists only if it is granted below AND a policy allows the row.

-- ---------------------------------------------------------------------------
-- Helper functions, in a schema the API does not expose
-- ---------------------------------------------------------------------------

create schema private;
grant usage on schema private to authenticated;

-- Workspaces the current user belongs to. SECURITY DEFINER lets policies on
-- workspace_members call it without recursing into their own policy.
create function private.current_user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id
  from public.workspace_members
  where user_id = (select auth.uid());
$$;

create function private.current_user_owned_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id
  from public.workspace_members
  where user_id = (select auth.uid())
    and role = 'owner';
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on all functions in schema private from public;
grant execute on function private.current_user_workspace_ids() to authenticated;
grant execute on function private.current_user_owned_workspace_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, then grant the minimum
-- ---------------------------------------------------------------------------

revoke all on public.workspaces, public.workspace_members, public.documents
from anon, authenticated;

grant select on public.workspaces, public.workspace_members, public.documents
to authenticated;

-- Workspaces are created through create_workspace() only, so no insert grant.
grant update (name) on public.workspaces to authenticated;
grant delete on public.workspaces to authenticated;

-- Memberships are read-only for clients until member management is built.

-- Column grants keep created_by, workspace_id and the timestamps out of
-- client hands: a document cannot be re-attributed or moved to another workspace.
grant insert (id, workspace_id, title) on public.documents to authenticated;
grant update (title) on public.documents to authenticated;
grant delete on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

create policy "Members can read their workspaces"
on public.workspaces for select to authenticated
using (id in (select private.current_user_workspace_ids()));

create policy "Owners can rename their workspaces"
on public.workspaces for update to authenticated
using (id in (select private.current_user_owned_workspace_ids()))
with check (id in (select private.current_user_owned_workspace_ids()));

create policy "Owners can delete their workspaces"
on public.workspaces for delete to authenticated
using (id in (select private.current_user_owned_workspace_ids()));

create policy "Members can see who is in their workspaces"
on public.workspace_members for select to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can read documents"
on public.documents for select to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can create documents"
on public.documents for insert to authenticated
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can update documents"
on public.documents for update to authenticated
using (workspace_id in (select private.current_user_workspace_ids()))
with check (workspace_id in (select private.current_user_workspace_ids()));

create policy "Members can delete documents"
on public.documents for delete to authenticated
using (workspace_id in (select private.current_user_workspace_ids()));

-- ---------------------------------------------------------------------------
-- API: create a workspace and make the caller its owner, atomically
-- ---------------------------------------------------------------------------

create function public.create_workspace(name text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace public.workspaces;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.workspaces (name)
  values (create_workspace.name)
  returning * into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace.id, (select auth.uid()), 'owner');

  return new_workspace;
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;
