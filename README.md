# Peels

[Peels](https://www.peels.org) connects folks with food scraps to those who compost. It’s a free, non-commercial, community project.

Peels is built on top of Next.js and Supabase. The code is [open source](#forking-peels) and could be used as a starting point for your own circular economy projects.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/peels-org/peels.git
cd peels

# Install dependencies
npm install

# Copy environment file (then add API keys)
cp .env.example .env.local

# Start development server
npm run dev

# Go to http://localhost:3000
```

> **Note**: You'll need some API keys for full functionality. See [Required Services](#required-services) below.

## Prerequisites

### Core Requirements

| Requirement  | Version               |
| ------------ | --------------------- |
| Node.js      | 18+ (LTS recommended) |
| npm/yarn     | Latest stable         |
| Git          | Latest stable         |
| Docker       | Latest stable         |
| Supabase CLI | Latest stable         |

Deno is also required if you plan to work on Supabase edge functions.

### Required Services

You’ll need to populate the environment variables with keys from following services:

- [Supabase](https://supabase.com): Database and authentication
- [MapTiler](https://maptiler.com): Geocoding
- [Protomaps](https://protomaps.com): Map tiles

See [Contributing](#environment-variables) if you need access to shared development keys.

## Project Structure

```text
peels/
├── src/                   # Source code
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions and shared logic
│   └── proxy.ts           # Next.js proxy for auth-aware routing
├── public/                # Static assets
├── supabase/              # Supabase configurations and migrations
└── package.json           # Project dependencies and scripts
```

## Contributing to Peels

Thank you for contributing! Please read our [Code of Conduct](https://github.com/peels-org/peels/blob/main/.github/CODE_OF_CONDUCT.md) and [contributing guidelines](https://github.com/peels-org/peels/contribute) before you start.

Check out the list of [issues](https://github.com/peels-org/peels/issues) you could help out on, [discussions](https://github.com/peels-org/peels/discussions) about future improvements, and our [Wiki](https://peels.notion.site/207b37e1678f80259217f54cd9d1f637) for information on how things are set up.

For minor improvements, feel free to just go ahead and create a pull request. For major changes, please [open an issue](https://github.com/peels-org/peels/issues) first to discuss what you would like to change.

### Environment Variables

Personal keys for [MapTiler](https://www.maptiler.com/cloud/) and [Protomaps](https://protomaps.com/account) will work just fine for local development.

For local-first Supabase development:

1. Copy `.env.example` to `.env.local`
2. Run `npm run supabase:start`
3. Run `npm run supabase:env`
4. Make sure `.env.local` contains the local URL `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
5. Copy the local `ANON_KEY` value into `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
6. Copy the local `SERVICE_ROLE_KEY` value into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

The repo defaults `NEXT_PUBLIC_SUPABASE_URL` to `http://127.0.0.1:54331` so local development does not need to point at the hosted Peels project. If you already had a `.env.local` from hosted development, update that value manually because copying `.env.example` later may not overwrite your existing file.
Peels intentionally uses the `54331`-`54334` local port range so it can run alongside other Supabase projects that still use the CLI defaults.

If you need to serve [Supabase edge functions](https://github.com/peels-org/peels/blob/main/supabase/functions) locally, copy `supabase/.env.example` to `supabase/.env` and add only the secrets you actually need. Production secrets should remain dashboard-managed for now.

For the fuller operational walkthrough, including GitHub/Vercel dashboard setup and fresh-computer bootstrap, see [docs/supabase-local-first.md](./docs/supabase-local-first.md).

For how auth/session forwarding, public-page performance, footer locale state, unread chat dots, and deferred homepage demos fit together, see [docs/auth-session-architecture.md](./docs/auth-session-architecture.md).

### Usage

1. Clone and set up codebase:

   ```bash
   git clone https://github.com/peels-org/peels.git
   cd peels
   npm install
   ```

2. Populate environment variables:
   - Copy `.env.example` to `.env.local`
   - Start local Supabase with `npm run supabase:start`
   - Run `npm run supabase:env`
   - Confirm `.env.local` uses `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
   - Copy the local `ANON_KEY` into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the local `SERVICE_ROLE_KEY` into `SUPABASE_SERVICE_ROLE_KEY`

3. Start development:

   ```bash
   npm run supabase:start
   npm run dev
   ```

### Supabase Local-First Workflow

Use the Supabase CLI as the default path for schema work:

```bash
# Start the local backend
npm run supabase:start

# See local connection details
npm run supabase:env

# Rebuild the local database from migrations + seed
npm run supabase:reset
```

For day-to-day development:

1. Make schema or policy changes locally
2. Capture them in SQL migrations under `supabase/migrations/`
3. Replay everything with `npm run supabase:reset`
4. Smoke-test the app with `npm run dev`
5. Commit code and migration files together

Use local Studio, `psql`, or the hosted Supabase dashboard for browsing rows and running ad hoc queries. Use the CLI for schema lifecycle, not as the main data browser.

### Supabase Buckets and Seed Data

- Bucket configuration lives in `supabase/config.toml`
- Local reset data lives in `supabase/seed.sql`
- Local demo bucket objects live in `supabase/storage/`
- Local bucket policies are backfilled via SQL migrations so local uploads behave like the hosted project
- `npm run supabase:reset` rebuilds the local database schema and data
- `npm run seed:local-media` uploads local demo media into local Supabase buckets

The demo media under `supabase/storage/` is for local development only. Hosted Supabase branches and production should not sync bucket objects from Git.

Keep all local and preview data sanitized. Do not export or commit production data.

### One-Time Production Bootstrap for Maintainers

Peels already had schema history in the hosted project before migrations were committed to Git. If you need to re-bootstrap the repo from production, use this order:

```bash
supabase login
supabase link --project-ref mfnaqdyunuafbwukbbyr
supabase migration fetch
supabase db dump --schema public --file supabase/migrations/20251026060000_baseline_schema.sql
supabase migration repair 20251026060000 --status applied --linked
```

The important bit is that the baseline migration must exist in Git before the first fetched remote migration, and the hosted project must be marked as already having that baseline. That keeps local resets reproducible without asking production to replay the whole schema.

If you have custom `auth` or `storage` schema objects beyond the defaults, audit and pull those explicitly after the public baseline:

```bash
supabase db pull auth_schema --schema auth
supabase db pull storage_schema --schema storage
```

Do not use the Supabase dashboard for routine schema changes once a migration exists in Git. If an emergency dashboard hotfix is unavoidable, pull it back into the repo immediately before making the next change.

### Supabase Branching

One-time manual setup in Supabase/GitHub should be:

1. Enable the Supabase GitHub integration for this repo
2. Set the scope to `supabase/**`
3. Turn on `Automatic branching`
4. Turn on `Supabase changes only`
5. Keep `main` as the production branch
6. Require the `Supabase Preview` check before merge

The repo also includes a GitHub Actions workflow that replays the local Supabase setup on PRs touching `supabase/**`.

If Peels preview deployments run on Vercel, make sure the preview environment uses the branch-specific `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values that Supabase provides for each preview branch instead of production credentials.

### Outside-the-Repo Setup

Some setup still lives in web dashboards because Git cannot store everything:

1. In the Supabase dashboard, connect the GitHub repo and turn on preview branches for changes under `supabase/**`
2. In GitHub branch protection, require the `Supabase Preview` check before merge
3. In Vercel project settings, set preview environment variables to the Supabase branch credentials instead of the production project credentials

In plain English: the repo now tells Supabase and the app how to behave, but Supabase, GitHub, and Vercel still each need one “please use preview mode for PRs” switch turned on in their own settings pages.

You might need to clear out and restart your Next.js development server in the case that you add environment variables after the above steps. Here’s how to do that:

```bash
rm -rf .next
npm run dev
```

### Development Guidelines

- We use Next Yak for component-level styling
- We’re slowly moving towards TypeScript for type safety
- Heavy commenting is encouraged to make the codebase accessible to others
- Code formatting is handled by Prettier. Please ensure your code is formatted according to `.prettierrc` before submitting a pull request

### Languages and Localised Content

Peels now keeps its product translations fully in-repo with `next-intl`. English lives in `messages/en.json` and is the source catalogue. Whenever you add or change user-facing UI copy, update `en` first and keep `es` and `de` complete alongside it. `fr` and `pt-BR` are also supported locales and should be updated when the change affects translated surfaces that already exist.

For app UI and metadata:

- Put translatable UI copy in `messages/*.json`
- Run `npm run i18n:check` after editing message files
- Run `npm run check` before handing work back
- Do not put internal enum values, route constants, analytics identifiers, or user-generated content into message files

For newsletter issues:

- The English source issue lives at `src/content/newsletter/<slug>.mdx`
- Locale-specific issue wrappers or translations live at `src/content/newsletter/<locale>/<slug>.mdx`
- A locale-specific issue file can either contain a full translation or a lighter wrapper with translated metadata plus an explicit fallback notice before the English body
- `metadata` and `customMetadata` still need to be present for each locale-specific issue file so the newsletter index, issue page, and RSS feed can show the correct localised title and description
- RSS is generated from `/newsletter/feed.xml?locale=<locale>`, so locale-specific metadata will flow through to the feed automatically

For legal and reference pages:

- The English source page lives at `src/content/legal/<slug>.mdx`
- Locale-specific versions live at `src/content/legal/<locale>/<slug>.mdx`
- Legal translations should be treated as reviewed content, not casual copy changes
- If a locale-specific file does not exist yet, Peels falls back to English and shows a translation notice on the page

For newsletter issue emails:

- The current issue email config lives in `supabase/functions/_shared/newsletter.ts`
- When sending a new issue, update the current issue slug, issue number, and per-locale title/description there
- The transactional/broadcast email body is now a locale-aware issue announcement in `supabase/functions/_templates/newsletter-issue-email.tsx`, which links people to the web version of the issue
- Signed-in members receive the newsletter email in their saved locale where available, with auth metadata and English fallback covering older environments
- External broadcast audiences can be split by locale with `NEWSLETTER_AUDIENCE_ID_EN`, `NEWSLETTER_AUDIENCE_ID_ES`, `NEWSLETTER_AUDIENCE_ID_DE`, `NEWSLETTER_AUDIENCE_ID_PT_BR`, and `NEWSLETTER_AUDIENCE_ID_FR`
- If only the English Resend audience is configured, only the English broadcast will send

In plain English: new UI strings belong in `messages/`, longform newsletter and legal content belongs in locale-aware MDX files under `src/content/`, and newsletter emails need the current issue config updated in `supabase/functions/_shared/newsletter.ts` before sending.

### Testing

Peels keeps testing intentionally small:

- `npm run check` for i18n and formatting checks
- `npm run build` for the production build
- `npm run test:e2e` for the local headless Playwright smoke suite
- `npm run test:e2e:prod` for the production-like Playwright smoke suite

The smoke suite covers seeded sign-in, public listing, profile, and chat flows against local Supabase data. It is designed to stay small and high-signal rather than grow into a broad frontend testing matrix.

Before `npm run test:e2e` or `npm run test:e2e:prod`, make sure you are using the local seeded app stack, not hosted Supabase:

- Run `npm run supabase:start`
- Run `npm run supabase:reset`
- Run `npm run seed:local-media`
- Run `npm run supabase:env`
- Make sure `.env.local` uses `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
- Copy the local `ANON_KEY` into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy the local `SERVICE_ROLE_KEY` into `SUPABASE_SERVICE_ROLE_KEY`

If your `.env.local` was previously set up for the hosted Peels project, update it before running Playwright. A working local test setup looks like:

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste the ANON_KEY from npm run supabase:env>
SUPABASE_SERVICE_ROLE_KEY=<paste the SERVICE_ROLE_KEY from npm run supabase:env>
```

Then run either:

```bash
npm run test:e2e
```

or:

```bash
npm run test:e2e:prod
```

Use the local anon key that matches the running local Supabase stack. Do not mix the hosted project URL with the local anon key, or the local URL with a hosted anon key.

By default, Playwright starts its own app server on `127.0.0.1:3001`, so it does not collide with the usual local `next dev` server on port `3000`. Set `PLAYWRIGHT_PORT` if you need a different port.

In CI, pull requests run `npm run check` and `npm run build`. Pushes to `main` also run the production-like Playwright smoke suite.

For the first local Playwright run, install the browser once with:

```bash
npx playwright install chromium
```

Map changes are still a manual smoke-check area. When you touch `/map`, verify that the page loads, listing selection still works, search still works, and nothing obviously breaks in the browser.

### Getting Help

- Check existing [issues](https://github.com/peels-org/peels/issues) for known problems
- Create a [new issue](https://github.com/peels-org/peels/issues/new) if you find a bug or have a feature request
- Join our [discussion board](https://github.com/peels-org/peels/discussions) for anything else

## Forking Peels

Please review our [License](#license) before you fork and built upon Peels for your own purposes.

Peels is designed to facilitate the sharing and repurposing of resources at a local community level. It’s therefore best suited as a foundation for similar circular economy projects. For example, you could use it to help kickstart a creative materials exchange platform or tool sharing platform. Let us know what you build!

### License

This project is licensed under the GNU General Public License version 3 (GPLv3). See the [LICENSE](LICENSE) file for details.

In short: you can use Peels as a base for your own projects but only if you share-alike. That means you must license whatever you make under the same GLPv3 license and make the source code similarly available as we do with Peels.

Check out the [Next.js and Supabase Starter Kit](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs) if your project doesn’t fit our license requirements.

### Setup

1. Fork and clone:

   ```bash
   git clone https://github.com/your-username/your-fork.git
   cd your-fork
   npm install
   ```

2. Set up your environment:
   - Follow the services setup in [Prerequisites](#prerequisites)
   - Copy `.env.example` to `.env.local`
   - Add your API keys to `.env.local`

3. Initialize and run:

   ```bash
   npm run supabase:start
   npm run supabase:reset
   npm run dev
   ```

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication and database by [Supabase](https://supabase.com)
- Translations powered by [next-intl](https://next-intl.dev/) with in-repo message catalogues under `messages/`
- Maps powered by [MapTiler](https://www.maptiler.com) and [Protomaps](https://protomaps.com)
- Styled components built with [Next Yak](https://yak.js.org)

See the [Colophon](https://www.peels.org/colophon) and [Wiki](https://peels.notion.site/207b37e1678f80259217f54cd9d1f637) for more.
