create or replace function public.current_person_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u."personId"
  from public."User" u
  where u."supabaseId"::text = auth.uid()::text
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.name
  from public."User" u
  join public."Role" r on r.id = u."roleId"
  where u."supabaseId"::text = auth.uid()::text
  limit 1
$$;

create or replace function public.current_user_campus_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p."campusId"
  from public."User" u
  join public."Person" p on p.id = u."personId"
  where u."supabaseId"::text = auth.uid()::text
  limit 1
$$;

create or replace function public.has_app_role(allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false)
$$;

create or replace function public.is_admin_or_pastor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_app_role(array['ADMIN', 'PASTOR'])
$$;

create or replace function public.is_own_email(row_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select lower(coalesce(row_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.can_read_person(row_person_id text, row_campus_id text, row_cell_group_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    row_person_id = public.current_person_id()
    or public.is_admin_or_pastor()
    or (
      public.current_user_role() = 'DISCIPLER'
      and row_campus_id is not distinct from public.current_user_campus_id()
    )
    or (
      public.current_user_role() = 'LEADER'
      and exists (
        select 1
        from public."CellGroup" c
        where c.id = row_cell_group_id
          and c."leaderId" = public.current_person_id()
      )
    )
    or exists (
      select 1
      from public."Person" me
      join public."CellGroup" c on c.id = me."cellGroupId"
      where me.id = public.current_person_id()
        and c."leaderId" = row_person_id
    )
    or exists (
      select 1
      from public."DiscipleshipPair" dp
      where dp."discipleId" = public.current_person_id()
        and dp."mentorId" = row_person_id
    )
$$;

create or replace function public.can_read_person_by_id(row_person_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public."Person" p
    where p.id = row_person_id
      and public.can_read_person(p.id, p."campusId", p."cellGroupId")
  )
$$;

create or replace function public.can_manage_person(row_person_id text, row_campus_id text, row_cell_group_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin_or_pastor()
    or (
      public.current_user_role() = 'DISCIPLER'
      and row_campus_id is not distinct from public.current_user_campus_id()
    )
    or (
      public.current_user_role() = 'LEADER'
      and exists (
        select 1
        from public."CellGroup" c
        where c.id = row_cell_group_id
          and c."leaderId" = public.current_person_id()
      )
    )
$$;

create or replace function public.can_manage_person_by_id(row_person_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public."Person" p
    where p.id = row_person_id
      and public.can_manage_person(p.id, p."campusId", p."cellGroupId")
  )
$$;

create or replace function public.can_read_cell(row_cell_id text, row_campus_id text, row_leader_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin_or_pastor()
    or row_leader_id = public.current_person_id()
    or (
      public.current_user_role() = 'DISCIPLER'
      and row_campus_id is not distinct from public.current_user_campus_id()
    )
    or exists (
      select 1
      from public."Person" p
      where p.id = public.current_person_id()
        and p."cellGroupId" = row_cell_id
    )
$$;

create or replace function public.can_bootstrap_person(row_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_person_id() is null and public.is_own_email(row_email)
$$;

create or replace function public.can_bootstrap_user(
  row_email text,
  row_supabase_id text,
  row_person_id text,
  row_role_id text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    row_supabase_id = auth.uid()::text
    and public.is_own_email(row_email)
    and exists (
      select 1
      from public."Role" r
      where r.id = row_role_id
        and r.name = 'MEMBER'
    )
    and exists (
      select 1
      from public."Person" p
      where p.id = row_person_id
        and public.is_own_email(p.email)
    )
$$;

create or replace function public.guard_person_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and old.id = public.current_person_id()
     and not public.can_manage_person(old.id, old."campusId", old."cellGroupId") then
    if new.id is distinct from old.id
       or new.status is distinct from old.status
       or new."campusId" is distinct from old."campusId"
       or new."cellGroupId" is distinct from old."cellGroupId"
       or new."createdAt" is distinct from old."createdAt" then
      raise exception 'Only leaders or admins can change membership fields.' using errcode = '42501';
    end if;

    if new.email is distinct from old.email and not public.is_own_email(new.email) then
      raise exception 'Users can only set their own authenticated email.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_person_self_update on public."Person";
create trigger guard_person_self_update
before update on public."Person"
for each row
execute function public.guard_person_self_update();

drop policy if exists "Users can read own person" on public."Person";
drop policy if exists "Users can insert own person" on public."Person";
drop policy if exists "Users can update own person" on public."Person";
drop policy if exists "Authenticated users can read people" on public."Person";
drop policy if exists "Authenticated users can insert people" on public."Person";
drop policy if exists "Authenticated users can update people" on public."Person";
drop policy if exists "People are visible by scoped role" on public."Person";
drop policy if exists "People can be inserted by owner or scoped role" on public."Person";
drop policy if exists "People can be updated by owner or scoped role" on public."Person";

create policy "People are visible by scoped role"
on public."Person"
for select
to authenticated
using (public.can_read_person(id, "campusId", "cellGroupId"));

create policy "People can be inserted by owner or scoped role"
on public."Person"
for insert
to authenticated
with check (
  public.can_bootstrap_person(email)
  or public.can_manage_person(id, "campusId", "cellGroupId")
);

create policy "People can be updated by owner or scoped role"
on public."Person"
for update
to authenticated
using (
  id = public.current_person_id()
  or public.can_manage_person(id, "campusId", "cellGroupId")
)
with check (
  id = public.current_person_id()
  or public.can_manage_person(id, "campusId", "cellGroupId")
);

drop policy if exists "Users can read own user row" on public."User";
drop policy if exists "Users can insert own user row" on public."User";
drop policy if exists "Users can update own user row" on public."User";
drop policy if exists "Authenticated users can read users" on public."User";
drop policy if exists "Authenticated users can insert users" on public."User";
drop policy if exists "Authenticated users can update users" on public."User";
drop policy if exists "Users are visible by scoped role" on public."User";
drop policy if exists "Users can bootstrap own member row" on public."User";
drop policy if exists "Only admins can update user access rows" on public."User";

create policy "Users are visible by scoped role"
on public."User"
for select
to authenticated
using (
  "supabaseId"::text = auth.uid()::text
  or public.is_admin_or_pastor()
  or public.can_read_person_by_id("personId")
);

create policy "Users can bootstrap own member row"
on public."User"
for insert
to authenticated
with check (
  public.is_admin_or_pastor()
  or public.can_bootstrap_user(email, "supabaseId"::text, "personId", "roleId")
);

create policy "Only admins can update user access rows"
on public."User"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read cell groups" on public."CellGroup";
drop policy if exists "Authenticated users can insert cell groups" on public."CellGroup";
drop policy if exists "Authenticated users can update cell groups" on public."CellGroup";
drop policy if exists "Cell groups are visible by scoped role" on public."CellGroup";
drop policy if exists "Only admins can insert cell groups" on public."CellGroup";
drop policy if exists "Only admins can update cell groups" on public."CellGroup";

create policy "Cell groups are visible by scoped role"
on public."CellGroup"
for select
to authenticated
using (public.can_read_cell(id, "campusId", "leaderId"));

create policy "Only admins can insert cell groups"
on public."CellGroup"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update cell groups"
on public."CellGroup"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read follow ups" on public."FollowUp";
drop policy if exists "Authenticated users can insert follow ups" on public."FollowUp";
drop policy if exists "Authenticated users can update follow ups" on public."FollowUp";
drop policy if exists "Follow ups are visible by scoped role" on public."FollowUp";
drop policy if exists "Follow ups can be inserted by owner or scoped role" on public."FollowUp";
drop policy if exists "Follow ups can be updated by responsible or scoped role" on public."FollowUp";

create policy "Follow ups are visible by scoped role"
on public."FollowUp"
for select
to authenticated
using (
  "personId" = public.current_person_id()
  or "responsibleId" = public.current_person_id()
  or public.can_read_person_by_id("personId")
  or public.can_read_person_by_id("responsibleId")
);

create policy "Follow ups can be inserted by owner or scoped role"
on public."FollowUp"
for insert
to authenticated
with check (
  "personId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
);

create policy "Follow ups can be updated by responsible or scoped role"
on public."FollowUp"
for update
to authenticated
using (
  "responsibleId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
)
with check (
  "responsibleId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
);

drop policy if exists "Authenticated users can read discipleship pairs" on public."DiscipleshipPair";
drop policy if exists "Authenticated users can insert discipleship pairs" on public."DiscipleshipPair";
drop policy if exists "Authenticated users can update discipleship pairs" on public."DiscipleshipPair";
drop policy if exists "Discipleship pairs are visible by scoped role" on public."DiscipleshipPair";
drop policy if exists "Discipleship pairs can be inserted by scoped role" on public."DiscipleshipPair";
drop policy if exists "Discipleship pairs can be updated by scoped role" on public."DiscipleshipPair";

create policy "Discipleship pairs are visible by scoped role"
on public."DiscipleshipPair"
for select
to authenticated
using (
  "mentorId" = public.current_person_id()
  or "discipleId" = public.current_person_id()
  or public.can_read_person_by_id("mentorId")
  or public.can_read_person_by_id("discipleId")
);

create policy "Discipleship pairs can be inserted by scoped role"
on public."DiscipleshipPair"
for insert
to authenticated
with check (
  public.can_manage_person_by_id("mentorId")
  or public.can_manage_person_by_id("discipleId")
);

create policy "Discipleship pairs can be updated by scoped role"
on public."DiscipleshipPair"
for update
to authenticated
using (
  public.can_manage_person_by_id("mentorId")
  or public.can_manage_person_by_id("discipleId")
)
with check (
  public.can_manage_person_by_id("mentorId")
  or public.can_manage_person_by_id("discipleId")
);

drop policy if exists "Authenticated users can read families" on public."Family";
drop policy if exists "Authenticated users can insert families" on public."Family";
drop policy if exists "Authenticated users can update families" on public."Family";
drop policy if exists "Only admins can read families" on public."Family";
drop policy if exists "Only admins can insert families" on public."Family";
drop policy if exists "Only admins can update families" on public."Family";

create policy "Only admins can read families"
on public."Family"
for select
to authenticated
using (public.is_admin_or_pastor());

create policy "Only admins can insert families"
on public."Family"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update families"
on public."Family"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read ministries" on public."Ministry";
drop policy if exists "Authenticated users can insert ministries" on public."Ministry";
drop policy if exists "Authenticated users can update ministries" on public."Ministry";
drop policy if exists "Only admins can read ministries" on public."Ministry";
drop policy if exists "Only admins can insert ministries" on public."Ministry";
drop policy if exists "Only admins can update ministries" on public."Ministry";

create policy "Only admins can read ministries"
on public."Ministry"
for select
to authenticated
using (public.is_admin_or_pastor());

create policy "Only admins can insert ministries"
on public."Ministry"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update ministries"
on public."Ministry"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read events" on public."Event";
drop policy if exists "Authenticated users can insert events" on public."Event";
drop policy if exists "Authenticated users can update events" on public."Event";
drop policy if exists "Authenticated users can read public events" on public."Event";
drop policy if exists "Only admins can insert events" on public."Event";
drop policy if exists "Only admins can update events" on public."Event";

create policy "Authenticated users can read public events"
on public."Event"
for select
to authenticated
using (true);

create policy "Only admins can insert events"
on public."Event"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update events"
on public."Event"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read schedules" on public."Schedule";
drop policy if exists "Authenticated users can insert schedules" on public."Schedule";
drop policy if exists "Authenticated users can update schedules" on public."Schedule";
drop policy if exists "Schedules are visible to authenticated users" on public."Schedule";
drop policy if exists "Only admins can insert schedules" on public."Schedule";
drop policy if exists "Only admins can update schedules" on public."Schedule";

create policy "Schedules are visible to authenticated users"
on public."Schedule"
for select
to authenticated
using (true);

create policy "Only admins can insert schedules"
on public."Schedule"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update schedules"
on public."Schedule"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read notification preferences" on public."NotificationPreference";
drop policy if exists "Authenticated users can insert notification preferences" on public."NotificationPreference";
drop policy if exists "Authenticated users can update notification preferences" on public."NotificationPreference";
drop policy if exists "Notification preferences are private to owner" on public."NotificationPreference";
drop policy if exists "Notification preferences can be inserted by owner" on public."NotificationPreference";
drop policy if exists "Notification preferences can be updated by owner" on public."NotificationPreference";

create policy "Notification preferences are private to owner"
on public."NotificationPreference"
for select
to authenticated
using ("personId" = public.current_person_id() or public.is_admin_or_pastor());

create policy "Notification preferences can be inserted by owner"
on public."NotificationPreference"
for insert
to authenticated
with check ("personId" = public.current_person_id() or public.is_admin_or_pastor());

create policy "Notification preferences can be updated by owner"
on public."NotificationPreference"
for update
to authenticated
using ("personId" = public.current_person_id() or public.is_admin_or_pastor())
with check ("personId" = public.current_person_id() or public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read app settings" on public."AppSetting";
drop policy if exists "Authenticated users can insert app settings" on public."AppSetting";
drop policy if exists "Authenticated users can update app settings" on public."AppSetting";
drop policy if exists "Only admins can read app settings" on public."AppSetting";
drop policy if exists "Only admins can insert app settings" on public."AppSetting";
drop policy if exists "Only admins can update app settings" on public."AppSetting";

create policy "Only admins can read app settings"
on public."AppSetting"
for select
to authenticated
using (public.is_admin_or_pastor());

create policy "Only admins can insert app settings"
on public."AppSetting"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update app settings"
on public."AppSetting"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read cell memberships" on public."CellMembership";
drop policy if exists "Authenticated users can insert cell memberships" on public."CellMembership";
drop policy if exists "Authenticated users can update cell memberships" on public."CellMembership";
drop policy if exists "Cell memberships are visible by scoped role" on public."CellMembership";
drop policy if exists "Cell memberships can be inserted by scoped role" on public."CellMembership";
drop policy if exists "Cell memberships can be updated by scoped role" on public."CellMembership";

create policy "Cell memberships are visible by scoped role"
on public."CellMembership"
for select
to authenticated
using (
  "personId" = public.current_person_id()
  or public.can_read_person_by_id("personId")
);

create policy "Cell memberships can be inserted by scoped role"
on public."CellMembership"
for insert
to authenticated
with check (public.can_manage_person_by_id("personId"));

create policy "Cell memberships can be updated by scoped role"
on public."CellMembership"
for update
to authenticated
using (public.can_manage_person_by_id("personId"))
with check (public.can_manage_person_by_id("personId"));

drop policy if exists "Authenticated users can read family members" on public."FamilyMember";
drop policy if exists "Authenticated users can insert family members" on public."FamilyMember";
drop policy if exists "Authenticated users can update family members" on public."FamilyMember";
drop policy if exists "Only admins can read family members" on public."FamilyMember";
drop policy if exists "Only admins can insert family members" on public."FamilyMember";
drop policy if exists "Only admins can update family members" on public."FamilyMember";

create policy "Only admins can read family members"
on public."FamilyMember"
for select
to authenticated
using (public.is_admin_or_pastor());

create policy "Only admins can insert family members"
on public."FamilyMember"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update family members"
on public."FamilyMember"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read ministry members" on public."MinistryMember";
drop policy if exists "Authenticated users can insert ministry members" on public."MinistryMember";
drop policy if exists "Authenticated users can update ministry members" on public."MinistryMember";
drop policy if exists "Only admins can read ministry members" on public."MinistryMember";
drop policy if exists "Only admins can insert ministry members" on public."MinistryMember";
drop policy if exists "Only admins can update ministry members" on public."MinistryMember";

create policy "Only admins can read ministry members"
on public."MinistryMember"
for select
to authenticated
using (public.is_admin_or_pastor());

create policy "Only admins can insert ministry members"
on public."MinistryMember"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update ministry members"
on public."MinistryMember"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());

drop policy if exists "Authenticated users can read event registrations" on public."EventRegistration";
drop policy if exists "Authenticated users can insert event registrations" on public."EventRegistration";
drop policy if exists "Authenticated users can update event registrations" on public."EventRegistration";
drop policy if exists "Event registrations are visible by owner or scoped role" on public."EventRegistration";
drop policy if exists "Event registrations can be inserted by owner or scoped role" on public."EventRegistration";
drop policy if exists "Event registrations can be updated by owner or scoped role" on public."EventRegistration";

create policy "Event registrations are visible by owner or scoped role"
on public."EventRegistration"
for select
to authenticated
using ("personId" = public.current_person_id() or public.can_read_person_by_id("personId"));

create policy "Event registrations can be inserted by owner or scoped role"
on public."EventRegistration"
for insert
to authenticated
with check ("personId" = public.current_person_id() or public.can_manage_person_by_id("personId"));

create policy "Event registrations can be updated by owner or scoped role"
on public."EventRegistration"
for update
to authenticated
using ("personId" = public.current_person_id() or public.can_manage_person_by_id("personId"))
with check ("personId" = public.current_person_id() or public.can_manage_person_by_id("personId"));

drop policy if exists "Authenticated users can read schedule assignments" on public."ScheduleAssignment";
drop policy if exists "Authenticated users can insert schedule assignments" on public."ScheduleAssignment";
drop policy if exists "Authenticated users can update schedule assignments" on public."ScheduleAssignment";
drop policy if exists "Schedule assignments are visible by owner or scoped role" on public."ScheduleAssignment";
drop policy if exists "Only admins can insert schedule assignments" on public."ScheduleAssignment";
drop policy if exists "Only admins can update schedule assignments" on public."ScheduleAssignment";

create policy "Schedule assignments are visible by owner or scoped role"
on public."ScheduleAssignment"
for select
to authenticated
using ("personId" = public.current_person_id() or public.can_read_person_by_id("personId"));

create policy "Only admins can insert schedule assignments"
on public."ScheduleAssignment"
for insert
to authenticated
with check (public.is_admin_or_pastor());

create policy "Only admins can update schedule assignments"
on public."ScheduleAssignment"
for update
to authenticated
using (public.is_admin_or_pastor())
with check (public.is_admin_or_pastor());
