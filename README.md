# Brightpan — UK home & kitchen dropshipping store

A production-ready dropshipping shop for the UK: Next.js (App Router) + TypeScript +
Tailwind CSS, Stripe payments (GBP, VAT-inclusive prices), Prisma (SQLite locally,
Postgres in production) and the **official CJdropshipping API** for products,
orders and tracking. No scraping anywhere.

> **Safety switch.** The store starts in **test mode** (`STORE_MODE=test`): only Stripe
> test keys are accepted, and orders sent to CJ are **sandbox orders** that CJ never
> charges or ships. Nothing real happens until you set `STORE_MODE=live` (see
> [Going live](#going-live)).

---

## Contents

- [What it does](#what-it-does)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Payments (Stripe)](#payments-stripe)
- [Adding products](#adding-products)
- [Pricing rules](#pricing-rules)
- [Order automation](#order-automation)
- [Admin](#admin)
- [Deploying to Vercel](#deploying-to-vercel)
- [What you must do manually each day](#what-you-must-do-manually-each-day)
- [Going live](#going-live)
- [Project structure](#project-structure)

---

## What it does

**Storefront** (mobile-first, accessible, light/dark mode)

- Home page, category pages, product pages with an image gallery and supplier videos.
- The real CJ delivery estimate, warehouse and carrier are shown on each product page.
- Basket with multi-buy and free-delivery nudges.
- A "Complete your order" section for add-on products.
- Checkout with Stripe's payment form embedded on your own `/checkout` page, and an order confirmation page.
- Policy pages: delivery, 14-day returns (Consumer Contracts Regulations 2013), privacy, terms and contact.
- Every company detail is a highlighted `[PLACEHOLDER]` until you fill it in.
- Product photos get the same "colour grade" (warm tint and slight contrast lift) so photos from different suppliers look like one set.

**Automation**

- The Stripe webhook saves the order, emails the customer a confirmation, and creates the order on CJ: one CJ order per source warehouse, with the customer's address.
- If anything fails, the order is marked **NEEDS_ATTENTION** with the reason. It is never retried silently.
- A cron job checks tracking every 6 hours, saves the tracking number and emails the customer when the parcel ships.
- A daily cron re-syncs prices and stock from CJ. Out-of-stock products are hidden automatically and return when stock does.
- Refunds and card disputes reported by Stripe update the order automatically.

**Sourcing database**

- `npm run discover` searches CJ for **trending and best-selling** home & kitchen products, preferring UK and EU warehouses.
- For each product it saves every photo and video, the real supplier cost, a UK shipping quote, the warehouse and the delivery time.
- You review the results in `/admin/sourcing` and publish them with your own title and description.

**Admin** (`/admin`, password protected)

- Orders with status, CJ order IDs, tracking and profit per order.
- Daily summary: revenue, VAT, supplier cost, Stripe fees and estimated profit, before and after ad spend.
- Retry, refund and status controls.
- "Re-sync from CJ" button and per-product publish/hide.

---

## Quick start (local)

Requirements: Node.js 20.9+ and npm.

```bash
npm install                      # also generates the Prisma client
cp .env.example .env.local       # then fill in the values (see below)
npx prisma migrate deploy        # creates prisma/dev.db
npm run seed:demo                # optional: demo products so the shop isn't empty
npm run dev                      # http://localhost:3000
```

With a CJ API key in `.env.local`, load real products:

```bash
npm run import                   # the 8 core products in src/content/products.ts
npm run discover                 # trending products → /admin/sourcing for review
```

`npm run import` deletes the demo products once at least one real product has been imported.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run sync` | Re-sync prices and stock from CJ (same as the admin button) |
| `npm test` | Unit and integration tests (pricing, basket, CJ matching, order pipeline) |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run build` | Production build |

### Testing payments locally

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
2. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.
3. Watch the order arrive in `/admin`. In test mode the CJ order is a sandbox order.
4. Press **Simulate shipment (sandbox)** to test the tracking email end to end.

---

## Environment variables

All secrets live in `.env.local` (never committed). See `.env.example`.

| Variable | Required | Notes |
| --- | --- | --- |
| `CJ_API_KEY` | yes | CJ dashboard → My CJ → Authorization → API. The app swaps it for a 180-day token and caches that in the database. |
| `STRIPE_SECRET_KEY` | yes | `sk_test_…` until you go live. |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` from the Stripe dashboard webhook (or `stripe listen` locally). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | recommended | `pk_test_…`. Shows the payment form on your own site. Without it, customers go to Stripe's hosted page. |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://brightpan.co.uk`, no trailing slash. |
| `ADMIN_PASSWORD` | yes | At least 8 characters; use a long random one. |
| `DATABASE_URL` | yes | `file:./prisma/dev.db` locally; a Postgres URL in production (set by Vercel's Neon integration). |
| `STORE_MODE` | yes | `test` (default) or `live`. |
| `CRON_SECRET` | yes on Vercel | A random string. Vercel sends it to the cron endpoints automatically. |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Without them, emails are printed to the server log instead of sent. |
| `CJ_ACCESS_TOKEN` | optional | An access token you obtained yourself, instead of `CJ_API_KEY`. |

---

## Payments (Stripe)

Stripe is the payment gateway: it handles card security (PCI DSS), 3-D Secure/SCA,
fraud screening and payouts to your bank. Card details go straight to Stripe and
never touch your server.

- **Payment methods:** the checkout shows every method you switch on in
  **Stripe Dashboard → Settings → Payment methods**: cards, Apple Pay, Google Pay,
  Link, Klarna, PayPal, Revolut Pay and others. No code changes are needed.
- **Apple Pay on your own domain:** add your domain under **Settings → Payment
  method domains**. Stripe needs this for the embedded form.
- **Prices:** every amount is calculated on the server from the database; the
  browser only sends product IDs and quantities.
- **Multi-buy:** applied as a Stripe coupon (`MULTIBUY_10`), created automatically
  on first use.
- **Webhook events to enable** (Dashboard → Developers → Webhooks → endpoint
  `https://YOUR-DOMAIN/api/stripe/webhook`):
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.expired`
  - `charge.refunded`
  - `charge.dispute.created`
- **Refunds:** use **Refund…** on an order in `/admin`, or refund in the Stripe
  dashboard. Both keep the order's status and profit correct.
- **Receipts:** turn on "Successful payments" emails in Stripe → Settings →
  Customer emails if you want Stripe receipts as well as the shop's own
  confirmation email.

---

## Adding products

There are two ways to add products. Both use real CJ data, and both make you show
customers **your own copy**, never the supplier's text.

### A. From the sourcing database (no code)

1. Run `npm run discover`, or `npm run discover -- 50` for more results.
2. Open `/admin/sourcing`. Each result shows:
   - the supplier's photos;
   - cost and UK shipping;
   - the shop price your rules would set, and whether it would be an add-on;
   - warehouse, delivery time, stock and how many shops already sell it.
3. Click **Approve** on the ones you want, then open **Publish to the shop**.
4. Write a title, summary, description and bullets in your own words, and choose a category.
5. Publishing fetches fresh CJ data and makes the product live.

Discovery skips knives and blades, which need age verification to sell in the UK. It
also skips lighters, vapes, medical products and baby/children's products, which have
extra safety rules. Edit `src/lib/cj/discover.ts` to change the search keywords or
these filters.

### B. In code (`src/content/products.ts`)

Each entry has your copy plus the search terms and match rules used to find the product
on CJ. To add one:

1. Copy an existing entry and give it a new `key`.
2. Write the title, summary, description and bullets.
3. Set `searchTerms` and the `match` rules: `all` phrase groups that must appear, `none` phrases to reject, and `prefer` phrases.
4. If you already know the exact CJ product, set `cjProductId` and the search is skipped.
5. Run `npm run import -- your-key`.

Always check imported products in `/admin/products`. It shows CJ's original product
name next to your title, so you can confirm the match is right and that your copy
(sizes, what's included) fits the actual item.

**Copy rules:** plain UK English. No health or safety claims (non-toxic, BPA-free,
dishwasher-safe, healthier…) unless you've confirmed them for that exact product.

---

## Pricing rules

All rules are in **`src/config/store.ts`**. Change them there and run a re-sync to
recalculate prices.

- **Shop price** = (supplier cost + UK shipping) × **2.5**, rounded to end in **.99**, minimum **£12.99**.
- CJ quotes in USD. The `usdToGbp` rate in the config converts it; update it monthly, then re-sync.
- **Estimated profit** = price excluding 20% VAT − supplier cost − shipping − Stripe fee (1.5% + 20p) − **£8 ad cost**.
- Products with an estimated profit **under £3** become **add-on only**: they appear in "Complete your order", not the main catalogue.
- **Basket:** 10% off 3+ items. Free delivery when the discounted item subtotal is £35 or more, otherwise £3.99.

> **Heads-up:** with these numbers, a product needs a landed cost (supplier +
> shipping) of roughly **£10.70 or more** to clear £3 profit after the £8 ad cost.
> Most cheap gadgets will therefore be add-ons. That's what the rule asks for, but it's
> worth knowing when you choose products and plan ad spend.

---

## Order automation

```
Customer pays (Stripe)
  → webhook: order saved as PAID (duplicate webhooks are ignored)
  → confirmation email
  → actual Stripe fee recorded
  → CJ order(s) created, one per warehouse (create-only: payType=3, no automatic charge)
      ✓ SENT_TO_CJ          ✗ NEEDS_ATTENTION (reason saved, no automatic retry)
Every 6 h (cron): CJ status + tracking → SHIPPED → "your order has shipped" email
                  → DELIVERED
```

- **CJ orders are not paid automatically.** You pay for them in the CJ dashboard;
  `/admin` shows how many are waiting. This is deliberate, so the app never spends
  your money on its own. CJ's API can pay from your CJ balance (`payType=2`) if you
  want to automate this later.
- **Retry:** on a NEEDS_ATTENTION order, fix the cause (address, stock, CJ balance…)
  and press **Retry CJ order**. Before re-creating an order, it checks whether CJ
  already has it, so you won't get duplicates.

---

## Admin

`/admin` → log in with `ADMIN_PASSWORD`. The session lasts 12 hours, and changing the
password logs everyone out.

- **Orders:**
  - today's figures and a 14-day daily summary;
  - a filter for orders that need attention;
  - per-order CJ IDs, tracking and profit (the estimated cost is replaced by CJ's actual charge once known);
  - Retry, Refund, Set status, and Simulate shipment (test mode only).
- **Products:** prices, costs, profit, add-on flag, stock and visibility. Includes **Re-sync prices & stock from CJ** and Publish/Hide per product.
- **Sourcing:** the sourcing database (see [Adding products](#adding-products)).

---

## Deploying to Vercel

Production uses **Postgres**: SQLite files don't persist on Vercel. You don't need
to change any code. When `DATABASE_URL` is a Postgres URL, the app switches to the
Postgres schema automatically, and each deploy applies any new database
migrations before building.

1. **Create the project.** In [Vercel](https://vercel.com/new), import the GitHub
   repo `youssefgaberr/mycode`. Leave the framework (Next.js) and build settings as
   they are.
2. **Add a database.** In the project, open **Storage → Create Database → Neon
   (Postgres)** and connect it to the project. Neon's free plan is enough to start.
   This sets `DATABASE_URL`, and `DATABASE_URL_UNPOOLED`, which is used for
   migrations.
3. **Add environment variables** under Project → Settings → Environment Variables:

   | Name | Value |
   | --- | --- |
   | `STORE_MODE` | `test` |
   | `NEXT_PUBLIC_SITE_URL` | your site URL, e.g. `https://brightpan.vercel.app` |
   | `ADMIN_PASSWORD` | a long random password |
   | `CRON_SECRET` | a long random string |
   | `STRIPE_SECRET_KEY` | `sk_test_…` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
   | `STRIPE_WEBHOOK_SECRET` | from step 5 (add it, then redeploy) |
   | `CJ_API_KEY` | your CJ API key |
   | `RESEND_API_KEY`, `EMAIL_FROM` | optional, for real emails |

4. **Deploy.** Vercel deploys from `main`, and every merge to `main` redeploys.
   The first deploy creates the database tables.
5. **Stripe webhook:** in Stripe → Developers → Webhooks, add the endpoint
   `https://YOUR-DOMAIN/api/stripe/webhook` with the events listed under
   [Payments](#payments-stripe). Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET` and redeploy.
6. **Load products into the production database.** On your computer, temporarily
   point `DATABASE_URL` in `.env.local` at the Neon URL (copy it from Vercel →
   Storage). Then run `npm run import` and/or `npm run discover`, and switch
   `DATABASE_URL` back. On the live site, press **Re-sync** in `/admin/products`
   to refresh the cache. In test mode, `npm run seed:demo` against the same URL
   gives the live site demo products.
7. **Cron jobs** are defined in `vercel.json`: tracking every 6 hours and a daily
   sync at 04:30 UTC. Vercel signs them with `CRON_SECRET` automatically.
   - Vercel's Hobby (free) plan restricts how often crons may run. If the deploy is rejected because of the 6-hourly schedule, either upgrade to Pro (paid) or change it to daily in `vercel.json` and call `/api/cron/tracking` from a free external scheduler with the header `Authorization: Bearer YOUR_CRON_SECRET`.
8. **Your own domain:** Project → Settings → Domains. Then update
   `NEXT_PUBLIC_SITE_URL` and the Stripe webhook URL.

### Database changes

Edit `prisma/schema.prisma` only. Then:

```bash
npx prisma migrate dev --name what-changed   # SQLite migration for local dev
npm run db:postgres                          # regenerate prisma/postgres/schema.prisma
DATABASE_URL="postgresql://…any empty Postgres…" npx prisma migrate dev --name what-changed
```

Commit both migration folders. The next Vercel deploy applies the Postgres one,
and a unit test fails if the Postgres schema is out of date.

---

## What you must do manually each day

1. **Open `/admin` and deal with NEEDS_ATTENTION orders.** The reason is shown on each
   one. Fix it, then press Retry, or refund the customer.
2. **Pay the CJ orders** waiting in your CJ dashboard (My CJ → Orders → Awaiting
   payment). CJ doesn't ship unpaid orders, and `/admin` shows the count. Keep your CJ
   balance topped up.
3. **Answer customer emails:** delivery questions, returns and cancellation requests.
   Refunds can be done from `/admin`. If CJ hasn't shipped yet, also cancel the CJ
   order in the CJ dashboard.
4. **Glance at the daily summary.** Check the profit after ads matches your ad spend
   and adjust your campaigns.
5. **Weekly:**
   - check the product sync log in `/admin/products` for price changes or hidden products;
   - update `usdToGbp` in `src/config/store.ts` if the exchange rate has moved;
   - review new finds in `/admin/sourcing`.
6. **Monthly:** reconcile Stripe payouts and CJ invoices with your bookkeeping, and
   file VAT as required.

---

## Going live

Before setting `STORE_MODE=live`:

- [ ] Replace every `[PLACEHOLDER]` in `src/config/store.ts`: company name, number, VAT number, addresses and email. Also set the `[DATE]` on the policy pages.
- [ ] Have the policy pages reviewed for your business. They're a sound starting point, not legal advice.
- [ ] Check you're registered for VAT. Prices are VAT-inclusive, and the profit maths assumes you pay 20% VAT. For goods shipped from outside the UK (CJ's CN/DE warehouses), check how UK VAT on low-value imports applies to you.
- [ ] Run `npm run import` (and publish from sourcing) so there are only real products. Demo products are hidden in live mode anyway.
- [ ] Order one product yourself for real to check quality and delivery time.
- [ ] Switch Stripe to live keys (`sk_live_…`, `pk_live_…`, plus a live webhook secret).
- [ ] Top up your CJ balance.
- [ ] Set `STORE_MODE=live` and redeploy.

---

## Project structure

```
src/config/store.ts        ← store name, company details, pricing & basket rules, categories
src/content/products.ts    ← your product copy + CJ search rules for `npm run import`
src/lib/cj/                ← CJ API client, catalogue import/sync, trending discovery
src/lib/orders.ts          ← payment → CJ order → tracking automation, refunds, profit
src/lib/pricing.ts         ← pricing maths (unit-tested)
src/lib/basket.ts          ← basket maths (unit-tested)
src/lib/stripe.ts          ← Stripe client with test/live safety check
src/app/(shop)/            ← storefront pages (home, shop, product, basket, checkout, policies)
src/app/admin/             ← admin pages and server actions
src/app/api/               ← checkout, Stripe webhook, cron jobs, video proxy
prisma/schema.prisma       ← database schema (edit this one)
prisma/postgres/           ← generated Postgres schema + migrations for production
scripts/                   ← import, discover, sync, demo seed
tests/                     ← Vitest unit + integration tests
```
