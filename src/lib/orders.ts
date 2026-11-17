/**
 * Order automation:
 *   Stripe payment → markOrderPaid → submitOrderToCj (one CJ order per warehouse)
 *   Every 6 h      → checkTracking → "your order has shipped" emails
 *
 * Failures never retry silently: the order is marked NEEDS_ATTENTION with the
 * reason, and you retry from /admin when you've looked at it.
 *
 * CJ orders are created with payType=3 ("create only"): nothing is paid
 * automatically. You pay for them in your CJ dashboard. Until STORE_MODE=live
 * they are SANDBOX orders, which CJ never charges or ships.
 */
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { isLive } from "@/lib/env";
import { estimateStripeFeePence, usdToPence, vatIncludedPence } from "@/lib/pricing";
import { orderConfirmationEmail, sendEmail, shippedEmail } from "@/lib/email";
import * as cj from "@/lib/cj/client";
import { num, pickFreight } from "@/lib/cj/catalog";
import type { CjOrderCreateRequest } from "@/lib/cj/types";

export type CjOrderApi = Pick<
  typeof cj,
  "freightCalculate" | "createOrder" | "getOrderDetail" | "getOrderDetailBatch"
>;

const COUNTRY_NAMES: Record<string, string> = { GB: "United Kingdom" };

// ── payment ─────────────────────────────────────────────────────────────────

/** Saves customer + payment details from a paid Checkout session. Returns the order id if newly paid. */
export async function markOrderPaid(session: Stripe.Checkout.Session): Promise<string | null> {
  if (session.payment_status !== "paid") return null;
  const order =
    (await db.order.findUnique({ where: { stripeSessionId: session.id } })) ??
    (session.metadata?.orderId ? await db.order.findUnique({ where: { id: session.metadata.orderId } }) : null);
  if (!order) {
    console.error(`[orders] Paid session ${session.id} has no matching order`);
    return null;
  }

  const ship = session.collected_information?.shipping_details;
  const cust = session.customer_details;
  const addr = ship?.address ?? cust?.address;
  const total = session.amount_total ?? order.totalPence;

  // Only one webhook delivery can make this transition, so duplicates are harmless.
  const res = await db.order.updateMany({
    where: { id: order.id, status: { in: ["PENDING_PAYMENT", "EXPIRED"] } },
    data: {
      status: "PAID",
      stripeSessionId: session.id,
      paidAt: new Date(),
      isTest: !session.livemode,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      email: cust?.email ?? null,
      phone: cust?.phone ?? null,
      customerName: ship?.name ?? cust?.name ?? null,
      shipLine1: addr?.line1 ?? null,
      shipLine2: addr?.line2 ?? null,
      shipCity: addr?.city ?? null,
      shipCounty: addr?.state ?? null,
      shipPostcode: addr?.postal_code ?? null,
      shipCountry: addr?.country ?? null,
      subtotalPence: session.amount_subtotal ?? order.subtotalPence,
      discountPence: session.total_details?.amount_discount ?? order.discountPence,
      deliveryPence: session.total_details?.amount_shipping ?? order.deliveryPence,
      totalPence: total,
      vatPence: vatIncludedPence(total),
      stripeFeePence: estimateStripeFeePence(total),
      stripeFeeIsEstimate: true,
    },
  });
  return res.count === 1 ? order.id : null;
}

/** Records a Stripe refund (full or partial) against the order. */
export async function recordRefund(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const order = await db.order.findFirst({ where: { stripePaymentIntentId: pi } });
  if (!order) return;
  const full = charge.amount_refunded >= charge.amount;
  await db.order.update({
    where: { id: order.id },
    data: {
      refundedPence: charge.amount_refunded,
      ...(full ? { status: "REFUNDED" } : {}),
    },
  });
}

/** A chargeback needs a human: flag the order. */
export async function recordDispute(dispute: Stripe.Dispute) {
  const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!pi) return;
  await db.order.updateMany({
    where: { stripePaymentIntentId: pi },
    data: {
      status: "NEEDS_ATTENTION",
      attentionReason: `Card dispute opened (${dispute.reason}). Respond in the Stripe dashboard before the deadline.`,
    },
  });
}

export async function markOrderExpired(sessionId: string) {
  await db.order.updateMany({ where: { stripeSessionId: sessionId, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED" } });
}

/** Replaces the estimated Stripe fee with the real one from the balance transaction. */
export async function recordStripeFee(stripe: Stripe, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.stripePaymentIntentId) return;
  const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
    expand: ["latest_charge.balance_transaction"],
  });
  const charge = pi.latest_charge;
  const bt = charge && typeof charge !== "string" ? charge.balance_transaction : null;
  if (bt && typeof bt !== "string") {
    await db.order.update({ where: { id: orderId }, data: { stripeFeePence: bt.fee, stripeFeeIsEstimate: false } });
  }
}

