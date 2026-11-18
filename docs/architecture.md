# Architecture (technical reference)

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, `cacheComponents`), React, TypeScript. Note: newer APIs than most tutorials; read `node_modules/next/dist/docs/` first (see `AGENTS.md`) |
| Styling | Tailwind CSS v4. Light/dark theme via `html.dark`; colour tokens in `src/app/globals.css` |
| Database | Prisma 7. SQLite locally (`prisma/schema.prisma`); **Postgres in production** (`prisma/postgres/schema.prisma`, generated) on Neon |
| Payments | Stripe Checkout: embedded on `/checkout` when the publishable key is set, otherwise the hosted page |
| Supplier | CJdropshipping API v2 (`src/lib/cj/client.ts`) |
| Email | Resend (logs only when `RESEND_API_KEY` isn't set) |
| AI copy (optional) | Claude API via `@anthropic-ai/sdk` (`src/lib/ai/copywriter.ts`) |
| Hosting | Vercel (project `brightpan`), with crons in `vercel.json` |
| Tests | Vitest (`tests/`); Playwright for live checks (`scripts/live/`) |

## Request flow

```
Browser ──▶ src/proxy.ts (sets the market cookie from the visitor's country)
        ──▶ (shop) pages: cached product reads (src/lib/catalog.ts, "use cache" + tag "products")
        ──▶ /api/basket/quote ─ prices the basket server-side
        ──▶ /api/checkout ─ re-prices, checks live CJ stock, creates the Order + Stripe session
Stripe ──▶ /api/stripe/webhook ─ markOrderPaid → email → submitOrderToCj (after())
Vercel cron ──▶ /api/cron/sync     (04:30 UTC) ─ syncCatalog
            ──▶ /api/cron/tracking (16:15 UTC) ─ checkTracking → shipped emails
```

Prices are **never trusted from the browser**. Checkout re-prices from the database (`src/lib/checkout.ts`).

## Folders

```
src/
  app/
    (shop)/            storefront: home, /shop, /shop/[category], /products/[slug],
                       /basket, /checkout, /order/confirmed, policy pages
    admin/             /admin (orders + summary), /admin/products, /admin/sourcing,
                       /admin/sourcing/export (JSON), login; server actions in actions.ts
    api/               basket/quote, checkout, stripe/webhook, cron/sync, cron/tracking,
                       video/[id] (proxies CJ videos, which need a Referer)
  components/          UI grouped by area (product, basket, checkout, market, layout, admin)
  config/store.ts      ★ all business settings: name, company details, markets, pricing,
                       basket rules, categories, warehouse preference
  content/products.ts  the 8 core products: our copy + pinned CJ IDs
  lib/
    pricing.ts         price/profit maths (tested)
    basket.ts          multibuy + delivery rules (tested)
    catalog.ts         cached storefront reads
    checkout.ts        server-side basket pricing for checkout
    orders.ts          paid → CJ order → tracking → refunds/disputes; profit per order
    live-stock.ts      CJ stock check at checkout (fails open)
    admin-auth.ts      password login (signed cookie)
    admin-data.ts      admin queries (summary in GBP)
    email.ts, stripe.ts, env.ts, cron.ts, db.ts, demo.ts
    cj/
      client.ts        CJ API: auth token cache, 1 req/s throttle, isQuotaError()
      catalog.ts       buildOffer (pick warehouse + shipping + price), saveProduct, syncCatalog
      import.ts        `npm run import` for the core products
      discover.ts      kitchen discovery + saveCandidate (sourcing database)
      trending.ts      trending searches, BLOCKED filter, collect + AI import
    ai/copywriter.ts   Claude copy writer + safety screen (needs ANTHROPIC_API_KEY)
  proxy.ts             market cookie from the x-vercel-ip-country header
prisma/
  schema.prisma        ★ the schema you edit (SQLite)
  migrations/          SQLite migrations
  postgres/            generated Postgres schema + its own migrations (production)
scripts/
  import.ts, sync.ts, discover.ts, seed-demo.ts   CLI versions of admin jobs (local DB)
  economics.ts         unit-economics table (`npm run economics`)
  live/*.mjs           drive the LIVE admin with Playwright (count/collect/export/publish/log)
  postgres-schema.mjs  regenerates prisma/postgres/schema.prisma
data/                  our product copy + publish queue (see data/README.md)
tests/                 pricing, catalog, orders, postgres-schema
docs/                  this handbook
```

## Data model (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `Product` | One shop product: our title and copy, category, CJ product ID, flags (`published`, `inStock`, `isTrending` = HOT, `isAddOn`), GB price snapshot |
| `Variant` | CJ variant: SKU, cost, shipping, stock, warehouse, delivery days |
| `VariantMarket` | Price, cost and profit **per market** (GB/US) per variant |
| `ProductImage`, `ProductVideo` | Supplier media, in order |
| `Order`, `OrderItem` | Customer order, with market and currency, totals in minor units, status, attention reason, refunds |
| `CjShipment` | One CJ order per source warehouse: CJ IDs, status, tracking |
| `SourcingCandidate` | Sourcing database: everything about a CJ product before publishing, including `info` (supplier details for writing copy), status NEW/APPROVED/REJECTED/PUBLISHED and notes |
| `SyncLog` | Run logs for sync, tracking and admin jobs (`admin-collect`, `admin-bulk` …) |
| `Setting` | Key/value store (the cached CJ access token) |

Money is integer minor units (pence or cents), except fields ending in `Usd` (CJ's prices).

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Set in production? | Purpose |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | ✅ (Neon) | Postgres (pooled for the app; unpooled for migrations) |
| `CJ_API_KEY` | ✅ | CJ API key (exchanged for an access token automatically) |
| `ADMIN_PASSWORD` | ✅ | `/admin` login |
| `CRON_SECRET` | ✅ | Protects the cron endpoints |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Absolute URLs, Stripe return URL |
| `STORE_MODE` | ✅ `test` | `live` only when going live (rejects test keys, real CJ orders) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | ❌ **to do** | Payments |
| `RESEND_API_KEY`, `EMAIL_FROM` | ❌ to do | Customer emails |
| `ANTHROPIC_API_KEY` | ❌ optional | AI copy and screening |

## Deploying

- `vercel deploy --prod` (CLI), or connect the GitHub repo in Vercel so pushes to `main` deploy.
- The build runs `prisma migrate deploy && prisma generate && next build`, so migrations apply automatically.
- Roll back: Vercel → Deployments → previous → **Promote**.

## Changing the database

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name what_changed` (SQLite).
3. Run `npm run db:postgres` to regenerate the Postgres schema.
4. Create the matching Postgres migration in `prisma/postgres/migrations/`. The steps are in the root README under "Database changes".
5. Commit everything. The next deploy applies it.

## Checks before every deploy

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

There are 51 tests, covering pricing, basket rules, CJ offer building (including the "out of
CJ points ≠ out of stock" rule), order flows and Postgres schema parity.
