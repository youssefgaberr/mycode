# Business model

## In one paragraph

Brightpan is an online shop that sells practical, trending gadgets to customers in the
UK and the US: kitchen, home, fitness/outdoor/travel, pets and car. We don't hold stock.
When a customer pays, the order is sent automatically to **CJdropshipping**, which buys,
packs and ships the item from its warehouse (UK, EU, US or China) straight to the
customer. We earn the difference between our price and CJ's product-plus-shipping cost,
minus card fees, VAT and advertising. The work that makes money is **choosing products,
making content that sells them, and keeping customers happy**. Fulfilment is outsourced.

## How money flows

```
Customer ──pays──▶ Stripe ──payout──▶ Our bank
                                          │
                                          └─ we top up the CJ balance ──▶ CJ buys, packs and ships
```

1. The customer pays the shop price (VAT included in the UK) plus delivery if the basket is under the threshold.
2. Stripe keeps its fee: about 1.5% + 20p for UK cards, 2.9% + 30¢ for US cards.
3. The order is created on CJ automatically. **We pay CJ** for the product and shipping from our CJ balance, so keep it topped up.
4. In the UK we owe HMRC the 20% VAT included in the price, once VAT-registered.
5. What's left after advertising is profit.

## Markets

| | 🇬🇧 UK | 🇺🇸 US |
|---|---|---|
| Currency | GBP | USD |
| Prices shown | Include 20% VAT | Exclude sales tax |
| Minimum price | £12.99 | $14.99 |
| Delivery | £3.99, free over £35 | $4.99, free over $45 |
| Ships from (preferred order) | UK → DE → CN warehouses | US → CN warehouses |
| Extra cost built in | (none) | 30% allowance for import duty on parcels from China |
| Card fee assumed | 1.5% + 20p | 2.9% + 30¢ |
| Ad cost assumed per order | £8 | $10 |

The EU comes later. Selling there needs IOSS registration for VAT on imports under
€150; see [compliance.md](compliance.md).

All numbers are in `src/config/store.ts`, which is the one place to change them.

## Pricing rules

- **Shop price** = (CJ product cost + CJ shipping to that country, plus the duty allowance in the US) × **2.5**, rounded to end in **.99**, with the market's minimum price.
- **Estimated profit** = price − VAT − product − shipping − card fee − ad cost per order.
- If a product's estimated profit on its own is **under £3 / $4**, it's flagged **add-on**. Add-ons are still shown everywhere and are pushed in "Complete your order" to grow baskets.
- **Basket rules:** 10% off 3 or more items, plus free delivery over the threshold.
- The daily CJ sync re-prices everything automatically, so supplier price changes flow through.

## Unit economics (real numbers from the pricing code)

Run `npm run economics` to regenerate this table after changing the config.

**One item per order** (UK):

| CJ product + shipping | Shop price | Profit after £8 ads |
|---|---|---|
| $1 + $4 | £12.99 | −£1.51 |
| $3 + $4.50 | £14.99 | −£1.86 |
| $6 + $5 | £21.99 | £1.11 |
| $10 + $6 | £31.99 | £5.34 |
| $15 + $8 | £45.99 | £11.27 |

**Whole orders** of a typical $3 + $4.50 item (UK). The ad cost is paid once per order, not per item:

| Items | Customer pays | Profit after ads |
|---|---|---|
| 1 | £18.98 (with delivery) | £1.41 |
| 2 | £33.97 | £7.74 |
| 3 | £40.47 (−10%, free delivery) | £7.13 |
| 4 | £53.96 | £12.24 |

US margins are higher for the same products, because prices exclude tax and US shoppers
pay more: a 2-item US order of the same product makes about **$20**.

### What this means

1. **Cheap single-item orders lose money once ads are paid.** The model works on **average order value**, so everything in the shop is built to grow baskets: multibuy, the free-delivery threshold, "Complete your order" add-ons, and bundles.
2. **Higher-priced products ($10+ cost) pay for themselves.** Look for some "hero" products in the £30–£50 range, such as pet beds, tents, a walnut board or a car bed.
3. **Organic content is the cheapest customer.** Every order from free social content saves the whole £8 ad cost. See [content-and-video.md](content-and-video.md).
4. **The US is the stronger market per order.** Shipping takes longer, so be clear about delivery times.

Target to aim for: **average order value of £35+ / $45+**, with blended ad cost under £8 per order.

## Fixed and running costs

| Cost | Amount | Notes |
|---|---|---|
| Vercel | Hobby £0 now; **Pro about $20/month** | Pro is required for commercial use, and allows crons more often than daily |
| Neon Postgres | Free tier now | Upgrade if the database grows or needs more compute |
| Domain | About £10/year | Not bought yet; currently `brightpan.vercel.app` |
| Stripe | Per transaction only | No monthly fee |
| CJdropshipping | Free account | Pay per order from your CJ balance; API points grow with CJ spend |
| Resend email | Free up to 3,000 emails/month | |
| Claude API (optional) | About $0.02 per product description | Only for the "Import trending with AI" button |
| Ads | Your budget | Start small: £10–£20/day per test, with a clear stop rule |
| Accounting and VAT | Varies | VAT registration is compulsory once UK taxable turnover passes the threshold (£90,000 in 2025/26) |

## Growth plan

**Phase 1: prove it (weeks 1–4)**
- Payments on in test mode → end-to-end test orders → go live.
- 100+ products across five categories, about 10 of them "heroes".
- Post daily organic short videos for the top 10 products (TikTok, Instagram Reels, YouTube Shorts).
- Small paid tests: 3 products × £10/day for 4–5 days each. Keep what sells at under £8 cost per purchase.

**Phase 2: focus (months 2–3)**
- Cut categories and products that don't sell. Double down on winners: more variants, bundles, better photos.
- Build an email list with a discount for the first order. Send a basket-abandonment email (see the roadmap in [automation.md](automation.md)).
- Collect real reviews from verified buyers only. Fake reviews are illegal under the UK DMCC Act 2024.

**Phase 3: scale (month 4+)**
- Move bestsellers to CJ's UK or US warehouses for faster delivery (CJ offers this for proven products).
- Add the EU market (IOSS) and a custom domain, and consider simple own-brand packaging through CJ.

## Key metrics to watch

All are in `/admin`, or in Stripe and your ads dashboards:

- Orders per day, revenue, **average order value**
- **Profit after ads** (daily summary in `/admin`)
- Ad cost per purchase, by product
- Conversion rate (orders ÷ visits)
- Refund and dispute rate; keep disputes under 0.5%
- Average delivery time and "where is my order" emails

## Main risks and how the store handles them

| Risk | Mitigation |
|---|---|
| Slow delivery from China, leading to complaints | Real CJ delivery estimate on every product page; prefer UK/US/EU warehouses; clear delivery policy |
| Supplier price or stock changes | Daily automatic sync, with out-of-stock products hidden; live stock check at checkout |
| Unsafe or illegal products | Hard exclusion list in code plus a manual review of every product |
| Running out of CJ API points | Sync and publish stop safely, and nothing is hidden; see [automation.md](automation.md) |
| Ad costs higher than margin | Basket-building features; organic content first; stop rules on ad tests |
| Chargebacks | Clear policies, fast tracking emails, refunds from `/admin` |
