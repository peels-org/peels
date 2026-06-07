# Dual-hosting peels.org

Peels now serves the same production app from both `https://www.peels.app` and
`https://www.peels.org`, without redirecting either domain to the other. Keep
`peels.app` as the canonical SEO origin until the later canonical migration.

The hosting work is already done:

- The temporary `peels-org` Cloudflare Pages app has been removed.
- `peels.org` and `www.peels.org` have been added to the main Vercel app.
- Cloudflare allow-lists for MapTiler, Turnstile, and Protomaps have been
  updated so the app works on `.org`.
- Auth, listings, images, maps, and messaging have been manually verified on
  `.org`.

## Why this PR still matters

The live app can already work on `.org` because the browser app mostly uses the
current request origin and Supabase sessions are stored per host. This PR is
still useful because it makes dual-hosting intentional and durable:

- It removes the obsolete static `peels-org` app from the repo.
- It documents the current production state and the remaining manual steps.
- It allow-lists `.org` in app redirect handling, instead of relying on
  incidental relative redirect behaviour.
- It makes Supabase auth email link construction accept both Peels origins
  while still rejecting arbitrary external origins.
- It consolidates Supabase email sending onto one configured sender address,
  matching the decision to avoid paying for multiple Resend sending domains.

## App behaviour

- Keep `siteConfig.url` set to `https://www.peels.app` so canonical links,
  sitemap URLs, robots sitemap references, JSON-LD, RSS, and social metadata
  stay on `.app`.
- `src/config/appOrigins.ts` lists the allowed app origins for auth-safe
  redirects: `https://www.peels.app`, `https://peels.org`, and
  `https://www.peels.org`.
- Supabase auth email links accept only those origins. Unknown origins fall
  back to `https://www.peels.app`.
- Edge email templates use `PEELS_PUBLIC_SITE_URL` for app links. Leave it set
  to `https://www.peels.app` during this phase. When `.org` becomes canonical,
  switch it once to `https://www.peels.org`.
- All Edge Function email sending uses `GENERAL_EMAIL_ADDRESS`. Do not keep
  separate Resend sender domains for transactional, newsletter, or personal
  reply flows.

## SEO during dual-hosting

No extra `<meta name="robots" content="index, follow">` tag is needed for
normal pages. Search engines treat pages as indexable and followable by default
unless a page says otherwise. The app only emits `noindex, follow` metadata for
explicitly non-indexable surfaces.

Canonical URLs are emitted through Next.js metadata as `<link rel="canonical"
...>`, not as a `meta` tag. During this phase, those canonical links should
continue to point at `.app` because `siteConfig.url` remains
`https://www.peels.app`.

For now, this is the intended SEO shape:

- `.app` and `.org` both render the app.
- `.app` remains the canonical origin in page metadata, sitemap, robots sitemap
  URL, JSON-LD, RSS, Open Graph URLs, and newsletter content.
- `.org` can build browser trust, partner familiarity, and allow-list history
  without asking search engines to treat it as the primary origin yet.

Do not add a global `noindex` rule to `.org`. That would prevent `.org` from
building useful search and reputation signals during the dual-hosting phase.

## Hosted setup status

Done:

1. `www.peels.org` has been added to the main Vercel app.
2. Apex `peels.org` has been added to the main Vercel app.
3. The temporary `peels-org` Cloudflare Pages deployment has been removed.
4. MapTiler, Turnstile, and Protomaps have been updated to allow `.org`.

Still intentional:

1. Do not redirect `peels.app` to `peels.org` in this phase.
2. Keep `siteConfig.url` on `https://www.peels.app` until the canonical
   migration phase.
3. Keep partner links to `.app` in place, but new partner outreach can mention
   `.org` as an additional working URL.

## Supabase auth checklist

No SQL migration is needed for dual-hosting. In hosted Supabase Auth URL
Configuration:

1. Keep Site URL as `https://www.peels.app`.
2. Add these exact redirect URLs:
   - `https://www.peels.app/auth/complete`
   - `https://www.peels.app/auth/confirm`
   - `https://www.peels.org/auth/complete`
   - `https://www.peels.org/auth/confirm`
3. Redeploy `send-email-for-auth-action` after changing Edge Function code.

Exact production redirect URLs are preferred over broad wildcards.

The app may appear to work before these Supabase settings are changed because
some auth flows use same-origin relative redirects or already-permitted URLs.
Still add the exact `.org` URLs before treating the setup as complete,
especially for email confirmation, password reset, magic-link, and future auth
template changes.

## Email setup checklist

Use one verified sending domain at a time. During the dual-hosting phase, keep
`GENERAL_EMAIL_ADDRESS` on the currently verified `@peels.app` sender. Users on
both `peels.app` and `peels.org` can receive email from that one sender; the
auth link itself can still return them to the domain they used because `.org`
is in the auth redirect allow-list.

Nothing must be added to `peels.org` DNS for outbound email right now. In
particular, do not invent a DKIM record: DKIM is generated by the sending
provider for the exact domain being verified. If `peels.org` is not the active
Resend sending domain yet, there is no useful Resend DKIM record to add.

Optional preparation:

1. Add a low-impact DMARC monitor record for `peels.org`:
   `_dmarc.peels.org TXT "v=DMARC1; p=none"`.
2. Configure inbound forwarding or aliases so `local-part@peels.app` forwards
   to `local-part@peels.org`, if inbound mail should move before outbound mail.

At the clean email cutover:

1. Remove or stop using the `peels.app` sending domain in Resend.
2. Verify `peels.org` as the single Resend sending domain.
3. Add only the SPF and DKIM records Resend gives for `peels.org`.
4. Keep or tighten DMARC after successful test sends.
5. Change `GENERAL_EMAIL_ADDRESS` to the chosen `@peels.org` address.
6. Change `PEELS_PUBLIC_SITE_URL` to `https://www.peels.org` if email links
   should also move to `.org`.
7. Redeploy the Supabase email Edge Functions after changing secrets.

## Verification

- `https://www.peels.org/listings/QE4QxdJ4y5YE` renders the same listing as
  `.app`.
- Auth flows work from both domains: sign-up, sign-in, password reset, and
  email change.
- `.org` pages emit canonical URLs pointing to `.app`.
- UTM query parameters are captured on whichever domain receives the first
  visit.

Already manually verified:

- Existing accounts can sign in on `.org`.
- New accounts can sign up on `.org`.
- A browser can be signed in to one account on `.org` and another on `.app`;
  this is expected because sessions are host-specific.
- Images, messages, listings, maps, and app data load on `.org`.
