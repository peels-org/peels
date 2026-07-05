# Supabase Local-First Guide

This is the operational guide for running Peels with the Supabase CLI, preview branches, and local mock data.

## What Lives Where

- Git repo: schema migrations, local bucket config, local seed data, and app code
- Supabase dashboard: GitHub integration, preview branches, and hosted project settings
- GitHub settings: required PR checks on `main`
- Vercel settings: preview environment variables

If you remember one thing, make it this: we now treat `supabase/` in Git as the source of truth for schema work, but a few platform toggles still have to be enabled once in Supabase, GitHub, and Vercel.

## One-Time Dashboard Setup

### 1. Connect Supabase to GitHub

Official reference: [Supabase GitHub integration docs](https://supabase.com/docs/guides/deployment/branching/github-integration)

1. Open the Peels project in the Supabase dashboard.
2. Go to `Project Settings` -> `Integrations`.
3. Under `GitHub Integration`, click `Authorize GitHub`.
4. Complete the GitHub authorisation flow and return to Supabase.
5. Choose the Peels GitHub repository.
6. Set the Supabase directory path to `supabase`.
7. Turn on `Automatic branching`.
8. Turn on `Supabase changes only`.
9. Leave `main` as the production branch.
10. Do not turn on `Deploy to production` until you are happy with preview-branch behaviour.
11. Save or enable the integration.

What this does:

- A PR branch that changes `supabase/**` gets its own Supabase preview branch.
- That preview branch runs migrations and bucket config from Git.
- Seed data comes from `supabase/seed.sql`, not from production data.
- Demo media is tracked under `supabase/storage/`, but is uploaded only into local Supabase with `npm run seed:local-media`.

### 2. Require the Supabase PR Check in GitHub

Official reference: [GitHub branch protection docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)

1. Open the Peels GitHub repository.
2. Go to `Settings` -> `Branches`.
3. Edit the existing rule for `main`, or create one if there is not already a rule.
4. Turn on `Require status checks to pass before merging`.
5. In the check list, select `Supabase Preview` once it has appeared at least once on a PR.
6. Keep `Require branches to be up to date before merging` on if you want stricter protection.
7. Save the branch rule.

What this does:

- GitHub will block merging a PR into `main` if Supabase could not build the preview branch cleanly.

### 3. Point Vercel Preview Deployments at Preview Supabase Branches

Official reference: [Vercel environment variable docs](https://vercel.com/docs/environment-variables/manage-across-environments)

1. Open the Peels project in Vercel.
2. Go to `Settings` -> `Environment Variables`.
3. Check what is currently set for:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Keep the production values for the `Production` environment.
5. Set `Preview` values so preview deployments use the Supabase branch credentials instead of production credentials.
6. If you want branch-specific overrides, add them for the matching Git branch in Vercel.
7. Redeploy a preview deployment after changing the variables.

What this does:

- Your preview frontend talks to the preview Supabase branch instead of the live Peels database.

## Local Development on Your Current Computer

### Start from scratch

```bash
npm install
cp .env.example .env.local
npm run supabase:start
npm run supabase:reset
npm run seed:local-media
npm run supabase:env
```

Then make sure `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste the ANON_KEY value here>
```

Do not mix the hosted project URL with the local anon key. That combination fails with `Invalid API key`.

Finally:

```bash
npm run dev
```

### Local `.env.local` for Playwright

Both Playwright suites expect the local seeded Supabase stack, not the hosted Peels project.

Use this shape in `.env.local` before `npm run test:e2e:prod`:

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste the ANON_KEY value from npm run supabase:env>
```

Recommended sequence:

1. Run `npm run supabase:start`
2. Run `npm run supabase:reset`
3. Run `npm run seed:local-media`
4. Run `npm run supabase:env`
5. Paste the printed `ANON_KEY` into `.env.local`
6. Run `npm run test:e2e` or `npm run test:e2e:prod`

If `.env.local` still points at `https://mfnaqdyunuafbwukbbyr.supabase.co`, the smoke suite will not see the seeded local listings, demo accounts, or demo chat thread.

### Local URLs

- App: `http://127.0.0.1:3000`
- Supabase API: `http://127.0.0.1:54331`
- Supabase Studio: `http://127.0.0.1:54333`
- Mailpit: `http://127.0.0.1:54334`

Peels intentionally uses the `54331`-`54334` range so you can run it alongside other Supabase projects that still use the default local ports.

### Local auth emails

Supabase captures local auth emails in Mailpit instead of sending them to a real inbox. After `npm run supabase:start`, open `http://127.0.0.1:54334` to inspect password reset, magic-link, invite, and email-change messages generated by the local stack.

The local stack uses Supabase's built-in auth email templates unless the Send Email Auth Hook is configured locally. The Peels custom auth email implementation lives in `supabase/functions/send-email-for-auth-action`, but that function is only used when Supabase Auth is configured to call it as the `send_email` hook. Hosted environments configure that in Supabase Auth Hooks; the default local `config.toml` path keeps Mailpit simple and uses the built-in templates.

For reset-password testing, use the reset link from Mailpit and keep the app running at `http://127.0.0.1:3000`. `supabase/config.toml` allow-lists `http://127.0.0.1:3000/**` and `http://localhost:3000/**` so Supabase can redirect through `/auth/complete` before landing on `/profile/reset-password`.

### Demo accounts

Both local demo accounts use the password `peels-demo-password`.

- Host account: `demo-host@peels.local`
- Donor account: `demo-donor@peels.local`

The seed also creates:

- 3 public listings
- 1 chat thread
- 2 chat messages
- seeded profile avatars and listing photos in local Supabase Storage

The demo data is synthetic and safe to keep in Git.

When `NEXT_PUBLIC_SUPABASE_URL` points at `http://127.0.0.1:54331`, avatar and listing-photo uploads also go to the local Supabase buckets rather than production. Repo-tracked bucket media is uploaded only by `npm run seed:local-media`, not by hosted Supabase deploys.

## Fresh Computer Setup

Use this when setting up Peels on a new machine.

### Prerequisites

- Node.js
- npm
- Docker Desktop
- Supabase CLI

### Steps

1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run supabase:start`.
5. Run `npm run supabase:reset`.
6. Run `npm run seed:local-media`.
7. Run `npm run supabase:env`.
8. Set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331` in `.env.local`.
9. Copy the printed `ANON_KEY` into `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
10. Copy the printed `SERVICE_ROLE_KEY` into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
11. Run `npm run dev`.
12. Sign in with one of the demo accounts above.

If the app still shows old environment values, clear the build cache and restart:

```bash
rm -rf .next
npm run dev
```

## Daily Workflow

1. Start local Supabase with `npm run supabase:start`.
2. Make schema changes locally.
3. Add or edit SQL migrations under `supabase/migrations/`.
4. Rebuild from scratch with `npm run supabase:reset`.
5. Upload local demo media with `npm run seed:local-media` after any reset that needs repo-tracked avatars or listing photos.
6. Run `npm run dev`.
7. Test the flow locally.
8. Commit app and migration changes together.

Use local Studio, `psql`, or the hosted dashboard for browsing rows. Use the CLI for schema lifecycle.

## How to Merge the Current Rollout Changes

Right now the changes are only in your working tree on `main`. The safe path is:

1. Create a feature branch from the current state.
2. Stage only the Supabase local-first rollout files.
3. Commit them together.
4. Push the feature branch.
5. Open a PR into `main`.
6. Enable the required `Supabase Preview` check once it appears on the PR.

Suggested branch name:

```bash
git switch -c your-handle/supabase-local-first
```

Then review what is staged before committing:

```bash
git status
git diff --cached
```

This keeps `main` clean and makes the rollout easy to review.
