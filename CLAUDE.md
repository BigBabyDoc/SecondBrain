# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

«Второй мозг педиатра» — a subscription site of medical notes for doctors. Some notes are free, the
rest are behind a paywall. All user-facing copy is in Russian; keep it that way when adding UI.

Stack: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4, Prisma 7 + PostgreSQL,
NextAuth v5 (credentials), YooKassa (ЮKassa) payments, nodemailer (SMTP), Sentry.

A separate Java backend (`~/IdeaProjects/second-brain-backend`) serves the iOS app and duplicates
much of this repo's auth and billing logic. Merging them is deliberately deferred — see
"Relationship to the Java backend" below before "unifying" anything.

## Commands

```bash
npm install
npm run dev            # next dev on :3000
npm run build
npm run lint           # eslint (flat config, eslint-config-next)
npm test               # vitest run (unit tests for pure logic in lib/)
npm run test:watch
npx tsc --noEmit       # type check — there is no npm script for this

npx prisma generate                    # REQUIRED before build/dev on a fresh clone
npx prisma migrate dev --name <name>   # create + apply a migration locally
npx prisma migrate deploy              # apply migrations (prod)
npx prisma db seed                     # runs prisma/seed.ts via tsx; prints demo admin/doctor creds
```

Tests cover pure functions only (`lib/access`, `lib/tokens`, `lib/rate-limit`, `lib/slugify`) — there
are no integration tests, so anything touching Prisma or NextAuth is verified by running the app.

Copy `.env.example` to `.env` (`.env*` is gitignored). Beyond the database, auth and YooKassa keys it
also carries `SMTP_*` / `MAIL_FROM` (unset ⇒ emails are printed to the server console instead of
being sent), `CRON_SECRET` for the subscription job, `S3_*` for media storage (unset ⇒ files go to a
local directory instead of the cloud), and optional Sentry DSNs. Seed overrides (`SEED_ADMIN_EMAIL`
and friends) are read by `prisma/seed.ts` only.

## Version-specific conventions (differ from older Next/Prisma)

- **`proxy.ts`, not `middleware.ts`** — Next 16 renamed it. Route protection for `/admin` (ADMIN
  role) and `/account` (logged in) lives there.
- **Prisma client is generated into `app/generated/prisma`** (gitignored) and imported as
  `@/app/generated/prisma/client` — never from `@prisma/client`. Nothing works until
  `prisma generate` has run.
- **Prisma 7 config lives in `prisma.config.ts`**, not in `package.json` or the schema: it supplies
  the datasource URL and the seed command. `schema.prisma`'s `datasource` block has no `url`.
- **Driver adapter**: `lib/prisma.ts` builds the client with `PrismaPg` over `DATABASE_URL`, cached
  on `globalThis` outside production. `prisma/seed.ts` constructs its own client the same way.
- **Tailwind v4 is CSS-first** — no `tailwind.config.*`. The palette and fonts are declared in
  `app/globals.css` via `@theme inline` (`brand-blue`, `brand-green`, `background-elevated`,
  `muted`, `border`). Use those token names rather than hard-coded colors; the design is dark-only.

## Architecture

**Access control is tier-based and centralized in `lib/access.ts`.** `TIER_ORDER = ["FREE","PAID"]`
— access is an index comparison (`hasTierAccess`), so the array order is load-bearing if a tier is
ever added. Prices, labels, descriptions, and `PLAN_DURATION_DAYS` per `BillingPeriod`
(`MONTHLY`/`YEARLY`) all live here; pricing pages, the account page, YooKassa payment creation, and
the webhook's period-end calculation all read from it. Change a price or duration in one place only.

Note that `Tier` is what a *note requires* and what a *subscription grants*; `BillingPeriod` is only
how long the PAID tier was bought for. Both enums are mirrored in `prisma/schema.prisma`.

**The catalog is public and indexed.** `/notes` and note pages render for anonymous visitors (the
paywall replaces locked content), and `app/sitemap.ts` lists every published note — it is
`force-dynamic` so notes added through the admin appear without a rebuild. Don't put the catalog
behind a login; it is the acquisition funnel. Note bodies are Markdown, rendered by
`components/markdown.tsx` (react-markdown + remark-gfm).

**Paywall is enforced server-side.** `app/notes/[slug]/page.tsx` is a server component that loads the
note plus the viewer's subscription and only renders `note.content` when `hasTierAccess` passes —
locked content is never sent to the client. Keep it that way; don't move gating into a client
component.

