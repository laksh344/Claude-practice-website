-- Claude Certification Academy — production hardening
-- Adds: server-side entitlements (subscription), usage tracking, auto user
-- provisioning, composite indexes, and DB-enforced free-plan quotas.
-- Run after 0001_init.sql (Supabase SQL editor or `supabase db push`).

-- ── Entitlements: the single source of truth for a user's plan ──────────────
create table if not exists subscription (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free', 'pro', 'mentor')),
  status                 text not null default 'inactive',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- ── Usage tracking: powers per-plan rate limits (AI, etc.) ──────────────────
create table if not exists usage_event (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  units      int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_exam_result_user_created    on exam_result(user_id, created_at);
create index if not exists idx_practice_entry_user_created on practice_entry(user_id, created_at);
create index if not exists idx_usage_event_user_kind_time  on usage_event(user_id, kind, created_at);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table subscription enable row level security;
alter table usage_event  enable row level security;

drop policy if exists "read own subscription" on subscription;
create policy "read own subscription" on subscription
  for select to authenticated
  using (user_id = auth.uid());
-- No write policies for users: only the Stripe webhook (service role, which
-- bypasses RLS) may write entitlements. The client can never grant itself a plan.

drop policy if exists "read own usage" on usage_event;
create policy "read own usage" on usage_event
  for select to authenticated
  using (user_id = auth.uid());
-- Inserts are performed by Edge Functions using the service role only.

-- ── Plan lookup (security definer so triggers can read regardless of caller) ─
create or replace function current_plan(uid uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select plan from subscription
      where user_id = uid and status = 'active'
      order by current_period_end desc nulls last
      limit 1),
    'free'
  );
$$;

-- ── Auto-provision profile + free entitlement on signup ─────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into app_user (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
  insert into subscription (user_id, plan, status)
    values (new.id, 'free', 'active')
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── DB-enforced free-plan quotas (cannot be bypassed by the client) ─────────
-- Free: 1 mock exam total.
create or replace function enforce_exam_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_plan(new.user_id) = 'free'
     and (select count(*) from exam_result where user_id = new.user_id) >= 1 then
    raise exception 'FREE_PLAN_EXAM_LIMIT' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exam_quota on exam_result;
create trigger trg_exam_quota
  before insert on exam_result
  for each row execute function enforce_exam_quota();

-- Free: 10 practice answers per rolling 24h.
create or replace function enforce_practice_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_plan(new.user_id) = 'free'
     and (select count(*) from practice_entry
            where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'FREE_PLAN_PRACTICE_LIMIT' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_practice_quota on practice_entry;
create trigger trg_practice_quota
  before insert on practice_entry
  for each row execute function enforce_practice_quota();
