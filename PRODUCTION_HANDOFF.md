# Production Handoff and User Action Tracker

This file is the persistent owner-action tracker for the Claude Academy source
website. Keep it updated whenever implementation touches credentials,
infrastructure, dashboards, OAuth providers, payment providers, DNS, or deploy
configuration.

## COMPLETED AUTOMATICALLY

- Implemented Supabase Auth client flow with PKCE support for email magic links
  and OAuth providers.
- Implemented authenticated PostgREST persistence with dual headers:
  `apikey: <anon key>` and `Authorization: Bearer <user access_token>`.
- Implemented user profile upsert, exam persistence, practice persistence, and
  entitlement loading.
- Implemented server-side Edge Function integration points for:
  `tutor`, `create-checkout`, and `stripe-webhook`.
- Added production hardening migration for subscriptions, usage tracking,
  indexes, signup provisioning, and database-enforced free-plan quotas.
- Added Stripe Checkout redirect flow and webhook-backed entitlement updates.
- Added dependency-free Sentry event posting when `VITE_SENTRY_DSN` is present.
- Added Vercel, Netlify, static headers, robots, sitemap, CI, tests, and
  production build configuration.
- Added legal routes for Terms and Privacy.
- Standardized package management on pnpm.
- Verified locally:
  `corepack pnpm install --frozen-lockfile`
  `corepack pnpm run test`
  `corepack pnpm run build`
  `corepack pnpm run lint`

## USER ACTION REQUIRED

--------------------------------------------------
USER ACTION REQUIRED #1
--------------------------------------------------

Category:
Supabase

Priority:
Critical

Reason:
Authentication, RLS persistence, Edge Functions, server-side AI, and paid
entitlements require a live Supabase project.

Required Value:
`VITE_SUPABASE_URL`
`VITE_SUPABASE_ANON_KEY`

Where To Obtain It:
Supabase Dashboard -> Project Settings -> API

How To Configure It:
Local:

```bash
copy .env.example .env.local
```

Then set:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

Deployment provider:
Add the same variables in Vercel or Netlify project environment settings.

Files Affected:
`src/lib/repo.ts`
`src/lib/store.tsx`
`.env.example`

Implementation Blocked?
No. The app falls back to in-memory demo mode without these values, but
production auth/persistence is blocked.

--------------------------------------------------
USER ACTION REQUIRED #2
--------------------------------------------------

Category:
Supabase Database

Priority:
Critical

Reason:
The database schema, RLS policies, subscription tables, usage tracking, and
quota triggers must exist in the target Supabase project.

Required Value:
Executed migrations:
`supabase/migrations/0001_init.sql`
`supabase/migrations/0002_hardening.sql`

Where To Obtain It:
Already in this repository.

How To Configure It:
Option A, Supabase SQL Editor:
Run `0001_init.sql`, then `0002_hardening.sql`.

Option B, Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Files Affected:
`supabase/migrations/0001_init.sql`
`supabase/migrations/0002_hardening.sql`
`src/lib/repo.ts`
`src/lib/store.tsx`

Implementation Blocked?
No. The migration files are implemented. Production database behavior is blocked
until they are applied.

--------------------------------------------------
USER ACTION REQUIRED #3
--------------------------------------------------

Category:
Supabase Auth

Priority:
Critical

Reason:
Magic links and OAuth callbacks only work for URLs registered in Supabase Auth.

Required Value:
Allowed redirect URLs:
`http://localhost:5173`
`https://YOUR-DEPLOYED-DOMAIN`

Where To Obtain It:
Your local dev URL and final Vercel/Netlify/custom domain.

How To Configure It:
Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://YOUR-DEPLOYED-DOMAIN`
- Redirect URLs:
  - `http://localhost:5173`
  - `https://YOUR-DEPLOYED-DOMAIN`

Files Affected:
`src/lib/repo.ts`
`src/screens/Login.tsx`
`SUPABASE_SETUP.md`

