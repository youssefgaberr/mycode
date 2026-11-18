import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { store, warehouseLabels } from "@/config/store";
import { liveStockProblems } from "@/lib/live-stock";
import { db } from "@/lib/db";
import { isLive, siteUrl } from "@/lib/env";
import { basketInputSchema, priceBasket } from "@/lib/checkout";
import { embeddedCheckoutEnabled, ensureMultiBuyCoupon, getStripe } from "@/lib/stripe";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function orderNumber() {
  return "BP-" + Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/**
 * Creates a PENDING_PAYMENT order with server-calculated prices, then a
 * Stripe Checkout session for it. The Stripe webhook marks it paid.
 *
 * With NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set, the payment form is embedded
 * on our own /checkout page (returns `clientSecret`); otherwise customers are
 * redirected to Stripe's hosted page (returns `url`).
 */
export async function POST(request: Request) {
  const parsed = basketInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.lines.length === 0) {
    return Response.json({ error: "Your basket is empty." }, { status: 400 });
  }

  const basket = await priceBasket(parsed.data);
  if (basket.removed.length > 0) {
    return Response.json(
      { error: "Some items in your basket are no longer available. Please review your basket.", basket },
      { status: 409 },
    );
  }
  if (basket.lines.length === 0) return Response.json({ error: "Your basket is empty." }, { status: 400 });
  const market = store.markets[basket.market];
  const currency = market.currency.toLowerCase();

  // Live check with CJ: is everything still in stock right now?
  const stockProblems = await liveStockProblems(basket.lines);
  if (stockProblems.length > 0) {
    return Response.json(
      { error: `Sorry, ${stockProblems.join(", ")} just sold out at our supplier. Please update your basket.` },
      { status: 409 },
    );
  }

  if (isLive() && basket.lines.some((l) => l.isDemo)) {
    return Response.json({ error: "Demo products can't be bought." }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return Response.json({ error: "Payments aren't set up yet. Please try again later." }, { status: 503 });
  }

  const t = basket.totals;
  const order = await db.order.create({
    data: {
      number: orderNumber(),
      stripeSessionId: `pending_${crypto.randomUUID()}`,
      status: "PENDING_PAYMENT",
      isTest: !isLive(),
      market: basket.market,
      currency: market.currency,
      subtotalPence: t.subtotalPence,
      discountPence: t.discountPence,
      deliveryPence: t.deliveryPence,
      totalPence: t.totalPence,
      vatPence: t.vatPence,
      estCostPence: basket.lines.reduce((s, l) => s + l.unitCostPence * l.quantity, 0),
      items: {
        create: basket.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          cjVariantId: l.cjVariantId,
          title: l.title,
          variantName: l.variantName,
          quantity: l.quantity,
          unitPricePence: l.unitPricePence,
          unitCostPence: l.unitCostPence,
          warehouseCountry: l.warehouseCountry,
          logisticName: l.logisticName,
        })),
      },
    },
  });

  const fromLabels = [...new Set(basket.lines.map((l) => warehouseLabels[l.warehouseCountry] ?? l.warehouseCountry))];

  try {
    const coupon = t.multiBuyApplied ? await ensureMultiBuyCoupon(stripe) : null;
    const embedded = embeddedCheckoutEnabled();
    const returnUrl = `${siteUrl()}/order/confirmed?session_id={CHECKOUT_SESSION_ID}`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ...(embedded
          ? { ui_mode: "embedded_page" as const, return_url: returnUrl }
          : { success_url: returnUrl, cancel_url: `${siteUrl()}/basket` }),
        currency,
        locale: market.locale === "en-US" ? "en" : "en-GB",
        line_items: basket.lines.map((l) => {
          const image = l.image && /^https:\/\//.test(l.image) ? [l.image] : undefined;
          return {
            quantity: l.quantity,
            price_data: {
              currency,
              unit_amount: l.unitPricePence,
              product_data: {
                name: l.showVariantName ? `${l.title} — ${l.variantName}` : l.title,
                images: image,
                metadata: { variantId: l.variantId },
              },
            },
          };
        }),
        discounts: coupon ? [{ coupon }] : undefined,
        shipping_address_collection: { allowed_countries: [...market.shipTo] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: `${t.freeDelivery ? "Free " : ""}${basket.market === "GB" ? "UK" : "US"} delivery`,
              fixed_amount: { amount: t.deliveryPence, currency },
              metadata: { from: fromLabels.join(", ") },
            },
          },
        ],
        phone_number_collection: { enabled: true },
        billing_address_collection: "auto",
        client_reference_id: order.id,
        metadata: { orderId: order.id, orderNumber: order.number },
        payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
      },
      { idempotencyKey: `checkout_${order.id}` },
    );

    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return Response.json(
      embedded ? { clientSecret: session.client_secret, orderNumber: order.number } : { url: session.url },
    );
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    await db.order.delete({ where: { id: order.id } }).catch(() => undefined);
    return Response.json({ error: "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
