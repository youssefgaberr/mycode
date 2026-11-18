# Compliance checklist

This isn't legal advice. It's a working checklist of the rules that apply to a small online
gadget shop. Get an accountant and, before scaling, a quick legal review.

## UK (selling now)

- [ ] **Business details on the site.** Trading name, geographic address, email, company number and VAT number if registered. These are the `[PLACEHOLDERS]` in `src/config/store.ts`, shown in the footer and on the policy pages.
- [ ] **Consumer Contracts Regulations 2013.**
  - A 14-day cancellation period after delivery is already in the returns policy.
  - Refund within 14 days of getting the goods back, including standard delivery.
  - Clear total price and delivery cost before payment (the basket shows them).
- [ ] **Consumer Rights Act 2015.** Goods must be as described, of satisfactory quality and fit for purpose. That's another reason the copy makes no claims we can't back up.
- [ ] **Returns address in the UK.** Don't make UK customers post returns to China. Use a UK returns service or your own address.
- [ ] **DMCC Act 2024.** No fake or incentivised-but-hidden reviews; no drip pricing; no fake urgency ("only 2 left" timers). The store shows none of these.
- [ ] **General Product Safety Regulations 2005.** Products must be safe, with the producer or importer identified. That's why the store excludes risky categories (see [product-sourcing.md](product-sourcing.md)). Keep CJ's product info on file.
- [ ] **Electricals.** No mains-plug items (they need UKCA/CE and BS 1363 plugs). USB or battery items should carry UKCA/CE marking, so ask CJ when unsure.
- [ ] **Knives and blades.** Not sold. Selling them needs age verification at sale and on delivery.
- [ ] **VAT.**
  - Registration is compulsory once taxable turnover passes £90,000 in any rolling 12 months.
  - Prices already include 20% VAT in the calculations.
  - For goods under £135 shipped from outside the UK to UK consumers, the *seller* accounts for VAT at the point of sale (once registered). Talk to an accountant.
- [ ] **UK GDPR / PECR.** The privacy policy page exists (fill in the placeholders). Marketing emails need opt-in consent. There are no tracking cookies yet; add a cookie banner if you add analytics or ad pixels.
- [ ] **Payments.** Stripe handles card data (PCI). Never store card numbers.

## US (selling now)

- [ ] **Sales tax.** Prices exclude tax. You only need to collect state sales tax where you pass a state's economic-nexus threshold (often $100k in sales). Turn on Stripe Tax when you get close.
- [ ] **Import duty and tariffs.** A 30% duty allowance is built into US prices (`importDutyRate` in the config). Since the 2025 removal of the $800 de minimis exemption, parcels from China pay duty. Check how CJ charges it, and adjust the rate if needed.
- [ ] **FTC rules.** No fake reviews (FTC 2024 rule), clear "#ad" for influencer posts, and truthful "Made in" claims. Ship within the time you state, or offer cancellation (Mail Order Rule).
- [ ] **CPSC.** Children's products need certificates, so they're excluded.

## EU (later)

- [ ] **IOSS registration** to collect EU VAT on imports up to €150 at checkout.
- [ ] **GPSR (EU General Product Safety Regulation, Dec 2024).** Products need an **EU responsible person** and product-safety info on the listing.
- [ ] 14-day withdrawal right (the same as the UK), plus local-language info where you target.
- [ ] A EUR market in `src/config/store.ts` (the code supports adding markets).

## Platform and content rules

- [ ] Only original or licensed images and video (see [content-and-video.md](content-and-video.md)).
- [ ] No brand names or trademarks in titles or copy, and no "compatible with iPhone"-style claims.
- [ ] Ad platforms (Meta, TikTok, Google) have their own banned-products lists. Health claims and before/after body images are rejected.

## Records to keep (6 years in the UK)

Orders, invoices from CJ, Stripe payouts, refunds, VAT records, and product safety info
for every product sold.