Implementation Blocked?
No. Code is implemented. End-to-end sign-in is blocked until dashboard URLs are
configured.

--------------------------------------------------
USER ACTION REQUIRED #4
--------------------------------------------------

Category:
OAuth Providers

Priority:
High

Reason:
The Google and GitHub buttons redirect through Supabase Auth, but provider apps
must be configured in Google Cloud and GitHub before production OAuth works.

Required Value:
Google OAuth Client ID and Client Secret
GitHub OAuth Client ID and Client Secret

Where To Obtain It:
Google Cloud Console -> APIs & Services -> Credentials
GitHub Developer Settings -> OAuth Apps

How To Configure It:
Supabase Dashboard -> Authentication -> Providers:

- Enable Google and paste the Google OAuth credentials.
- Enable GitHub and paste the GitHub OAuth credentials.

Provider callback URL:

```text
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

Files Affected:
`src/lib/repo.ts`
`src/screens/Login.tsx`

Implementation Blocked?
No. Email magic link can still work. Google/GitHub login is blocked until the
provider dashboards are configured.

--------------------------------------------------
USER ACTION REQUIRED #5
--------------------------------------------------

Category:
Anthropic

Priority:
Critical

Reason:
The secure AI tutor backend requires server-side Anthropic API access. The key
must never be exposed in the browser.

Required Value:
`ANTHROPIC_API_KEY`
Optional: `ANTHROPIC_MODEL`

Where To Obtain It:
Anthropic Console

How To Configure It:
Supabase Edge Function secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```

Deploy the function:

```bash
supabase functions deploy tutor
```

Files Affected:
`supabase/functions/tutor/index.ts`
`src/lib/claude.ts`
`src/lib/repo.ts`

Implementation Blocked?
No. The function and client integration are implemented. Real AI responses are
blocked until the secret is configured and the function is deployed.

--------------------------------------------------
USER ACTION REQUIRED #6
--------------------------------------------------

Category:
Stripe

Priority:
Critical

Reason:
Subscription checkout and webhook-backed entitlements require a Stripe account,
products, prices, and webhook signing secret.

Required Value:
`STRIPE_SECRET_KEY`
`STRIPE_WEBHOOK_SECRET`
`STRIPE_PRICE_PRO`
`STRIPE_PRICE_MENTOR`
Optional client value: `VITE_STRIPE_PUBLISHABLE_KEY`

Where To Obtain It:
Stripe Dashboard -> Developers -> API keys
Stripe Dashboard -> Product catalog -> Prices
Stripe Dashboard -> Developers -> Webhooks

How To Configure It:
Create subscription prices for Pro and Mentor, then set Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_MENTOR=price_...
```

Deploy checkout function:

```bash
supabase functions deploy create-checkout
```

Create webhook endpoint in Stripe:

```text
https://YOUR-PROJECT-REF.functions.supabase.co/stripe-webhook
```

Listen for:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Then set:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy stripe-webhook --no-verify-jwt
```

Files Affected:
`src/screens/Pricing.tsx`
`src/lib/repo.ts`
`supabase/functions/create-checkout/index.ts`
`supabase/functions/stripe-webhook/index.ts`
`supabase/migrations/0002_hardening.sql`

Implementation Blocked?
No. Checkout code is implemented. Real paid upgrades are blocked until Stripe
products, prices, secrets, and webhook are configured.

--------------------------------------------------
USER ACTION REQUIRED #7
--------------------------------------------------

Category:
Supabase Edge Functions

Priority:
Critical

Reason:
The browser calls Supabase Edge Functions for AI and checkout. These functions
must be deployed to the linked Supabase project.

Required Value:
Deployed functions:
`tutor`
`create-checkout`
`stripe-webhook`

Where To Obtain It:
Already in this repository under `supabase/functions`.

How To Configure It:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy tutor
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

