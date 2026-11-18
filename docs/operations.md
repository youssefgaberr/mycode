# Operations runbook

How to run Brightpan day to day. Most of it is automatic; this covers the human parts.

## The order lifecycle

```
PENDING_PAYMENT ──(customer pays)──▶ PAID ──(sent to CJ automatically)──▶ SENT_TO_CJ
        │                                  │                                  │
   (abandoned 24h)                  (CJ refused / error)              (tracking cron finds
        ▼                                  ▼                           a tracking number)
     EXPIRED                        NEEDS_ATTENTION ──Retry──▶ SENT_TO_CJ       ▼
                                                                            SHIPPED ──▶ DELIVERED
Any paid order can become REFUNDED (from /admin or Stripe) or CANCELLED (set manually).
```

- **SENT_TO_CJ** means the order exists on CJ. Orders are created as **"create only"**, so **you must pay each CJ order** in the CJ dashboard before CJ ships it. `/admin` shows a red banner with the number waiting.
- **NEEDS_ATTENTION** always shows the reason. The system never retries silently; a person decides.

## Every day (10–15 minutes)

1. **Open `/admin`.**
   - **Needs attention:** read the reason, fix it, then press **Retry CJ order**. If the item can't be supplied, **Refund** the customer and email them.
   - **CJ orders waiting for payment:** go to CJ → My CJ → Orders → Awaiting payment and pay them. Keep the CJ balance topped up so this is quick.
2. **Customer emails:** "where is my order", returns, cancellations. Use the email templates below.
3. **Check today's summary:** orders, revenue, profit after ads. Compare with ad spend.
4. **Social content:** post 1–2 short videos following the plan in [content-and-video.md](content-and-video.md).

## Every week

- **`/admin/products`:** review the sync log for price changes and hidden (out-of-stock) products. Unpublish anything with poor reviews or slow delivery.
- **`/admin/sourcing`:** collect new trending products, write copy and publish 10–20; see [product-sourcing.md](product-sourcing.md). Remember the [CJ points budget](automation.md#cj-api-points-budget).
- **Ads:** pause anything with cost per purchase above £8 / $10. Move budget to the winners.
- **Exchange rate:** if GBP/USD has moved by more than about 3%, update `fxFromUsd` for GB in `src/config/store.ts` and redeploy. The next sync re-prices everything.

## Every month

- Reconcile Stripe payouts, CJ charges and refunds in your bookkeeping.
- VAT: once registered, file the VAT return. The `/admin` summary shows the VAT included in sales.
- Review the bestsellers and ask CJ about stocking them in UK or US warehouses for faster delivery.
- Check the [compliance checklist](compliance.md) is still true for any new product types.

## Handling problems

| Problem | What to do |
|---|---|
| Order in NEEDS_ATTENTION: "out of stock" or "variant unavailable" | Refund in `/admin` (tick the confirm box). Email the customer an apology. The product is hidden by the next sync automatically |
| NEEDS_ATTENTION: "Insufficient API points" | Wait for CJ points to refill (they reset at 00:00 UTC), then press Retry |
| NEEDS_ATTENTION: address problem | Email the customer to confirm the address, fix it in CJ if needed, then use "Sent to CJ (fixed manually)" |
| Customer wants to cancel | If CJ hasn't shipped, cancel the CJ order in the CJ dashboard, then refund in `/admin`. If it has shipped, treat it as a return |
| Return (14 days, Consumer Contracts Regulations) | Give the customer the return address (your returns address, not China; see [compliance.md](compliance.md)) and refund within 14 days of getting the item back |
| Parcel late | Check tracking (the link is in `/admin`). Past CJ's maximum estimate plus 7 days, open a dispute with CJ and offer the customer a refund or replacement |
| Card dispute or chargeback | It appears on the order automatically. Answer it in Stripe with the tracking and delivery evidence |
| Product shows the wrong price | Run **Re-sync from CJ** in `/admin/products`, then check `src/config/store.ts` |
| Site down or errors | Vercel → brightpan → Deployments: roll back to the previous deployment in one click, then investigate the logs |

## Email templates

**Where is my order?**
> Hi {name}, thanks for your order {number}. It left our warehouse on {date} and is on its way. You can track it here: {tracking link}. The current estimate is {min}–{max} working days from dispatch. If it hasn't arrived by {date}, reply to this email and we'll sort it out.

**Out of stock, refunded**
> Hi {name}, we're sorry: {item} sold out at our supplier before we could send your order {number}. We've refunded {amount} in full to your card. It usually shows within 5–10 days. Sorry for the trouble.

**Return instructions**
> Hi {name}, no problem. Please send the item(s), unused and in the original packaging, to {return address} within 14 days and include your order number {number}. We'll refund you within 14 days of receiving it (or of proof of postage).

## Where to look

| Need | Where |
|---|---|
| Orders, profit, retry, refund | `/admin` |
| Products: publish, hide, HOT flag, re-sync | `/admin/products` |
| New products, collect, bulk publish, run logs | `/admin/sourcing` |
| Payments, payouts, disputes | Stripe dashboard |
| CJ orders, payment, balance, disputes | CJ dashboard → My CJ |
| Server logs, crons, env vars, rollbacks | Vercel → brightpan |
| Database | Neon console (via Vercel → Storage), or `npm run db:studio` locally |
