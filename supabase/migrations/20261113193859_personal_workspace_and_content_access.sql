-- Document content access, a personal workspace for every new person, and
-- cleanup of workspaces nobody belongs to.

-- ---------------------------------------------------------------------------
-- Members may write the content of documents they can already edit
-- ---------------------------------------------------------------------------

grant insert (content), update (content) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Every new person starts with a workspace of their own
-- ---------------------------------------------------------------------------

-- Runs inside the sign-up transaction: if it fails, the account is not created.
create function private.create_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, created_by)
  values ('Personal', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function private.create_personal_workspace() from public;

create trigger create_personal_workspace
after insert on auth.users
for each row execute function private.create_personal_workspace();

-- ---------------------------------------------------------------------------
-- A workspace with no members is deleted
-- ---------------------------------------------------------------------------

-- Covers account deletion: memberships cascade away with the account, and a
-- workspace nobody can reach would otherwise keep its documents forever.
create function private.delete_workspace_without_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.workspaces
  where id = old.workspace_id
    and not exists (
      select 1
      from public.workspace_members
      where workspace_id = old.workspace_id
    );
  return null;
end;
$$;

revoke all on function private.delete_workspace_without_members() from public;

create trigger delete_workspace_without_members
after delete on public.workspace_members
for each row execute function private.delete_workspace_without_members();