**Auth.** `auth.ts` exports `{ handlers, signIn, signOut, auth }` from NextAuth v5 with a Credentials
provider (bcrypt against `User.passwordHash`) and JWT sessions. `id` and `role` are copied into the
token in the `jwt` callback and back out in `session`; `types/next-auth.d.ts` augments the Session /
User / JWT types so `session.user.role` is typed. Registration (`lib/actions/auth.ts`) creates the
user *and* a FREE `Subscription` in one call, then signs in.

Emails are never blocking: `lib/mail.ts` swallows SMTP errors and falls back to console output when
`SMTP_*` is unset, so a broken mailbox cannot break registration or payment — but a failure is
reported to Sentry and returned as a `MailResult`, because silently losing verification emails would
otherwise only surface through user complaints. Production sends through the corporate Mail.ru
mailbox, which requires an app password rather than the account password; `npm run mail:check`
verifies credentials (and optionally sends a test message) without registering a user. The transport
is pooled and rate-limited on purpose — providers treat bursts and frequent reconnects as spam
signals. Tokens
(`lib/tokens.ts`) are random 32 bytes; **only their SHA-256 hash is stored** and comparison is
constant-time. Email verification arrives as a *link* handled by `app/verify-email/route.ts` — a
route handler, not a page, because a page render can repeat (prefetch, retry) and burn the token.

**Login rate limiting** (`lib/rate-limit.ts`) counts failures in the database, not in process memory:
on serverless hosting each instance has its own memory and an in-memory counter would not stop a
brute force. The limit is enforced in two places — `auth.ts` refuses to even check the password, and
`loginAction` reports the remaining minutes to the user.

**Mutations are server actions in `lib/actions/`**, validated with zod, form-state shaped
(`(prevState, formData) => State`) for `useActionState` in the matching `components/*-form.tsx`.
Admin actions call the local `requireAdmin()` guard in `lib/actions/notes.ts` — `proxy.ts` protects
the *pages*, but actions are separately reachable and must re-check the role themselves.

**Payment flow (YooKassa):**

1. `createPaymentAction` (`lib/actions/payment.ts`) requires a **verified** email — the fiscal receipt
   is sent to that address — then creates a YooKassa payment with a `receipt` block. The receipt is
   what makes the payment legal for a self-employed (НПД) merchant via «Мой налог»; never drop it,
   including on renewals. `save_payment_method` mirrors an **opt-in checkbox**, unchecked by default:
   §8.1.2 of the offer requires that paying without binding a card stay possible, so the flag also
   travels in `metadata.autoRenew` and an `AUTO_RENEWAL` consent row is written. A PENDING `Payment`
   row keyed by `yookassaPaymentId` is written before redirecting to the confirmation URL.
2. `app/api/webhooks/yookassa/route.ts` **never trusts the webhook body** — YooKassa does not sign
   requests, so it takes only the payment id and re-fetches the payment via the API with the secret
   key. On `succeeded` it runs a transaction: mark the `Payment` SUCCEEDED and upsert the
   `Subscription` to PAID with `currentPeriodEnd` from `nextPeriodEnd()` and — only when the payment
   carried `autoRenew` — the saved `yookassaMethodId` and agreed `renewalAmount`, then emails a
   confirmation. It is idempotent (skips if already SUCCEEDED). Preserve both properties.
