create extension if not exists "pgcrypto";

create table if not exists public."Campus" (
  id text primary key,
  name text not null unique,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Role" (
  id text primary key,
  name text not null unique check (name in ('MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN')),
  description text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Person" (
  id text primary key,
  "firstName" text not null,
  "lastName" text,
  email text unique,
  phone text,
  address text,
  birthdate date,
  notes text,
  status text not null default 'MEMBRO' check (status in ('MEMBRO', 'VISITANTE', 'BATIZADO', 'INATIVO')),
  "campusId" text references public."Campus" (id) on delete set null,
  "cellGroupId" text,
  "avatarUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."User" (
  id text primary key,
  email text not null unique,
  "personId" text not null unique references public."Person" (id) on delete cascade,
  "roleId" text not null references public."Role" (id),
  "supabaseId" uuid not null unique references auth.users (id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updatedAt()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

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

alter table public."Campus" enable row level security;
alter table public."Role" enable row level security;
alter table public."Person" enable row level security;
alter table public."User" enable row level security;

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
create policy "Users can read own person"
on public."Person"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u."personId" = "Person".id
      and u."supabaseId" = auth.uid()::text
  )
);

drop policy if exists "Users can insert own person" on public."Person";
create policy "Users can insert own person"
on public."Person"
for insert
to authenticated
with check (true);

drop policy if exists "Users can update own person" on public."Person";
create policy "Users can update own person"
on public."Person"
for update
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u."personId" = "Person".id
      and u."supabaseId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public."User" u
    where u."personId" = "Person".id
      and u."supabaseId" = auth.uid()::text
  )
);

drop policy if exists "Users can read own user row" on public."User";
create policy "Users can read own user row"
on public."User"
for select
to authenticated
using ("supabaseId" = auth.uid()::text);

drop policy if exists "Users can insert own user row" on public."User";
create policy "Users can insert own user row"
on public."User"
for insert
to authenticated
with check ("supabaseId" = auth.uid()::text);

drop policy if exists "Users can update own user row" on public."User";
create policy "Users can update own user row"
on public."User"
for update
to authenticated
using ("supabaseId" = auth.uid()::text)
with check ("supabaseId" = auth.uid()::text);
