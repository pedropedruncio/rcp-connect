-- Harden notification and discipleship journal visibility, and align leader cell edits with API checks.

create or replace function public.can_read_system_notification(notification_content jsonb)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin_or_pastor()
    or notification_content ->> 'targetPersonId' = public.current_person_id()
    or (
      jsonb_typeof(notification_content -> 'targetPersonIds') = 'array'
      and exists (
        select 1
        from jsonb_array_elements_text(notification_content -> 'targetPersonIds') as target(person_id)
        where target.person_id = public.current_person_id()
      )
    )
    or notification_content ->> 'targetRole' = public.current_user_role()
    or (
      jsonb_typeof(notification_content -> 'targetRoles') = 'array'
      and exists (
        select 1
        from jsonb_array_elements_text(notification_content -> 'targetRoles') as target(role_name)
        where target.role_name = public.current_user_role()
      )
    )
$$;

drop policy if exists "Allow authenticated read" on public."SystemNotification";
drop policy if exists "Allow service insert" on public."SystemNotification";
drop policy if exists "Allow authenticated update readBy" on public."SystemNotification";
drop policy if exists "System notifications are visible by target" on public."SystemNotification";
drop policy if exists "System notifications can be inserted by authenticated API" on public."SystemNotification";
drop policy if exists "System notifications can update visible read state" on public."SystemNotification";

create policy "System notifications are visible by target"
on public."SystemNotification"
for select
to authenticated
using (public.can_read_system_notification(content));

create policy "System notifications can update visible read state"
on public."SystemNotification"
for update
to authenticated
using (public.can_read_system_notification(content))
with check (public.can_read_system_notification(content));

create or replace function public.guard_system_notification_read_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.id is distinct from old.id
       or new.type is distinct from old.type
       or new.content is distinct from old.content
       or new."createdAt" is distinct from old."createdAt" then
      raise exception 'Only read state can be updated on notifications.' using errcode = '42501';
    end if;

    if not (coalesce(old."readBy", '{}') <@ coalesce(new."readBy", '{}')) then
      raise exception 'Notification read state cannot be removed.' using errcode = '42501';
    end if;

    if exists (
      select 1
      from unnest(coalesce(new."readBy", '{}')) as reader(person_id)
      where not (
        reader.person_id = any(coalesce(old."readBy", '{}'))
        or reader.person_id = public.current_person_id()
      )
    ) then
      raise exception 'Only the current user can be added to notification read state.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_system_notification_read_update on public."SystemNotification";
create trigger guard_system_notification_read_update
before update on public."SystemNotification"
for each row
execute function public.guard_system_notification_read_update();

create or replace function public.can_read_discipleship_journal_pair(row_pair_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public."DiscipleshipPair" dp
    where dp.id = row_pair_id
      and (
        public.is_admin_or_pastor()
        or dp."mentorId" = public.current_person_id()
        or (
          public.current_user_role() = 'DISCIPLER'
          and public.can_manage_person_by_id(dp."mentorId")
        )
      )
  )
$$;

create or replace function public.can_insert_discipleship_journal(row_pair_id text, row_author_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    row_author_id = public.current_person_id()
    and exists (
      select 1
      from public."DiscipleshipPair" dp
      where dp.id = row_pair_id
        and (
          public.is_admin_or_pastor()
          or dp."mentorId" = public.current_person_id()
        )
    )
$$;

drop policy if exists "Authenticated users can read discipleship journals" on public."DiscipleshipJournal";
drop policy if exists "Authenticated users can insert discipleship journals" on public."DiscipleshipJournal";
drop policy if exists "Discipleship journals are visible to mentors and supervisors" on public."DiscipleshipJournal";
drop policy if exists "Discipleship journals can be inserted by mentors and leadership" on public."DiscipleshipJournal";

create policy "Discipleship journals are visible to mentors and supervisors"
on public."DiscipleshipJournal"
for select
to authenticated
using (public.can_read_discipleship_journal_pair("pairId"));

create policy "Discipleship journals can be inserted by mentors and leadership"
on public."DiscipleshipJournal"
for insert
to authenticated
with check (public.can_insert_discipleship_journal("pairId", "authorId"));

create or replace function public.guard_cell_leader_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin_or_pastor() then
    if old."leaderId" is distinct from public.current_person_id() then
      raise exception 'Only the assigned leader can update this cell.' using errcode = '42501';
    end if;

    if new.id is distinct from old.id
       or new."leaderId" is distinct from old."leaderId"
       or new."campusId" is distinct from old."campusId"
       or new.health is distinct from old.health
       or new."createdAt" is distinct from old."createdAt" then
      raise exception 'Leaders can only update basic cell fields.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_cell_leader_update on public."CellGroup";
create trigger guard_cell_leader_update
before update on public."CellGroup"
for each row
execute function public.guard_cell_leader_update();

drop policy if exists "Only admins can update cell groups" on public."CellGroup";
drop policy if exists "Cell groups can be updated by assigned leaders" on public."CellGroup";

create policy "Cell groups can be updated by assigned leaders"
on public."CellGroup"
for update
to authenticated
using (public.is_admin_or_pastor() or "leaderId" = public.current_person_id())
with check (public.is_admin_or_pastor() or "leaderId" = public.current_person_id());