Files Affected:
`supabase/functions/tutor/index.ts`
`supabase/functions/create-checkout/index.ts`
`supabase/functions/stripe-webhook/index.ts`

Implementation Blocked?
No. Function source is implemented. Runtime behavior is blocked until deployed.

--------------------------------------------------
USER ACTION REQUIRED #8
--------------------------------------------------

Category:
Deployment

Priority:
High

Reason:
The static app must be deployed and its final origin must be fed back into
Supabase Auth and Stripe checkout/webhook configuration.

Required Value:
Production deployment URL

Where To Obtain It:
Vercel, Netlify, or your hosting provider after deployment.

How To Configure It:
Vercel:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

Project settings:

- Build command: `pnpm build`
- Output directory: `dist`
- Add env vars from `.env.example`.

Netlify:

- Build command: `pnpm build`
- Publish directory: `dist`
- Add env vars from `.env.example`.

Files Affected:
`vercel.json`
`netlify.toml`
`public/_headers`
`public/robots.txt`
`public/sitemap.xml`

Implementation Blocked?
No. Deploy configs are implemented. Production availability is blocked until a
hosting project is connected.

--------------------------------------------------
USER ACTION REQUIRED #9
--------------------------------------------------

Category:
Observability

Priority:
Medium

Reason:
Client crash reporting is implemented but optional. Without a DSN, production
errors are not sent to Sentry.

Required Value:
`VITE_SENTRY_DSN`

Where To Obtain It:
Sentry Project Settings -> Client Keys / DSN

How To Configure It:
Add to `.env.local` and deployment provider env vars:

```env
VITE_SENTRY_DSN=https://PUBLIC_KEY@ORG.ingest.sentry.io/PROJECT_ID
```

Files Affected:
`src/lib/observability.ts`
`src/components/ErrorBoundary.tsx`
`src/main.tsx`

Implementation Blocked?
No. Observability is optional.

--------------------------------------------------
USER ACTION REQUIRED #10
--------------------------------------------------

Category:
Legal / Business

Priority:
High

Reason:
Terms and Privacy routes exist, but production copy must be reviewed for your
actual business, billing policy, data handling, and jurisdiction.

Required Value:
Approved Terms of Service
Approved Privacy Policy
Refund/cancellation language
Business contact details

Where To Obtain It:
Repository owner, legal counsel, or policy generator reviewed by owner.

How To Configure It:
Edit:

```text
src/screens/Legal.tsx
```

Files Affected:
`src/screens/Legal.tsx`
`src/screens/Landing.tsx`
`src/screens/Login.tsx`

Implementation Blocked?
No. Routes are implemented. Production legal confidence is blocked until copy is
approved.

--------------------------------------------------
USER ACTION REQUIRED #11
--------------------------------------------------

Category:
Domain / DNS

Priority:
Medium

Reason:
A custom domain requires DNS records and must be added to auth/payment callback
allow-lists.

Required Value:
Custom domain
DNS records requested by Vercel/Netlify

Where To Obtain It:
Domain registrar and hosting provider dashboard.

How To Configure It:
Follow the hosting provider's domain setup, then add the final domain to:

- Supabase Auth redirect URLs
- Google OAuth authorized redirect origins, if Google is enabled
- GitHub OAuth callback settings, if GitHub is enabled
- Stripe allowed success/cancel URLs if restricted in your Stripe setup

Files Affected:
No source file required unless `public/sitemap.xml` should use the custom domain.

Implementation Blocked?
No. Custom domain is optional.

## OPTIONAL IMPROVEMENTS

- Replace placeholder/legal copy with reviewed production language.
- Tighten Edge Function CORS from `*` to the production domain after deployment.
- Add Deno checks for Supabase Edge Functions in CI.
- Add end-to-end tests for auth redirect, checkout redirect, and protected route
  behavior.