export async function sendOrderConfirmation(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order?.email || order.confirmationEmailSentAt) return;
  await sendEmail(orderConfirmationEmail({ ...order, email: order.email }));
  await db.order.update({ where: { id: orderId }, data: { confirmationEmailSentAt: new Date() } });
}

// ── CJ submission ───────────────────────────────────────────────────────────

interface ItemLike {
  id: string;
  cjVariantId: string;
  quantity: number;
  warehouseCountry: string;
  logisticName: string | null;
}

/** Groups order items by the warehouse they ship from. */
export function groupByWarehouse<T extends ItemLike>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(item.warehouseCountry, [...(groups.get(item.warehouseCountry) ?? []), item]);
  }
  return [...groups.entries()].map(([fromCountry, groupItems]) => ({ fromCountry, items: groupItems }));
}

export function cjOrderNumber(orderNumber: string, fromCountry: string) {
  return `${orderNumber}-${fromCountry}`;
}

export class OrderAddressError extends Error {}

export function buildCjOrderRequest(
  order: {
    number: string;
    customerName: string | null;
    phone: string | null;
    shipLine1: string | null;
    shipLine2: string | null;
    shipCity: string | null;
    shipCounty: string | null;
    shipPostcode: string | null;
    shipCountry: string | null;
  },
  group: { fromCountry: string; items: ItemLike[] },
  logisticName: string,
  sandbox: boolean,
): CjOrderCreateRequest {
  const missing = (
    [
      ["name", order.customerName],
      ["address line 1", order.shipLine1],
      ["town/city", order.shipCity],
      ["postcode", order.shipPostcode],
      ["country", order.shipCountry],
    ] as const
  )
    .filter(([, v]) => !v?.trim())
    .map(([k]) => k);
  if (missing.length) throw new OrderAddressError(`Shipping address is missing: ${missing.join(", ")}`);
  const country = order.shipCountry!.toUpperCase();
  return {
    orderNumber: cjOrderNumber(order.number, group.fromCountry),
    shippingCountryCode: country,
    shippingCountry: COUNTRY_NAMES[country] ?? country,
    shippingProvince: (order.shipCounty || order.shipCity)!.slice(0, 50),
    shippingCity: order.shipCity!.slice(0, 50),
    shippingZip: order.shipPostcode!,
    shippingCustomerName: order.customerName!.slice(0, 50),
    shippingAddress: order.shipLine1!.slice(0, 500),
    shippingAddress2: order.shipLine2?.slice(0, 500) || undefined,
    shippingPhone: order.phone?.replace(/[^\d+ ]/g, "").slice(0, 20) || undefined,
    remark: `Order ${order.number}`,
    logisticName,
    fromCountryCode: group.fromCountry,
    payType: 3,
    isSandbox: sandbox ? 1 : 0,
    products: group.items.map((i) => ({ vid: i.cjVariantId, quantity: i.quantity, storeLineItemId: i.id })),
  };
}

const errMsg = (err: unknown) => {
  const e = err as Error & { code?: number; requestId?: string };
  return `${e.message}${e.code ? ` (code ${e.code})` : ""}${e.requestId ? ` [requestId ${e.requestId}]` : ""}`;
};

/**
 * Sends a PAID order to CJ. Safe to call twice: it claims the order first,
 * skips warehouses that already have a CJ order, and before re-creating a
 * failed one it asks CJ whether that order number already exists.
 */
