-- Claude Certification Academy - initial schema
-- Run this in the Supabase SQL Editor (or `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists app_user (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists exam_result (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references app_user(id) on delete cascade,
  score         int  not null,
  correct_count int  not null,
  total         int  not null,
  by_topic      jsonb not null default '[]',
  time_used_sec int  not null default 0,
  duration_sec  int  not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists practice_entry (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references app_user(id) on delete cascade,
  topic_id   text not null,
  correct    boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_result_user    on exam_result(user_id);
create index if not exists idx_practice_entry_user on practice_entry(user_id);

alter table app_user       enable row level security;
alter table exam_result    enable row level security;
alter table practice_entry enable row level security;

drop policy if exists "prototype anon app_user"       on app_user;
drop policy if exists "prototype anon exam_result"    on exam_result;
drop policy if exists "prototype anon practice_entry" on practice_entry;
drop policy if exists "own app_user"                  on app_user;
drop policy if exists "own exam_result"               on exam_result;
drop policy if exists "own practice_entry"            on practice_entry;

create policy "own app_user" on app_user
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "own exam_result" on exam_result
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own practice_entry" on practice_entry
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