3. `POST /api/cron/subscriptions` (guarded by `CRON_SECRET`, called by the host's scheduler daily)
   runs four ordered steps: renewal notice → charge → expiry reminder → downgrade. The order matters:
   charging must happen before the subscription is expired.
4. **Automatic renewal is live** and implemented to §8 of the offer — that section is the spec, read
   it before changing anything here. `lib/renewal.ts` holds the shared rules: extend from the old
   `currentPeriodEnd` when it is still in the future (paying early must not burn remaining days), a
   **deterministic** idempotence key per (subscription, period end, attempt) so a crashed job cannot
   double-charge, at most 3 attempts, and a price-increase guard that pauses renewal instead of
   charging more than the user agreed to. `Subscription.autoRenew` — not `status` — is the single
   flag the job reads.
5. Cancelling (`lib/actions/subscription.ts`) is **one action** that turns off renewal, deletes
   `yookassaMethodId` and revokes the consent (§8.4.1–8.4.4 — the cancel path may not be harder than
   the opt-in). Access survives to the end of the paid period, because that period is already paid
   for. There is deliberately **no "resume" button**: the method is gone, and §8.4.4 requires a fresh
   consent, which is given at the next payment.
6. `AUTO_RENEWAL_ENABLED` in `lib/legal.ts` gates the whole feature. Turning it off hides the opt-in
   checkbox, stops charges, and re-adds the «раздел не применяется» notice to offer §8 — keep the
   flag and the code in step, so the contract never promises what the service does not do.

Webhook URL to configure in the YooKassa dashboard: `<NEXTAUTH_URL>/api/webhooks/yookassa`.

**Notes CRUD** (`/admin/notes`) slugifies the title (`lib/slugify.ts`, Cyrillic transliteration) and
suffixes a base36 timestamp on collision; slugs are not regenerated on update, so a renamed note
keeps its URL. Actions `revalidatePath` `/notes` and `/admin/notes` after writes. The editor
(`components/note-form.tsx`) toggles between editing and a Markdown preview; the textarea stays
mounted and merely hidden in preview mode, because unmounting it would drop `content` from the form.

**Admin pages re-check the role themselves.** `proxy.ts` protects `/admin`, but a server component is
also reachable through a direct RSC request, so `/admin/notes` and `/admin/payments` both call `auth()`
and `notFound()` on a non-admin. `/admin/payments` is the reconciliation view for «Мой налог»: revenue
per range from SUCCEEDED payments only, plus subscriber and auto-renewal counts.

**Locked notes still sell.** `app/notes/[slug]/page.tsx` computes headings for *every* note and, when
access fails, renders `components/note-preview.tsx` — section headings plus `leadParagraph()`, one
paragraph capped at `LEAD_MAX_CHARS`. `note.content` itself is still never sent to the client; keep it
that way when touching the preview.

**View counts** are incremented by the browser (`components/view-counter.tsx` → `POST
/api/notes/[slug]/view`), once per tab per note via `sessionStorage`. Counting during the server render
would inflate on prefetch, revalidation and crawlers. Sorted view in `/admin/notes?sort=views`.

**Metrika goals** (`lib/metrika.ts`) fire only when the counter exists — it loads solely after cookie
consent, so a missing `ym` is normal, not an error. `MetrikaGoal` dedupes via `localStorage`, keyed by
payment id for `payment_success` so a page refresh cannot invent a second sale.

**Media.** Uploads (`POST /api/admin/media`, admin only) are content-addressed: the storage key is
the sha256 of the bytes, so re-uploading the same file returns the existing object instead of a
duplicate. The type is decided by **sniffing the magic bytes**, never the client's content-type —
PNG, JPEG, WebP, GIF and PDF, up to 10 MB. `lib/storage.ts` picks its driver the same way
`lib/mail.ts` does: S3 (Yandex Object Storage) when `S3_BUCKET`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` are
set, otherwise a local directory (`MEDIA_LOCAL_DIR`, gitignored) so development needs no cloud.
`GET /api/media/[id]` streams the bytes itself rather than redirecting to a presigned URL — the note
body only ever stores `/api/media/<id>`, so moving from local disk to S3 does not rewrite links
inside existing notes. Objects never change, hence `Cache-Control: immutable`.

`components/markdown.tsx` deliberately forwards only the props each element needs instead of
spreading everything: react-markdown passes an AST `node` prop that leaks into the DOM as
`node="[object Object]"` if spread.

## Relationship to the Java backend

`~/IdeaProjects/second-brain-backend` (Spring Boot) powers the iOS app and independently implements
registration, email verification, password reset, login rate limiting, subscriptions, payments and
expiry — the same ground this repo covers, with different details on both sides (the fiscal receipt
and cancellation exist only here; renewal that extends the remaining period exists only there).

That duplication is **known and accepted for now**. The iOS app is not launching for at least six
months, its `apiBaseURL` still points at localhost, and the Java service has no deployment artifacts,
so merging would cost a user migration and a permanent VPS while removing no pain that is currently
felt. The web is the system heading to production; build here.

Two rules while the split lasts: put new account/billing work **in this repo only** (writing it in
both means reconciling three versions later), and when the merge does happen the Java service is
expected to become the owner of users and content, because the offline sync protocol, guideline
versioning, media storage and Russian FTS are impractical to reimplement here.