- Add deployment-specific environment documentation for Vercel and Netlify.
- Update `public/sitemap.xml` to the production domain.
- Decide whether to keep both Vercel and Netlify configs or standardize on one
  hosting target.

## READY FOR TESTING

- In-memory demo mode without Supabase env vars.
- Email magic-link request flow once Supabase env vars and redirect URLs are set.
- Google/GitHub OAuth buttons once provider dashboards are configured.
- Authenticated exam/practice persistence once migrations are applied.
- Free-plan quota behavior once `0002_hardening.sql` is applied.
- AI tutor requests once `tutor` is deployed with `ANTHROPIC_API_KEY`.
- Stripe checkout redirect once `create-checkout` is deployed with Stripe
  secrets and price IDs.
- Entitlement updates once `stripe-webhook` is deployed and registered in
  Stripe.
- Error boundary fallback and optional Sentry reporting.

# FINAL HANDOFF REPORT

## 1. Files Modified

- `.env.example`
- `eslint.config.js`
- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `src/App.tsx`
- `src/hooks/use-toast.ts`
- `src/index.css`
- `src/lib/claude.ts`
- `src/lib/repo.ts`
- `src/lib/store.tsx`
- `src/main.tsx`
- `src/screens/Analytics.tsx`
- `src/screens/Exam.tsx`
- `src/screens/Guided.tsx`
- `src/screens/Landing.tsx`
- `src/screens/Login.tsx`
- `src/screens/Pricing.tsx`
- `tsconfig.app.json`
- `vite.config.ts`

## 2. Files Created

- `.github/workflows/ci.yml`
- `netlify.toml`
- `public/_headers`
- `public/robots.txt`
- `public/sitemap.xml`
- `src/components/ErrorBoundary.tsx`
- `src/components/__tests__/ErrorBoundary.test.tsx`
- `src/lib/__tests__/auth.test.ts`
- `src/lib/__tests__/grade.test.ts`
- `src/lib/__tests__/profile.test.ts`
- `src/lib/__tests__/retrieve.test.ts`
- `src/lib/__tests__/routing.test.ts`
- `src/lib/observability.ts`
- `src/screens/Legal.tsx`
- `src/test/setup.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/tutor/index.ts`
- `supabase/migrations/0002_hardening.sql`
- `vercel.json`
- `vitest.config.ts`
- `PRODUCTION_HANDOFF.md`

## 3. Database Migrations Created

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_hardening.sql`

Apply in order.

## 4. Environment Variables Required

Client/deployment:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
VITE_SENTRY_DSN=
VITE_STRIPE_PUBLISHABLE_KEY=
```

Supabase Edge Function secrets:

```text
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_MENTOR
```

Supabase platform-provided:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 5. Dashboard Configurations Required

- Supabase project created.
- Supabase SQL migrations applied.
- Supabase Auth URL configuration updated.
- Supabase Auth providers enabled as desired.
- Supabase Edge Functions deployed.
- Stripe products and recurring prices created.
- Stripe webhook endpoint created.
- Vercel or Netlify project connected.
- Deployment environment variables configured.
- Optional Sentry project configured.

## 6. Third-Party Accounts Required

- Supabase
- Anthropic
- Stripe
- GitHub
- Vercel or Netlify
- Optional Sentry
- Optional Google Cloud OAuth app
- Optional GitHub OAuth app
- Optional domain registrar

## 7. Secrets Required

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_MENTOR=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Use test-mode Stripe keys first, then swap to live-mode keys after verification.

## 8. DNS Changes Required

None for the default Vercel/Netlify URL.

For a custom domain:

- Add the domain in the hosting provider.
- Add the DNS records requested by the provider at your registrar.
- Add the custom domain to Supabase redirect URLs.
- Update OAuth provider allowed origins/callbacks.
- Update `public/sitemap.xml`.

## 9. OAuth Configuration Required

Supabase Auth:

- Enable Email provider for magic links.
- Enable Google and/or GitHub if those buttons should work.

Google/GitHub provider callback:

```text
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

App redirect URLs:

```text
http://localhost:5173
https://YOUR-DEPLOYED-DOMAIN
```

## 10. Deployment Steps Required

Local verification:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run test
corepack pnpm run build
corepack pnpm run lint
```

Supabase:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_MENTOR=price_...
supabase functions deploy tutor
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

Hosting:

- Connect GitHub repo.
- Build command: `pnpm build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Add optional `VITE_SENTRY_DSN`.
- Deploy.

Stripe:

- Create products/prices.
- Register webhook endpoint:
  `https://YOUR-PROJECT-REF.functions.supabase.co/stripe-webhook`
- Select events:
  `checkout.session.completed`,
  `customer.subscription.created`,
  `customer.subscription.updated`,
  `customer.subscription.deleted`.
- Copy webhook signing secret into Supabase secrets.
- Redeploy `stripe-webhook`.

## 11. Manual Verification Checklist

- Open deployed app.
- Visit `/pricing`, `/terms`, and `/privacy`.
- Sign in with email magic link.
- Sign out and sign back in.
- Take one mock exam; confirm `exam_result` row appears for `auth.uid()`.
- Answer guided-practice questions; confirm `practice_entry` rows appear.
- Confirm free user cannot exceed configured free quotas.
- Use AI tutor; confirm text response and `usage_event` row.
- Start Pro checkout with Stripe test card `4242 4242 4242 4242`.
- Confirm webhook updates `subscription` to active.
- Refresh app and confirm upgraded plan is loaded from server.
- Cancel subscription in Stripe test mode and confirm entitlement updates.
- Trigger a recoverable UI error in test/dev and confirm ErrorBoundary fallback.
- If Sentry is configured, confirm an event arrives in Sentry.

## 12. Production Readiness Score Before

55/100

Reason:
The app had a working frontend and Supabase auth/persistence foundation, but
production deployment, AI backend security, Stripe entitlement source of truth,
tests, CI, legal routes, and owner action tracking were incomplete or missing.

## 13. Production Readiness Score After

82/100

Reason:
Core production architecture is implemented, verified locally, and documented.
Remaining work is mostly owner-side dashboard configuration, external account
setup, and final policy/domain verification.

## 14. Remaining Blockers

- Live Supabase project values are not configured in this workspace.
- Supabase migrations are not confirmed applied to production.
- Supabase Auth redirect URLs are not confirmed configured.
- Google/GitHub OAuth apps are not confirmed configured.
- Anthropic API key is not configured in Supabase secrets.
- Stripe products, price IDs, and webhook secret are not configured.
- Supabase Edge Functions are not confirmed deployed.
- Hosting provider environment variables are not configured.
- Legal copy is not owner-approved.
- Custom domain/DNS is not configured, if desired.

## 15. Exact Next Steps For The User

1. Create or open your Supabase project.
2. Apply database migrations:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

3. Add local frontend env:

```bash
copy .env.example .env.local
```

Set:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

4. Configure Supabase Auth redirect URLs:

```text
http://localhost:5173
https://YOUR-DEPLOYED-DOMAIN
```

5. Add Anthropic and Stripe secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_MENTOR=price_...
```

6. Deploy Edge Functions:

```bash
supabase functions deploy tutor
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

7. Create Stripe webhook endpoint:

```text
https://YOUR-PROJECT-REF.functions.supabase.co/stripe-webhook
```

8. Copy the Stripe webhook signing secret, then run:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy stripe-webhook --no-verify-jwt
```

9. Deploy the frontend on Vercel or Netlify with:

```text
Build command: pnpm build
Output directory: dist
```

10. Add frontend env vars to the deploy provider:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
VITE_SENTRY_DSN=
VITE_STRIPE_PUBLISHABLE_KEY=
```

11. Run the manual verification checklist above.
