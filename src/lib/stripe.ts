import "server-only";
import Stripe from "stripe";
import { store } from "@/config/store";
import { isLive, requireEnv } from "@/lib/env";

let client: Stripe | null = null;

/**
 * Lazily-created Stripe client. Refuses to run with a live key while
 * STORE_MODE is "test" (and vice versa), so real cards can't be charged by
 * accident.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = requireEnv("STRIPE_SECRET_KEY");
  const keyIsLive = /^(sk|rk)_live_/.test(key);
  if (keyIsLive && !isLive()) {
    throw new Error("A LIVE Stripe key is set but STORE_MODE is not 'live'. Use a test key (sk_test_...) until you go live.");
  }
  if (!keyIsLive && isLive()) {
    throw new Error("STORE_MODE is 'live' but STRIPE_SECRET_KEY is a test key.");
  }
  client = new Stripe(key, { appInfo: { name: store.name } });
  return client;
}

/**
 * Embedded checkout (payment form on our own /checkout page) is used when a
 * publishable key is configured, and its mode matches the secret key's.
 */
export function embeddedCheckoutEnabled(): boolean {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (!pk) return false;
  return isLive() ? pk.startsWith("pk_live_") : pk.startsWith("pk_test_");
}

/** The multi-buy coupon, created in Stripe on first use. */
export async function ensureMultiBuyCoupon(stripe: Stripe): Promise<string> {
  const pct = store.basket.multiBuyPercentOff;
  const id = `MULTIBUY_${pct}`;
  try {
    await stripe.coupons.retrieve(id);
  } catch (err) {
    if ((err as { code?: string }).code !== "resource_missing") throw err;
    await stripe.coupons.create({
      id,
      percent_off: pct,
      duration: "once",
      name: `Multi-buy ${pct}% off (${store.basket.multiBuyMinItems}+ items)`,
    });
  }
  return id;
}
