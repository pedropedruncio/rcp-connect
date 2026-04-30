
-- Adicionar data de batismo à tabela Person
alter table public."Person" add column if not exists "baptismDate" date;

-- Criar tabela de Pedidos de Oração
create table if not exists public."PrayerRequest" (
  id text primary key,
  "personId" text not null references public."Person" (id) on delete cascade,
  "request" text not null,
  "status" text not null default 'PENDING' check ("status" in ('PENDING', 'ANSWERED')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Ativar RLS
alter table public."PrayerRequest" enable row level security;

-- Triggers para updatedAt
drop trigger if exists set_prayer_request_updatedAt on public."PrayerRequest";
create trigger set_prayer_request_updatedAt
before update on public."PrayerRequest"
for each row
execute function public.set_current_timestamp_updatedAt();

-- Políticas RLS para PrayerRequest
create policy "Prayer requests are visible to person and their leaders"
on public."PrayerRequest"
for select
to authenticated
using (
  "personId" = public.current_person_id()
  or public.can_read_person_by_id("personId")
);

create policy "Prayer requests can be inserted by person or their leaders"
on public."PrayerRequest"
for insert
to authenticated
with check (
  "personId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
);

create policy "Prayer requests can be updated by person or their leaders"
on public."PrayerRequest"
for update
to authenticated
using (
  "personId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
)
with check (
  "personId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
);

create policy "Prayer requests can be deleted by person or their leaders"
on public."PrayerRequest"
for delete
to authenticated
using (
  "personId" = public.current_person_id()
  or public.can_manage_person_by_id("personId")
);
-- Adicionar líderes em treino à tabela CellGroup
alter table public."CellGroup" add column if not exists "traineeLeaderIds" text[] not null default '{}';
