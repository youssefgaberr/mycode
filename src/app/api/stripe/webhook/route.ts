import { after } from "next/server";
import type Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { markOrderExpired, markOrderPaid, processPaidOrder, recordDispute, recordRefund } from "@/lib/orders";

export const maxDuration = 60;

/**
 * Stripe webhook. Configure these events in the Stripe dashboard:
 *   checkout.session.completed
 *   checkout.session.async_payment_succeeded
 *   checkout.session.expired
 *   charge.refunded            (keeps order status/profit right after refunds)
 *   charge.dispute.created     (flags chargebacks for your attention)
 *
 * The order is saved before we reply; emails and the CJ order run straight
 * after the response (via `after`) so Stripe isn't kept waiting.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature ?? "", requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("[webhook] rejected:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const orderId = await markOrderPaid(event.data.object);
      if (orderId) after(() => processPaidOrder(orderId, stripe));
      break;
    }
    case "checkout.session.expired":
      await markOrderExpired(event.data.object.id);
      break;
    case "charge.refunded":
      await recordRefund(event.data.object);
      break;
    case "charge.dispute.created":
      await recordDispute(event.data.object);
      break;
  }
  return Response.json({ received: true });
}
