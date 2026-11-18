# Product sourcing: finding trending products and publishing them

## Where products come from

All products come from **CJdropshipping through its official API**, never by scraping. Each
published product stores:

- CJ product and variant IDs, and SKUs;
- the real supplier cost (USD) and a real shipping quote **to the UK and to the US**;
- the warehouse it ships from, the carrier and the delivery estimate;
- all supplier photos and videos;
- live stock per variant.

Prices and stock are re-synced daily.

## What counts as "trending"

These are the signals the tools use or that you should check:

1. **CJ trending lists:** `productFlag=0` on CJ's product search. This is what "Collect trending" uses.
2. **How many other shops list it** (`listedNum` on CJ). Higher means proven demand, but more competition.
3. **Video available:** products with a supplier video sell better on social media.
4. **UK, EU or US warehouse stock:** faster delivery, fewer complaints. Scored higher.
5. **Manual checks** using official tools only: TikTok Creative Center (top products and hashtags), Google Trends, Amazon Movers & Shakers, Etsy and Instagram hashtags. Look, don't copy.

The search keywords per category live in `TRENDING_SEARCHES` in
`src/lib/cj/trending.ts`. Edit them freely: each run starts from a different keyword and
goes deeper into CJ's lists.

## A good product for this store

- Solves a small, visible problem, which makes a good 10-second video ("before / after").
- Landed cost (product + shipping) of **$6 or more**, so it isn't a loss-maker on its own. Cheaper items are fine as **add-ons**.
- Light and unbreakable: cheap shipping, few damage claims.
- Has variants or sizes that people can choose from: more choice, better conversion.
- In one of our categories: kitchen, home, fitness/outdoor/travel, pets, car.

## Never sell these (legal or risk)

The name filter is `BLOCKED` in `src/lib/cj/trending.ts`; every candidate is also reviewed by a person (or by the AI screen).

- Knives, blades, razors, cutting discs, weapons or "self-defence" items (UK age-verification rules)
- Medical or health devices and claims (thermometers, braces, posture, EMS muscle stimulators, "healing" crystals)
- Cosmetics and skincare devices, anything applied to skin, hair or nails, soaps
- Toys, and children's or baby products (strict safety standards)
- Mains-plug electricals and chargers, loose lithium batteries or power banks, wireless chargers
- PPE: masks, goggles, protective pads, knee supports (needs certification)
- Chemicals that need hazard labels: car wax, polishes, cleaning tablets
- Spy or tracking devices, hidden cameras, GPS trackers for people
- Branded or "compatible with iPhone" items, imitations, characters or logos
- Clothing, shoes, jewellery (out of range; sizing returns)
- Seasonal novelties outside the season
- Strong small magnets (ingestion hazard)

Rejected products are kept in the sourcing database as REJECTED with the reason, so
they're never suggested again.

## Writing product copy (house style)

Every product gets **our own words**. Never paste the supplier's text, which is often
machine-translated, keyword-stuffed or copied from brands.

- **Title:** 3–7 words, Title Case, says what it is. No brand names, no "2024 New Hot".
- **Summary:** one sentence, up to about 110 characters: what it does for the customer.
- **Description:** 2–3 short paragraphs, 60–140 words. Explain what it is, how it's used and the options.
- **Bullets:** exactly 4 short, factual features.
- **UK English.** Plain and friendly. No hype ("revolutionary", "must-have"), no emojis, no capitals for emphasis.
- **No claims you can't prove:** health, safety, "non-toxic", "BPA-free", "food-grade", "dishwasher-safe", eco, "kills bacteria", "UV protection", "anti-anxiety". Leave out numbers (capacity, wattage, battery life) unless they're in CJ's structured data. The site shows a specs table separately, so you can say "see the specifications".
- Where it matters, add a sensible use note: "supervise play", "only use when parked", "use with a harness".

### Bulk publish format

A JSON array, pasted into **Bulk publish** in `/admin/sourcing` or used with `npm run live:publish`:

```json
[
  {
    "cjProductId": "1368888013161107456",
    "category": "pets",
    "title": "Self-Cleaning Pet Hair Remover Roller",
    "summary": "Roll it over sofas, beds and car seats to lift pet hair, then empty it with one press.",
    "description": "First paragraph…\n\nSecond paragraph…",
    "bullets": ["Reusable: no sticky sheets", "Collects hair into a compartment", "Empties with one press", "Works on sofas and car seats"]
  },
  { "cjProductId": "1385423428458254336", "reject": "Covert GPS tracker - privacy risk" }
]
```

- `category` is one of `kitchen`, `home`, `fitness`, `pets`, `car`.
- Field limits: title up to 80 characters; summary 10–160; description 40–4000; 2–6 bullets.

`data/product-copy.json` contains every description written so far (139 products). Use it as
examples of the house style.

## Publishing checklist (2 minutes per product, in `/admin/products`)

- [ ] CJ's original name (shown next to your title) matches what your copy describes.
- [ ] Price looks sensible for the market. Switch £/$ on the site to check both.
- [ ] Photos are of the right item. If they show another brand's logo, unpublish the product.
- [ ] Delivery estimate is acceptable (ideally under 12 working days).
- [ ] Marked HOT if it's a trending pick; unpublish anything doubtful.