export async function submitOrderToCj(orderId: string, api: CjOrderApi = cj): Promise<"sent" | "needs_attention" | "skipped"> {
  const claim = await db.order.updateMany({ where: { id: orderId, status: "PAID" }, data: { status: "SUBMITTING" } });
  if (claim.count === 0) return "skipped";

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shipments: true } });
  const sandbox = !isLive() || order.isTest;
  const problems: string[] = [];

  for (const group of groupByWarehouse(order.items)) {
    const number = cjOrderNumber(order.number, group.fromCountry);
    let shipment = order.shipments.find((s) => s.cjOrderNumber === number);
    if (shipment?.cjOrderId) continue;

    try {
      if (group.items.some((i) => i.cjVariantId.startsWith("DEMO-"))) {
        throw new Error("Contains demo products, which can't be sent to CJ. Import real products first.");
      }

      // A previous attempt may have reached CJ even though we saw an error.
      if (shipment) {
        const existing = await api.getOrderDetail(number).catch(() => null);
        if (existing?.orderId) {
          await db.cjShipment.update({
            where: { id: shipment.id },
            data: { cjOrderId: existing.orderId, cjStatus: existing.orderStatus ?? null, error: null },
          });
          continue;
        }
      } else {
        shipment = await db.cjShipment.create({
          data: { orderId, cjOrderNumber: number, fromCountry: group.fromCountry, isSandbox: sandbox },
        });
      }

      const options = await api.freightCalculate(
        group.fromCountry,
        order.shipCountry ?? "GB",
        group.items.map((i) => ({ vid: i.cjVariantId, quantity: i.quantity })),
      );
      const preferred = group.items.find((i) => i.logisticName)?.logisticName;
      const chosen = options.find((o) => o.logisticName === preferred) ?? pickFreight(options);
      if (!chosen?.logisticName) throw new Error(`No CJ shipping method available from ${group.fromCountry} to the UK`);

      const request = buildCjOrderRequest(order, group, chosen.logisticName, sandbox);
      const result = await api.createOrder(request);
      if (!result?.orderId) throw new Error("CJ accepted the request but returned no order id");

      const intercepted = (result.interceptOrderReasons ?? []).map((r) => r.message).filter(Boolean);
      await db.cjShipment.update({
        where: { id: shipment.id },
        data: {
          cjOrderId: result.orderId,
          cjStatus: result.orderStatus ?? null,
          logisticName: chosen.logisticName,
          costUsd: num(result.orderAmount ?? result.actualPayment) || null,
          isSandbox: sandbox,
          error: intercepted.length ? `CJ flagged: ${intercepted.join("; ")}` : null,
        },
      });
      if (intercepted.length) problems.push(`${group.fromCountry}: CJ flagged the order — ${intercepted.join("; ")}`);
    } catch (err) {
      const message = errMsg(err);
      console.error(`[orders] CJ submission failed for ${order.number} (${group.fromCountry}): ${message}`);
      if (shipment) await db.cjShipment.update({ where: { id: shipment.id }, data: { error: message } });
      problems.push(`${group.fromCountry}: ${message}`);
    }
  }

  const shipments = await db.cjShipment.findMany({ where: { orderId } });
  const cjCostUsd = shipments.reduce((s, x) => s + (x.costUsd ?? 0), 0) || null;
  await db.order.update({
    where: { id: orderId },
    data: problems.length
      ? { status: "NEEDS_ATTENTION", attentionReason: problems.join("\n"), cjCostUsd }
      : { status: "SENT_TO_CJ", attentionReason: null, cjCostUsd },
  });
  return problems.length ? "needs_attention" : "sent";
}

/** Admin action: try a NEEDS_ATTENTION order again (explicit, never automatic). */
export async function retryCjSubmission(orderId: string, api: CjOrderApi = cj) {
  const res = await db.order.updateMany({ where: { id: orderId, status: "NEEDS_ATTENTION" }, data: { status: "PAID" } });
  if (res.count === 0) throw new Error("Only orders that need attention can be retried.");
  return submitOrderToCj(orderId, api);
}

/** Everything that happens after payment. Never throws. */
export async function processPaidOrder(orderId: string, stripe: Stripe | null) {
  await sendOrderConfirmation(orderId).catch((e) => console.error("[orders] confirmation email failed:", e));
  if (stripe) await recordStripeFee(stripe, orderId).catch((e) => console.error("[orders] stripe fee lookup failed:", e));
  try {
    await submitOrderToCj(orderId);
  } catch (err) {
    await db.order.update({
      where: { id: orderId },
      data: { status: "NEEDS_ATTENTION", attentionReason: `Unexpected error sending to CJ: ${errMsg(err)}` },
    });
  }
}

// ── tracking ────────────────────────────────────────────────────────────────

const SHIPPED_STATES = new Set(["SHIPPED", "DELIVERED", "COMPLETED"]);

