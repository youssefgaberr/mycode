# Automation: what runs on its own, and how to automate more

## Already automatic

| What | When | Where in the code |
|---|---|---|
| Price, stock and shipping re-sync from CJ for every product, in both markets | Daily 04:30 UTC (Vercel cron) | `src/app/api/cron/sync` → `syncCatalog()` in `src/lib/cj/catalog.ts` |
| Hide out-of-stock products; bring them back when stock returns | During the sync | same |
| Live stock check of the basket at checkout | Every checkout | `src/lib/live-stock.ts` |
| Save the order, email the customer, create the CJ order(s) | When Stripe confirms payment (webhook) | `src/app/api/stripe/webhook` → `src/lib/orders.ts` |
| Tracking numbers and "your order has shipped" emails | Daily 16:15 UTC (Vercel cron), or the button in `/admin` | `src/app/api/cron/tracking` → `checkTracking()` |
| Refunds and disputes from Stripe update the order | Stripe webhook | `src/lib/orders.ts` |
| Currency and market chosen by the visitor's country | Every visit | `src/proxy.ts`, `src/components/market/*` |

> On Vercel Hobby, crons run at most **once a day**. With Vercel Pro you can set
> tracking to every 6 hours in `vercel.json` (`"0 */6 * * *"`).

## CJ API points budget

CJ meters API use in **points**:

- **Allowance:** 50,000 per day, plus 100 points per $1 of CJ spend over the last 3 months.
- **Refill:** about 1/1440 of the daily total every minute, with a full reset at **00:00 UTC**.
- **Costs:**
  - product search (`listV2`): 50 points;
  - product detail: 10 points;
  - stock, shipping quotes and videos: small amounts each.

| Job | Approximate points |
|---|---|
| Daily sync, 100 products | 6,000 |
| One "Collect trending" run (about 60 searches + about 16 products) | 4,000 |
| Publishing one product | 60 |
| One customer order (create plus tracking) | Small |

**Safe behaviour when points run out** (since 18 Nov 2026):

- the sync and bulk publish **stop and hide nothing**;
- checkout skips the live stock check;
- a CJ order that fails is marked NEEDS_ATTENTION, so press Retry later.

Rule of thumb: **no more than 3–4 collect runs a day** once real orders are coming in, so
that orders and the sync always have points.

## Operating the store from the command line (or by Claude)

`scripts/live/*.mjs` drive the **live** admin with a headless browser (Playwright). They
need the admin password in an environment variable. It is never stored in the repo.

```bash
export ADMIN_PASSWORD='…'               # the live admin password
npm run live:count                       # products live + candidates by status
npm run live:collect -- 2                # 2 × "Collect trending" (≈4 min each)
npm run live:export -- NEW data/candidates.json   # supplier data for writing copy
npm run live:publish -- data/pending-publish.json # publish a copy file, waits for CJ points
npm run live:log                         # last sourcing run log
```

On your own computer, install Playwright first: `npm i -D playwright && npx playwright install chromium`.
Claude Code cloud sessions already have it.

### The weekly "new trending products" loop

1. `npm run live:collect` saves trending CJ products to the sourcing database, with photos, videos, cost, UK/US shipping and supplier details.
2. `npm run live:export` writes `data/candidates.json`.
3. Write copy for each product, following [product-sourcing.md](product-sourcing.md). Claude can do this: "Read data/candidates.json and write copy for the sellable ones into data/pending-publish.json, following docs/product-sourcing.md." Rejects go in the same file as `{ "cjProductId", "reject": "reason" }`.
4. `npm run live:publish` fetches fresh price, stock and shipping for each product, then publishes it marked HOT.
5. Commit the copy file to keep a record: `git add data && git commit`.

**Fully automatic alternative:** add `ANTHROPIC_API_KEY` in Vercel. **Import trending with
AI** in `/admin/sourcing` then does steps 1–4 by itself, about 12 products per run, with AI
screening against the same exclusion list. Spot-check the results in `/admin/products`.

## Letting Claude operate it on a schedule

Claude Code can run a **scheduled task**: a new cloud session on a timer that runs a prompt.
For example, a weekly task with this prompt:

> In youssefgaberr/mycode, follow docs/automation.md "weekly new trending products loop": collect 2 runs, export, write copy for up to 20 sellable products following docs/product-sourcing.md, publish them, commit data/ to the work branch, and report what was published and rejected.

Before setting one up, decide:

- **The admin password:** save it as an environment secret of the cloud environment, never in the repo or the prompt.
- **How often:** weekly is plenty. Every run uses CJ points.
- **What it may do:** publish only. No refunds, no going live, no spending.

Ask Claude "set up the weekly product task" in a session and it will create it, after you confirm.

## Roadmap: more automation worth building

| Idea | Value | Effort |
|---|---|---|
| Admin JSON API with a token (instead of driving the browser) | More robust scripts and scheduled tasks | Small |
| Abandoned-basket email (Stripe `checkout.session.expired` is already received) | Recovers 5–10% of lost sales | Small |
| Review requests 10 days after delivery (verified buyers only) | Real reviews | Small |
| Auto-pay CJ orders (`payType=2` from the CJ balance) | No daily manual payment | Small, but **spends money automatically**, so the owner decides |
| Points-aware scheduler (read `pointsInfo` from CJ responses) | Never starves orders of points | Medium |
| Product feed for Google Merchant Center / Meta catalogue | Shopping ads and Instagram shop | Medium |
| Weekly performance email (top products, profit, ad cost) | Less admin checking | Small |
| Trend signals from Google Trends / TikTok Creative Center (official tools, manually checked) | Better product picks | Manual |
