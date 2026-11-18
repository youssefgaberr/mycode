import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { marketConfig, store } from "@/config/store";
import { CheckIcon } from "@/components/icons";
import { ClearBasket } from "@/components/basket/ClearBasket";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

async function Confirmation({ searchParams }: Pick<PageProps<"/order/confirmed">, "searchParams">) {
  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" ? session_id : null;
  const order = sessionId
    ? await db.order.findUnique({ where: { stripeSessionId: sessionId }, include: { items: true } })
    : null;

  if (!order) {
    return (
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold">We couldn&apos;t find that order</h1>
        <p className="mt-3 text-muted">
          If you&apos;ve just paid, check your email for confirmation or contact us at {store.company.email}.
        </p>
      </div>
    );
  }

  // The webhook normally arrives within seconds; if it hasn't yet, ask Stripe directly.
  let paid = order.status !== "PENDING_PAYMENT" && order.status !== "EXPIRED";
  if (!paid) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
      paid = session.payment_status === "paid";
    } catch {}
  }

  if (!paid) {
    return (
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold">Payment not completed</h1>
        <p className="mt-3 text-muted">Your payment hasn&apos;t gone through. Nothing has been charged.</p>
        <Link href="/basket" className="mt-6 inline-block font-semibold text-brand underline">
          Return to your basket
        </Link>
      </div>
    );
  }

  const formatGBP = (minor: number) => formatMoney(minor, marketConfig(order.market));
  return (
    <div>
      <ClearBasket />
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-white">
          <CheckIcon className="size-8" />
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold">Thank you for your order!</h1>
        <p className="mt-2 text-muted">
          Order <strong className="text-fg">{order.number}</strong>
          {order.email && (
            <>
              {" "}
              — we&apos;ve sent a confirmation to <strong className="text-fg">{order.email}</strong>
            </>
          )}
          .
        </p>
        <p className="mt-1 text-sm text-muted">We&apos;ll email your tracking details as soon as it ships.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <ul className="divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {i.quantity} × {i.title}
                {i.variantName !== "Standard" && <span className="text-muted"> — {i.variantName}</span>}
              </span>
              <span className="tabular-nums">{formatGBP(i.unitPricePence * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          {order.discountPence > 0 && (
            <div className="flex justify-between text-success">
              <dt>Multi-buy discount</dt>
              <dd>−{formatGBP(order.discountPence)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{order.deliveryPence ? formatGBP(order.deliveryPence) : "Free"}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total paid</dt>
            <dd>{formatGBP(order.totalPence)}</dd>
          </div>
        </dl>
        {order.shipLine1 && (
          <p className="mt-4 text-sm text-muted">
            Delivering to {order.customerName}, {order.shipLine1}, {order.shipCity} {order.shipPostcode}
          </p>
        )}
      </div>

      <p className="mt-6 text-center">
        <Link href="/shop" className="font-semibold text-brand underline">
          Continue shopping
        </Link>
      </p>
    </div>
  );
}

export default function ConfirmedPage(props: PageProps<"/order/confirmed">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}>
        <Confirmation searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
