# Status and handover

_Last updated: 18 November 2026._

## Where things stand

| Area | State |
|---|---|
| Live site | https://brightpan.vercel.app, deployed on Vercel (Hobby plan) with Neon Postgres |
| Products live | **37** (8 core kitchen/home products plus 29 trending ones across all 5 categories) |
| Waiting to publish | **58** products with our own copy already written, in [`data/pending-publish.json`](../data/pending-publish.json) |
| Sourcing database | About 230 candidates: about 90 rejected as restricted or unsuitable, 75 new, 29 published |
| Markets | 🇬🇧 UK (GBP, VAT included) and 🇺🇸 US (USD, tax excluded). Switcher in the header; picked automatically from the visitor's country |
| Payments | Code complete (Stripe Checkout, embedded). **Not active yet: Stripe keys aren't set in Vercel** |
| Orders to CJ | Automatic after payment; sandbox orders only while `STORE_MODE=test` |
| Crons | Daily price/stock sync at 04:30 UTC; daily tracking check at 16:15 UTC |
| Mode | **Test mode.** Nothing real is charged or shipped |

### Why only 37 of ~95 are live

CJ limits API use with a daily **points** allowance: 50,000 points, refilled gradually,
with a full reset at 00:00 UTC. Collecting about 150 trending products used the whole
day's allowance on 18 November. The publishing queue continues once points are
available again. See [automation.md](automation.md#cj-api-points-budget).

## Next steps, in order

1. **Finish publishing the queue.** This is safe to re-run: it skips anything already published.
   ```bash
   ADMIN_PASSWORD='…' npm run live:publish -- data/pending-publish.json
   ```
   When CJ points run out it waits 20 minutes and carries on. Run it after 00:00 UTC to get it all done in one go.
2. **Get past 100 products.** Run one collect (`npm run live:collect`) and export (`npm run live:export`). Write copy for the best 10–20, following [product-sourcing.md](product-sourcing.md), and publish them.
3. **Turn on payments (test mode).** Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET` (test keys) in Vercel, then redeploy. The steps are in the [root README](../README.md#payments-stripe). Place a test order with card 4242 4242 4242 4242 and check that it reaches CJ as a sandbox order.
4. **Fill in the company placeholders** in `src/config/store.ts`: legal name, address, company number, VAT number, email. Every policy page shows them.
5. **Email.** Add `RESEND_API_KEY` and `EMAIL_FROM` for order confirmation and shipping emails. Until then, emails are only logged.
6. **Optional: AI copy.** Add `ANTHROPIC_API_KEY`, and **Import trending with AI** in `/admin/sourcing` writes copy and screens products automatically (about $0.02 per product).
7. **Content.** Start the social plan in [content-and-video.md](content-and-video.md).
8. **Before taking real money:** work through the [Going live](../README.md#going-live) checklist and [compliance.md](compliance.md). Upgrading to Vercel Pro is required for commercial use. It costs money, so it's your decision.

## Account housekeeping (owner)

- Turn on two-factor authentication on GitHub, Vercel, CJ, Stripe and Neon.
- Delete the Vercel access token you created for Claude once you no longer need it (Vercel → Account Settings → Tokens).
- Store the admin password in a password manager. You can change it in Vercel → Settings → Environment Variables → `ADMIN_PASSWORD`, then redeploy.

## Rules agreed with the owner

- **Ask before anything that spends money or places a real order.** That covers going live, paid plans, ad spend, and paid APIs beyond small test use.
- Stripe test mode and CJ sandbox stay on until the owner says "go live".
- Product copy is always our own words: UK English, no copied supplier text, no health or safety claims.
- Use the official CJ API only. No scraping.
- Don't sell knives or blades, medical or cosmetic products, children's or baby products, mains-plug electricals, loose lithium batteries, weapons, branded or imitation goods, or age-restricted items.
