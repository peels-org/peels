# AGENTS.md

These instructions apply to the whole repository.

## Language

- Use Australian/British English over US English.

## Git, commits, and pull requests

- Start commit and PR titles with a simple present tense lowercase actionable verb, such as `fix`,
  `update`, `add`, `remove`, or `improve`. Use title case only for proper
  nouns (Peels, Supabase, Vercel, and so on).
- Do not merge pull requests unless the human explicitly asks you to merge.
- When opening a pull request, follow
  [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
- Do not put harvestable email addresses in docs, commits, plans, or other public
  repo text. Reference env var names, `siteConfig.encodedEmail`, or generic
  `local-part@domain` placeholders instead.

## Frontend

- Prefer Server Components by default. Only add `"use client"` when the component needs browser-only APIs, state/effects, event handlers, or client-only libraries.
- When touching JS/JSX components, convert them to TS/TSX when it is reasonable and scoped to the change.
- Keep shared presentational components server-safe where possible. For translated labels or suffixes, prefer passing translated text from the caller instead of adding `useTranslations` to a shared component.
- For React form submit handlers, use the shared `FormSubmitEvent` / `FormSubmitHandler` types from `src/types/events.ts`, which wrap React 19's `SubmitEvent`. Avoid deprecated `FormEvent`, `FormEventHandler`, and `React.FormEvent`; keep `ChangeEvent` for input/select/textarea change handlers.
- In MDX prose, if an inline component inside a Markdown list item is formatted onto multiple lines and changes rendered spacing, use a targeted `{/* prettier-ignore */}` before that list rather than disabling formatting for the whole file.

## Auth, Sessions, and Public-Page Performance

- `src/proxy.ts` intentionally does not refresh Supabase auth on every request. Public pages should use `createSignedOutResponse()` so their initial response does not wait on `supabase.auth.getUser()`.
- Only add paths to `authRequiredPathPrefixes` when the first server response must know auth state, such as protected routes, auth callbacks, guest-only auth pages, or routes that server-render private/public data differently. `/map` and `/listings` belong there because they call server `auth.getUser()` before choosing listing data sources.
- Server components that branch on auth should treat `authStateHeaderName` as a forwarded proxy hint, not proof that public routes have performed a fresh auth lookup. Public pages are deliberately signed-out on the initial server render until client auth resolves.
- Keep auth-aware public UI in small client slots or enhancements, such as `AccountButton`, `FooterLocaleSlot`, and unread chat dots. It is acceptable for these to appear or update after first paint.
- Keep `UnreadMessagesProvider` scoped to tab-bar and chat layouts rather than the root layout. It should not make public HTML wait on Supabase, and its initial auth/unread check should remain idle or otherwise deferred.
- For signed-in preferred locale, public pages should use the locale cookie for the initial render. Profile-backed locale lookup belongs on authenticated/private flows.
- Chat route data shared by layout, metadata, and page should go through cached helpers in `src/features/chat/chatPageData.ts` to avoid duplicate Supabase work.
- For more detail, see `docs/auth-session-architecture.md`.

## Testing

- Add or update Playwright e2e coverage when changing important user flows such as auth, listings, locale switching, chat, or other multi-step interactions.
- Prefer resilient, locale-safe selectors in e2e tests. Use stable `data-testid` hooks for interactive controls when role-, text-, or structure-based selectors would be brittle across locales or UI refactors.
- When verifying end-to-end behaviour locally, prefer the production Playwright path (`npm run test:e2e:prod`) for app-flow confidence; dev-server runs are still useful, but can produce noise from HMR or other development-only behaviour.

## Internationalisation

- Put user-facing app UI copy in `next-intl` message files under `messages/`.
- Treat `messages/en.json` as the source catalogue. Keep Spanish (`es`) and German (`de`) complete whenever adding or changing message keys.
- Run `npm run i18n:check` after editing messages. Run `npm run check` before handing work back.
- Do not put dynamic user-generated content, internal enum values, table names, route constants, CSS strings, logs, or analytics identifiers into message files.
- For listing types and other enums, pass stable keys such as `business`, `community`, or `residential` and handle display grammar in translations, usually with ICU `select`.

## Supabase

- Treat `supabase/migrations/` as append-only once a migration has landed on any shared environment.
- Do not edit an existing historical migration to change live schema behaviour on staging or production. That only affects fresh or reset environments.
- When changing database schema, functions, views, policies, triggers, or grants, add a new forward migration instead.
- If a previous migration introduced the object you need to change, use a new migration with `create or replace`, `alter`, or the appropriate forward-only SQL rather than modifying the old file.
- If you are unsure whether a migration has already been applied anywhere shared, assume that it has and create a new migration.
