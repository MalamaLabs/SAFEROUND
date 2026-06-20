# SAFEROUND

Mālama Labs investor portal. A standalone Next.js app: a tiered, NDA-gated
data room for the Series Seed (SAFE round). Deploys on its own to
`investors.malamalabs.com`.

## What it is

A self-contained investor portal with three access tiers, designed to move
investors from cold to committed quickly while keeping an airtight record:

1. **Public landing** (`/investors`) — thesis + request-access form. No auth.
2. **Tier 1 (open)** — pitch deck, one-pager, interactive financials. Auto-granted
   on form submit; a unique secure link is emailed to the investor.
3. **Tier 2 (NDA-gated)** — full model + data room. Unlocked by a click-to-accept
   NDA recorded with timestamp, IP, browser, and NDA version in an append-only log.

Plus a founder **admin dashboard** (`/investors/admin`) showing every request,
NDA status, and view counts. The root (`/`) redirects to `/investors`.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript (strict)
- Upstash Redis (serverless, REST) for all records and the NDA audit log
- Mālama design system (Newsreader / Inter Tight / JetBrains Mono, lime on dark)
- Zero other runtime dependencies

## Quick start (local)

```bash
git clone https://github.com/MalamaLabs/SAFEROUND.git
cd SAFEROUND
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000 → redirects to /investors
```

## Environment variables

```
UPSTASH_REDIS_REST_URL=        # from upstash.com console
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=https://investors.malamalabs.com
INVESTOR_ADMIN_KEY=            # openssl rand -hex 24
INVESTOR_NOTIFY_TO=founders@malamalabs.com
MAIL_WEBHOOK_URL=             # your email sender endpoint
PRIVATE_DOC_BASE_URL=         # signed-URL blob store for gated files
```

## Deploy to investors.malamalabs.com

1. **Push to GitHub** (see below).
2. **Import on Vercel**: New Project → import `MalamaLabs/SAFEROUND`. Framework
   auto-detects as Next.js. No build settings needed (vercel.json handles it).
3. **Add env vars** in Vercel → Settings → Environment Variables (the list above).
4. **Create the Upstash DB**: upstash.com → create a Redis database → copy the
   REST URL and token into the env vars. (Or use the Vercel ↔ Upstash integration.)
5. **Add the domain**: Vercel → Settings → Domains → add `investors.malamalabs.com`.
   Vercel shows a CNAME target.
6. **Set DNS**: at your DNS provider, add a CNAME record:
   `investors` → `cname.vercel-dns.com` (Vercel will show the exact target).
   SSL provisions automatically.

## First push to GitHub

```bash
cd SAFEROUND
git init
git add -A
git commit -m "Initial commit — Mālama investor portal"
git branch -M main
git remote add origin https://github.com/MalamaLabs/SAFEROUND.git
git push -u origin main
```

A GitHub Action (`.github/workflows/ci.yml`) runs typecheck + build on every
push so a broken commit never reaches production.

## Document storage (critical for integrity)

Gated files must NOT live under `/public` — anything there is reachable by direct
URL with no auth. Put them in a private store and serve only through
`/api/investors/doc/[slug]`, which re-checks the token and tier on every request.

Recommended: **Vercel Blob (private)** or **S3 with signed URLs**. Set
`PRIVATE_DOC_BASE_URL` and the route redirects to a short-lived signed URL.
Map slugs → files in `app/api/investors/doc/[slug]/route.ts` (the `DOCS` table).
Until wired, the route returns a safe dev-mode note so nothing leaks.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | redirects to `/investors` |
| `/investors` | public | landing + request form |
| `/investors/access?token=` | token | Tier 1 docs + click-NDA modal |
| `/investors/room` | NDA | the data room |
| `/investors/admin?key=` | admin key | founder pipeline dashboard |
| `/api/investors/request` | public | form submit → grant Tier 1 + email |
| `/api/investors/nda` | token | record NDA acceptance |
| `/api/investors/verify` | token | check access state |
| `/api/investors/admin` | admin key | list investors |
| `/api/investors/doc/[slug]` | token + tier | serve gated documents |

## Round-close & integrity features

- **Auto-grant Tier 1, zero friction.** Investors see the pitch instantly.
- **Click-NDA with full audit trail.** Every acceptance records timestamp, IP,
  user agent, and NDA version to an append-only Redis log (`investor:nda-log`)
  that is never overwritten.
- **Versioned NDA text.** The exact text each investor agreed to is captured.
- **Per-document re-check.** Tier verified on every file open, not just at login.
- **Unique per-investor links + watermark.** The data room shows the viewer's
  name and firm on every screen, discouraging forwarding.
- **Email de-dupe.** Re-requesting returns the existing token, keeping the list clean.
- **Rate limiting.** 5 requests/hour/IP on the form.
- **Founder notifications.** Every request emails the founders so you follow up
  while interest is warm.
- **Security headers + no-store on gated routes** (next.config.js).
- **`noindex`** on the whole portal so it stays out of search.
- **Stage-honest disclaimers** inline on every tier.

## Legal flags (inline, per GC review)

- The click-NDA is enforceable under ESIGN but weaker than a countersigned
  agreement. For lead investors, consider a countersigned NDA via DocuSign as a
  follow-up. The portal records enough to support enforcement; counsel should
  confirm it meets your bar.
- `lib/nda-text.ts` is a solid mutual-NDA template but must be ratified by
  securities counsel before go-live.
- Nothing in the portal is an offer of securities. Keep all returns/appreciation
  language framed as base-case estimates.

© Mālama Labs, Inc. Confidential.
