# Dual-hosting peels.org

Peels serves the same production app from both `https://www.peels.app` and
`https://www.peels.org`. There is no redirect between those domains during the
dual-hosting phase. Apex `peels.org` is not an app origin; if used, it should
redirect to `https://www.peels.org`.

The canonical SEO origin is now `https://www.peels.org`. Both hosts still serve
the app with no redirect between them. A much later step can redirect `.app` to
`.org`.

## Current state

Done:

- The temporary `peels-org` Cloudflare Pages app has been removed.
- `www.peels.org` has been added to the main Vercel app.
- Cloudflare allow-lists for MapTiler, Turnstile, and Protomaps include
  `.org`.
- Supabase auth redirects allow `https://www.peels.org/**`.
- Auth, listings, images, maps, and messaging have been manually verified on
  `.org`.
- App and Edge Function redirect helpers allow only `https://www.peels.app` and
  `https://www.peels.org`.
- Supabase Edge Function email sending uses one configured sender:
  `GENERAL_EMAIL_ADDRESS`.
- `siteConfig.url` is `https://www.peels.org`.
- Supabase Auth Site URL is `https://www.peels.org`.
- Both hosts emit `.org` canonical URLs, sitemap URLs, and robots sitemap
  references.
- `https://www.peels.org/sitemap.xml` submitted in Search Console (180 pages).
- `PEELS_PUBLIC_SITE_URL` is `https://www.peels.org`.
- Transactional email links (chat, newsletter, feature) use `.org`.
- Share-page copy examples use `peels.org`.

Still intentional:

- Keep `GENERAL_EMAIL_ADDRESS` on the currently verified `@peels.app` sender
  until the Resend cutover below.
- Do not redirect `peels.app` to `peels.org` yet.
- Do not add a global `noindex` rule to `.org`.

## Next steps

Work through these in order. None of them block the others except the Resend
cutover, which should wait until `@peels.org` has basic domain reputation and
DNS is planned for both personal mail and Resend.

### 1. Monitor SEO (now — a few weeks)

- Watch the **`.org`** Search Console property: indexed pages, impressions, and
  coverage on `.org` URLs.
- Keep the **`.app`** property for reference; indexed `.app` URLs should decline
  over time as Google respects the `.org` canonical tags. No Change of Address
  or URL-removal action is needed yet.
- Do not submit a separate `.app` sitemap; both hosts already advertise the
  `.org` sitemap in `robots.txt`.

### 2. Warm up `@peels.org` as a mail domain (now — parallel)

Goal: build legitimate sending history on `peels.org` before moving
high-volume transactional mail from Resend.

**Do now**

- Add a **DMARC monitor** record for `peels.org` at `p=none`, with an `rua`
  reporting address you keep private (do not commit real mailbox addresses to
  the repo).
- Host **`@peels.org` on iCloud Mail** (or similar) for low-volume personal /
  manual mail — partner replies, support, one-to-one outreach. This is a good
  way to start real, human sending on the domain.
- Use **`@peels.org` in new signatures and partner comms** so outbound human mail
  consistently comes from the new domain.
- Plan **inbound aliases** early if useful: mirror each `@peels.app` mailbox
  to the matching `@peels.org` address using your mail host’s forwarding
  settings (use the same local parts you already use; keep addresses out of
  public docs).

**Keep in mind**

- **Do not** send app transactional volume (auth, chat, newsletter) through
  iCloud. That stays on Resend `@peels.app` until cutover.
- Before verifying **`peels.org` in Resend**, plan DNS so **SPF can authorise
  both** iCloud and Resend in one record, for example  
  `v=spf1 include:icloud.com include:amazonses.com -all` (use Resend’s exact
  include when they provide it). Do not add Resend DKIM until you are ready to
  cut over; DKIM is per provider.
- Warm-up is **low and slow**: real recipients, replies welcome, no bulk blasts
  from the new domain before Resend cutover.

### 3. Resend cutover to `@peels.org` (when ready — not urgent)

Do this after a few weeks of monitoring and some human `@peels.org` mail, when
you are ready to change the From address users see on automated emails.

**Resend / DNS**

1. Verify `peels.org` as a sending domain in Resend.
2. Add only the **SPF and DKIM** records Resend provides (merge SPF with iCloud
   as above).
3. Keep DMARC at **`p=none`** until test sends pass; tighten gradually if
   wanted.

**App / Supabase**

1. Change `GENERAL_EMAIL_ADDRESS` to the chosen `@peels.org` address (Supabase
   Edge Function secret).
2. Update `encodedEmail` in [`src/config/site.ts`](../src/config/site.ts).
3. Redeploy email Edge Functions:
   - `send-email-for-auth-action`
   - `send-email-for-new-chat-message`
   - `send-email-for-new-feature`
   - `send-email-for-newsletter-issue-supabase-users`
   - `send-email-for-newsletter-issue-resend-audience`
4. Smoke-test every email type: sign-up, sign-in, password reset, email change,
   chat notification, newsletter, feature announcement.
5. Stop using the `peels.app` Resend sending domain once satisfied.
6. Keep `@peels.app` **inbound forwarding** for stale threads if needed.

**Code tidy-up after cutover**

- Search for remaining `.app` references:  
  `rg "peels\\.app|Peels\\.app|encodedEmail" src supabase docs`

### 4. Partner and public links (gradual — low urgency)

- Use `https://www.peels.org/...` in everything Peels publishes going forward.
- Optionally ask high-value partners (councils, orgs on the Partners page) to
  update links when convenient. Old `.app` links still work; canonical tags
  and a future redirect handle SEO. Partner updates mainly help **humans** who
  copy URLs from council pages.

