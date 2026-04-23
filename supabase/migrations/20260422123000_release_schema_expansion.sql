create extension if not exists "pgcrypto";

create or replace function public.set_current_timestamp_updatedAt()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

alter table if exists public."Person"
  add column if not exists address text,
  add column if not exists birthdate date,
  add column if not exists notes text,
  add column if not exists "avatarUrl" text,
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."User"
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."CellGroup"
  add column if not exists "disciplerId" text references public."Person" (id) on delete set null,
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."FollowUp"
  add column if not exists "cellGroupId" text references public."CellGroup" (id) on delete set null,
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."Family"
  add column if not exists "campusId" text references public."Campus" (id) on delete set null,
  add column if not exists notes text not null default '',
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."Ministry"
  add column if not exists "leaderId" text references public."Person" (id) on delete set null,
  add column if not exists "campusId" text references public."Campus" (id) on delete set null,
  add column if not exists status text not null default 'ATIVO' check (status in ('ATIVO', 'PAUSADO')),
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."Event"
  add column if not exists time text not null default '19:00',
  add column if not exists location text not null default '',
  add column if not exists category text not null default 'Igreja',
  add column if not exists status text not null default 'Planeamento' check (status in ('Planeamento', 'Confirmado', 'Concluído')),
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table if exists public."Schedule"
  add column if not exists title text not null default 'Escala',
  add column if not exists description text not null default '',
  add column if not exists "eventId" text references public."Event" (id) on delete set null,
  add column if not exists "campusId" text references public."Campus" (id) on delete set null,
  add column if not exists "createdAt" timestamptz not null default now(),
  add column if not exists "updatedAt" timestamptz not null default now();

create table if not exists public."CellMembership" (
  id text primary key,
  "cellGroupId" text not null references public."CellGroup" (id) on delete cascade,
  "personId" text not null references public."Person" (id) on delete cascade,
  "memberRole" text not null default 'MEMBER',
  "isActive" boolean not null default true,
  "joinedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("cellGroupId", "personId")
);

create table if not exists public."FamilyMember" (
  id text primary key,
  "familyId" text not null references public."Family" (id) on delete cascade,
  "personId" text not null references public."Person" (id) on delete cascade,
  relationship text not null default 'Membro',
  "isPrimaryContact" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("familyId", "personId")
);

create table if not exists public."MinistryMember" (
  id text primary key,
  "ministryId" text not null references public."Ministry" (id) on delete cascade,
  "personId" text not null references public."Person" (id) on delete cascade,
  role text not null default 'Voluntário',
  status text not null default 'ATIVO',
  "joinedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("ministryId", "personId")
);

create table if not exists public."EventRegistration" (
  id text primary key,
  "eventId" text not null references public."Event" (id) on delete cascade,
  "personId" text not null references public."Person" (id) on delete cascade,
  status text not null default 'Confirmado',
  notes text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("eventId", "personId")
);

create table if not exists public."ScheduleAssignment" (
  id text primary key,
  "scheduleId" text not null references public."Schedule" (id) on delete cascade,
  "personId" text not null references public."Person" (id) on delete cascade,
  "assignmentRole" text not null default 'Voluntário',
  status text not null default 'Planeado',
  notes text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("scheduleId", "personId")
);