/** Checks CJ for status and tracking updates; emails customers when parcels ship. */
export async function checkTracking(api: Pick<typeof cj, "getOrderDetailBatch"> = cj) {
  const shipments = await db.cjShipment.findMany({
    where: { cjOrderId: { not: null }, deliveredAt: null, order: { status: { in: ["SENT_TO_CJ", "SHIPPED"] } } },
    include: { order: { include: { items: true } } },
    take: 500,
  });
  const summary = { checked: 0, shipped: 0, delivered: 0, emailed: 0, problems: [] as string[] };

  for (let i = 0; i < shipments.length; i += 50) {
    const batch = shipments.slice(i, i + 50);
    let details: Awaited<ReturnType<typeof cj.getOrderDetailBatch>> = [];
    try {
      details = await api.getOrderDetailBatch(batch.map((s) => s.cjOrderId!));
    } catch (err) {
      summary.problems.push(`CJ lookup failed: ${errMsg(err)}`);
      continue;
    }

    for (const s of batch) {
      const d = details.find((x) => x.orderId === s.cjOrderId || x.orderNum === s.cjOrderNumber);
      if (!d) continue;
      summary.checked++;
      const status = (d.orderStatus ?? "").toUpperCase();
      const tracking = d.trackNumber?.trim() || null;
      const nowShipped = !!tracking || SHIPPED_STATES.has(status);

      await db.cjShipment.update({
        where: { id: s.id },
        data: {
          cjStatus: d.orderStatus ?? s.cjStatus,
          trackingNumber: tracking ?? s.trackingNumber,
          trackingUrl: d.trackingUrl || s.trackingUrl,
          carrier: d.logisticName || d.trackingProvider || s.carrier,
          costUsd: num(d.orderAmount) || s.costUsd,
          lastCheckedAt: new Date(),
          shippedAt: nowShipped && !s.shippedAt ? new Date() : s.shippedAt,
          deliveredAt: status === "DELIVERED" || status === "COMPLETED" ? new Date() : null,
        },
      });
      if (nowShipped && !s.shippedAt) summary.shipped++;
      if (status === "DELIVERED" || status === "COMPLETED") summary.delivered++;

      if (status === "CANCELLED" || status === "CLOSED") {
        await db.order.update({
          where: { id: s.orderId },
          data: { status: "NEEDS_ATTENTION", attentionReason: `CJ order ${s.cjOrderId} was ${status.toLowerCase()} by CJ` },
        });
        summary.problems.push(`${s.order.number}: CJ ${status}`);
        continue;
      }

      // Email the customer the first time we see a tracking number for this parcel.
      if (tracking && !s.shippedEmailSentAt && s.order.email) {
        const groupItems = s.order.items.filter((it) => it.warehouseCountry === s.fromCountry);
        const parcels = new Set(s.order.items.map((it) => it.warehouseCountry)).size;
        try {
          await sendEmail(
            shippedEmail({
              email: s.order.email,
              number: s.order.number,
              customerName: s.order.customerName,
              trackingNumber: tracking,
              trackingUrl: d.trackingUrl || null,
              carrier: d.logisticName || null,
              items: groupItems.map((it) => `${it.quantity} × ${it.title}`),
              partial: parcels > 1,
            }),
          );
          await db.cjShipment.update({ where: { id: s.id }, data: { shippedEmailSentAt: new Date() } });
          summary.emailed++;
        } catch (err) {
          summary.problems.push(`${s.order.number}: shipping email failed — ${errMsg(err)}`);
        }
      }
    }
  }

  // Roll shipment states up to orders.
  const orderIds = [...new Set(shipments.map((s) => s.orderId))];
  for (const orderId of orderIds) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { shipments: true } });
    if (!order || order.status === "NEEDS_ATTENTION") continue;
    const all = order.shipments;
    const status = all.every((s) => s.deliveredAt)
      ? "DELIVERED"
      : all.every((s) => s.shippedAt)
        ? "SHIPPED"
        : order.status;
    const cjCostUsd = all.reduce((sum, s) => sum + (s.costUsd ?? 0), 0) || order.cjCostUsd;
    await db.order.update({ where: { id: orderId }, data: { status, cjCostUsd } });
  }
  return summary;
}

// ── reporting helpers ───────────────────────────────────────────────────────

/** Profit for one order: revenue ex VAT − supplier cost (actual from CJ if known) − Stripe fee. */
export function orderProfitPence(order: {
  totalPence: number;
  vatPence: number;
  refundedPence?: number;
  estCostPence: number;
  cjCostUsd: number | null;
  stripeFeePence: number | null;
}) {
  const cost = order.cjCostUsd ? usdToPence(order.cjCostUsd) : order.estCostPence;
  const fee = order.stripeFeePence ?? estimateStripeFeePence(order.totalPence);
  // Refunds reduce revenue (and the VAT due on it); Stripe keeps its fee.
  const kept = order.totalPence - (order.refundedPence ?? 0);
  const revenueExVatPence = kept - vatIncludedPence(kept);
  return {
    revenueExVatPence,
    supplierCostPence: cost,
    costIsActual: !!order.cjCostUsd,
    stripeFeePence: fee,
    profitPence: revenueExVatPence - cost - fee,
  };
}
