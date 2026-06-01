# Supabase Auth and Persistence

The app works with zero backend: without credentials it runs entirely in memory
and data resets on reload. Add a Supabase project and it uses Supabase Auth plus
Postgres, so each learner's attempts persist across reloads and devices.

## Why the in-browser artifact preview doesn't persist

The single-file `bundle.html` is meant to render inside a sandboxed iframe that
can't reach an external database, so it always runs in in-memory mode. To get
real auth and persistence, run the project source (`npm run dev`) or deploy it
with the environment variables below.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a project.
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`.

The migration creates `app_user`, `exam_result`, and `practice_entry`. The
`app_user.id` column references `auth.users(id)`, and every table has
`auth.uid()`-scoped RLS policies for the `authenticated` role.

If you previously ran the old prototype migration, create a fresh database for
this demo or backfill user IDs to matching `auth.users.id` values before adding
the new foreign key.

## 2. Configure Supabase Auth

In **Authentication -> Providers**, enable the sign-in methods you want:

- Email: enable magic links.
- Google/GitHub: enable each provider and add its OAuth client credentials.

In **Authentication -> URL Configuration**, add your local and deployed app URLs
as allowed redirect URLs, for example:

```
http://localhost:5173
https://YOUR-DEPLOYED-DOMAIN
```

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings -> API**:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

## 4. Run

```
npm install
npm run dev
```

With Supabase configured, email sign-in sends a magic link and the Google/GitHub
buttons redirect through Supabase Auth. After the auth callback, the app stores
the Supabase access token locally and sends it as the PostgREST bearer token.

Every mock exam and guided-practice answer is written under the authenticated
`auth.uid()`. Signing back in rehydrates the dashboard, knowledge map, and trend
from that user's stored history.

## How it works

- `src/lib/repo.ts` handles Supabase Auth REST calls, local session refresh, and
  authenticated PostgREST requests. If credentials are absent, it no-ops.
- `src/lib/store.tsx` restores an auth session on app load, upserts the
  authenticated profile row, hydrates stored attempts, and mirrors new activity
  to Supabase.
- Local-first writes keep the UI responsive; persistence is a durable mirror.

## What is persisted

Exam summaries (`score`, `correct_count`, `total`, per-topic breakdown, timing)
and every practice answer (`topic_id`, `correct`). Per-question wrong-answer
review still uses the current in-session result.