### 5. Redirect `.app` → `.org` (later)

Do this only after `.org` has been canonical for a while and you no longer need
`.app` to serve the app directly. See [Redirecting peels.app later](#redirecting-peelsapp-later).

After redirects are live:

- Use **Change of Address** in Search Console (`.app` → `.org` property).
- Remove `.app` from app origin allow-lists and Supabase redirect URLs once old
  auth links and cached emails are no longer relevant.

## Why the code changes matter

The live app can work on `.org` because much of the browser app uses the
current request origin and Supabase sessions are host-specific. The code still
needs to make dual-hosting explicit:

- `src/config/appOrigins.ts` allow-lists the only supported app origins for
  safe redirects.
- `supabase/functions/_shared/app-origin.ts` gives Edge Functions the same
  allow-list.
- Supabase auth email link construction accepts both Peels origins while
  rejecting arbitrary external origins.
- Redirect normalisation always returns path-only redirects and rejects
  scheme-relative `//...` paths.
- The obsolete static `peels-org` app is removed from the repo.

## SEO during dual-hosting

No extra `<meta name="robots" content="index, follow">` tag is needed for
normal pages. Search engines treat pages as indexable and followable by default
unless a page says otherwise. The app only emits `noindex, follow` metadata for
explicitly non-indexable surfaces.

Canonical URLs are emitted through Next.js metadata as `<link rel="canonical"
...>`, not as a `meta` tag. Both domains now emit `.org` canonical URLs because
`siteConfig.url` is `https://www.peels.org`.

The current SEO shape is:

- `.app` and `.org` both render the app.
- `.org` is canonical in page metadata, sitemap, robots sitemap URL, JSON-LD,
  Open Graph URLs, and RSS.
- `.app` still serves the app and emits the same `.org` canonical metadata.

## Supabase during dual-hosting

No SQL migration is needed for dual-hosting. Hosted Supabase Auth should have:

- Site URL: `https://www.peels.org`
- Redirect URLs:
  - `https://www.peels.app/**`
  - `https://www.peels.org/**`
  - local and Vercel preview URLs as needed

Broad wildcards are acceptable during this phase. For a tighter production
setup, exact auth callback URLs are:

- `https://www.peels.app/auth/complete`
- `https://www.peels.app/auth/confirm`
- `https://www.peels.org/auth/complete`
- `https://www.peels.org/auth/confirm`

Keep both `.app` and `.org` in the redirect allow-list while both domains can
serve auth flows.

## Email during dual-hosting

Use one verified sending domain at a time. During dual-hosting, users on both
web domains can receive email from the current `@peels.app` sender. The auth
link can still return them to the domain they used because `.org` is in the
auth redirect allow-list.

Do not invent DKIM for `peels.org`. DKIM is generated by the sending provider
for the exact domain being verified. If `peels.org` is not the active Resend
sending domain yet, there is no useful Resend DKIM record to add.

Useful preparation:

- Add or keep a low-impact DMARC monitor record for `peels.org` at `p=none`,
  with a private `rua` reporting address (not committed to the repo).
- Configure inbound forwarding or aliases so each `@peels.app` mailbox forwards
  to the matching `@peels.org` address, if inbound mail should move before
  outbound mail.

## Redirecting peels.app later

Do this only after `.org` has been canonical for a while and there is no need
for `.app` to keep serving the app directly.

Recommended shape:

- Redirect `https://www.peels.app/:path*` to
  `https://www.peels.org/:path*`.
- Redirect `https://peels.app/:path*` to
  `https://www.peels.org/:path*` if apex `.app` exists.
- Use permanent redirects only when the decision is final.
- Preserve the full path and query string, especially for listing URLs, UTM
  parameters, auth callback query parameters, and share links.
- Keep `.app` in Supabase redirect allow-lists until old auth links and cached
  emails are no longer relevant.
- Keep `.app` in app and Edge Function supported origins until no supported
  flow should accept a `.app` redirect target.

Verification after redirecting `.app`:

- `https://www.peels.app/listings/QE4QxdJ4y5YE?utm_source=test` redirects to
  `https://www.peels.org/listings/QE4QxdJ4y5YE?utm_source=test`.
- Auth callback URLs with query parameters survive the redirect.
- Search tools see `.app` URLs redirecting to matching `.org` URLs.
- No important route redirects to the homepage unless that was the original
  path.
- Session behaviour is understood: `.app` cookies do not become `.org` cookies,
  so users may need to sign in again on `.org`.

After the redirect has been stable, clean up:

- Remove `.app` as an app origin from redirect helpers.
- Remove `.app` auth redirect URLs from Supabase once old links are no longer
  needed.
- Remove stale `.app` references from docs, partner templates, and email copy.

## Current smoke-test checklist

Before merging or shortly after deployment, verify:

- `https://www.peels.org/listings/QE4QxdJ4y5YE` renders the same listing as
  `.app`.
- The same listing on `.org` emits a `.org` canonical link.
- Sign-up works from `.org`.
- Sign-in works from `.org`.
- Password reset and email confirmation return to `.org`.
- A signed-in `.org` user can send a chat message.
- Images, map tiles, Turnstile, and Protomaps load on `.org`.
- Vercel preview deployments still have working auth redirects.
- `https://peels.org` redirects to `https://www.peels.org` if apex is exposed.
- A URL with UTM parameters on `.org` records attribution as expected.
