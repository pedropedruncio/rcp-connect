-- Migration: Discipleship Journal
-- Created: 2026-04-30

create table if not exists public."DiscipleshipJournal" (
  id text primary key,
  "pairId" text not null references public."DiscipleshipPair" (id) on delete cascade,
  "authorId" text not null references public."Person" (id) on delete cascade,
  content text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public."DiscipleshipJournal" enable row level security;

create policy "Authenticated users can read discipleship journals"
on public."DiscipleshipJournal"
for select
to authenticated
using (true);

create policy "Authenticated users can insert discipleship journals"
on public."DiscipleshipJournal"
for insert
to authenticated
with check (true);

drop trigger if exists set_discipleship_journal_updatedAt on public."DiscipleshipJournal";
create trigger set_discipleship_journal_updatedAt
before update on public."DiscipleshipJournal"
for each row
execute function public.set_current_timestamp_updatedAt();

create index if not exists idx_discipleship_journal_pair_id on public."DiscipleshipJournal" ("pairId");