create table if not exists public."NotificationPreference" (
  id text primary key,
  "personId" text not null unique references public."Person" (id) on delete cascade,
  "pushEnabled" boolean not null default true,
  "emailDigestEnabled" boolean not null default false,
  "smsEnabled" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."AppSetting" (
  id text primary key,
  "settingKey" text not null unique,
  "settingValue" text not null default '',
  scope text not null default 'global',
  "updatedByPersonId" text references public."Person" (id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_person_cell_group_id on public."Person" ("cellGroupId");
create index if not exists idx_person_campus_id on public."Person" ("campusId");
create index if not exists idx_cell_group_leader_id on public."CellGroup" ("leaderId");
create index if not exists idx_cell_group_discipler_id on public."CellGroup" ("disciplerId");
create index if not exists idx_follow_up_person_id on public."FollowUp" ("personId");
create index if not exists idx_follow_up_responsible_id on public."FollowUp" ("responsibleId");
create index if not exists idx_event_date on public."Event" (date);
create index if not exists idx_schedule_date on public."Schedule" (date);

drop trigger if exists set_person_updatedAt on public."Person";
create trigger set_person_updatedAt
before update on public."Person"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_user_updatedAt on public."User";
create trigger set_user_updatedAt
before update on public."User"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_cell_group_updatedAt on public."CellGroup";
create trigger set_cell_group_updatedAt
before update on public."CellGroup"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_follow_up_updatedAt on public."FollowUp";
create trigger set_follow_up_updatedAt
before update on public."FollowUp"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_family_updatedAt on public."Family";
create trigger set_family_updatedAt
before update on public."Family"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_ministry_updatedAt on public."Ministry";
create trigger set_ministry_updatedAt
before update on public."Ministry"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_event_updatedAt on public."Event";
create trigger set_event_updatedAt
before update on public."Event"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_schedule_updatedAt on public."Schedule";
create trigger set_schedule_updatedAt
before update on public."Schedule"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_cell_membership_updatedAt on public."CellMembership";
create trigger set_cell_membership_updatedAt
before update on public."CellMembership"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_family_member_updatedAt on public."FamilyMember";
create trigger set_family_member_updatedAt
before update on public."FamilyMember"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_ministry_member_updatedAt on public."MinistryMember";
create trigger set_ministry_member_updatedAt
before update on public."MinistryMember"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_event_registration_updatedAt on public."EventRegistration";
create trigger set_event_registration_updatedAt
before update on public."EventRegistration"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_schedule_assignment_updatedAt on public."ScheduleAssignment";
create trigger set_schedule_assignment_updatedAt
before update on public."ScheduleAssignment"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_notification_preference_updatedAt on public."NotificationPreference";
create trigger set_notification_preference_updatedAt
before update on public."NotificationPreference"
for each row
execute function public.set_current_timestamp_updatedAt();

drop trigger if exists set_app_setting_updatedAt on public."AppSetting";
create trigger set_app_setting_updatedAt
before update on public."AppSetting"
for each row
execute function public.set_current_timestamp_updatedAt();

alter table if exists public."Campus" enable row level security;
alter table if exists public."Role" enable row level security;
alter table if exists public."Person" enable row level security;
alter table if exists public."User" enable row level security;
alter table if exists public."CellGroup" enable row level security;
alter table if exists public."DiscipleshipPair" enable row level security;
alter table if exists public."FollowUp" enable row level security;
alter table if exists public."Family" enable row level security;
alter table if exists public."Ministry" enable row level security;
alter table if exists public."Event" enable row level security;
alter table if exists public."Schedule" enable row level security;
alter table if exists public."CellMembership" enable row level security;
alter table if exists public."FamilyMember" enable row level security;
alter table if exists public."MinistryMember" enable row level security;
alter table if exists public."EventRegistration" enable row level security;
alter table if exists public."ScheduleAssignment" enable row level security;
alter table if exists public."NotificationPreference" enable row level security;
alter table if exists public."AppSetting" enable row level security;

drop policy if exists "Authenticated users can read campus" on public."Campus";
create policy "Authenticated users can read campus"
on public."Campus"
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read roles" on public."Role";
create policy "Authenticated users can read roles"
on public."Role"
for select
to authenticated
using (true);

drop policy if exists "Users can read own person" on public."Person";
drop policy if exists "Users can insert own person" on public."Person";
drop policy if exists "Users can update own person" on public."Person";
create policy "Authenticated users can read people"
on public."Person"
for select
to authenticated
using (true);
create policy "Authenticated users can insert people"
on public."Person"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update people"
on public."Person"
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Users can read own user row" on public."User";
drop policy if exists "Users can insert own user row" on public."User";
drop policy if exists "Users can update own user row" on public."User";
create policy "Authenticated users can read users"
on public."User"
for select
to authenticated
using (true);
create policy "Authenticated users can insert users"
on public."User"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update users"
on public."User"
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read cell groups" on public."CellGroup";
create policy "Authenticated users can read cell groups"
on public."CellGroup"
for select
to authenticated
using (true);
create policy "Authenticated users can insert cell groups"
on public."CellGroup"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update cell groups"
on public."CellGroup"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read discipleship pairs"
on public."DiscipleshipPair"
for select
to authenticated
using (true);
create policy "Authenticated users can insert discipleship pairs"
on public."DiscipleshipPair"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update discipleship pairs"
on public."DiscipleshipPair"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read follow ups"
on public."FollowUp"
for select
to authenticated
using (true);
create policy "Authenticated users can insert follow ups"
on public."FollowUp"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update follow ups"
on public."FollowUp"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read families"
on public."Family"
for select
to authenticated
using (true);
create policy "Authenticated users can insert families"
on public."Family"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update families"
on public."Family"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read ministries"
on public."Ministry"
for select
to authenticated
using (true);
create policy "Authenticated users can insert ministries"
on public."Ministry"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update ministries"
on public."Ministry"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read events"
on public."Event"
for select
to authenticated
using (true);
create policy "Authenticated users can insert events"
on public."Event"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update events"
on public."Event"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read schedules"
on public."Schedule"
for select
to authenticated
using (true);
create policy "Authenticated users can insert schedules"
on public."Schedule"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update schedules"
on public."Schedule"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read cell memberships"
on public."CellMembership"
for select
to authenticated
using (true);
create policy "Authenticated users can insert cell memberships"
on public."CellMembership"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update cell memberships"
on public."CellMembership"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read family members"
on public."FamilyMember"
for select
to authenticated
using (true);
create policy "Authenticated users can insert family members"
on public."FamilyMember"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update family members"
on public."FamilyMember"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read ministry members"
on public."MinistryMember"
for select
to authenticated
using (true);
create policy "Authenticated users can insert ministry members"
on public."MinistryMember"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update ministry members"
on public."MinistryMember"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read event registrations"
on public."EventRegistration"
for select
to authenticated
using (true);
create policy "Authenticated users can insert event registrations"
on public."EventRegistration"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update event registrations"
on public."EventRegistration"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read schedule assignments"
on public."ScheduleAssignment"
for select
to authenticated
using (true);
create policy "Authenticated users can insert schedule assignments"
on public."ScheduleAssignment"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update schedule assignments"
on public."ScheduleAssignment"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read notification preferences"
on public."NotificationPreference"
for select
to authenticated
using (true);
create policy "Authenticated users can insert notification preferences"
on public."NotificationPreference"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update notification preferences"
on public."NotificationPreference"
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read app settings"
on public."AppSetting"
for select
to authenticated
using (true);
create policy "Authenticated users can insert app settings"
on public."AppSetting"
for insert
to authenticated
with check (true);
create policy "Authenticated users can update app settings"
on public."AppSetting"
for update
to authenticated
using (true)
with check (true);
