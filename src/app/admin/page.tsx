import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminCounts, getAdminOrders, getDailySummary } from "@/lib/admin-data";
import { formatGBP } from "@/lib/pricing";
import { isLive } from "@/lib/env";
import { store } from "@/config/store";
import { Flash, Stat, StatusBadge, btn, btnPrimary } from "@/components/admin/ui";
import { refundOrder, retryOrder, runTrackingNow, setOrderStatus, simulateSandboxShipment } from "./actions";

export const maxDuration = 300;

const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

async function Dashboard({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await requireAdmin();
  const { msg, filter } = await searchParams;
  const f = typeof filter === "string" ? filter : undefined;
  const [orders, summary, counts] = await Promise.all([getAdminOrders(f), getDailySummary(14), getAdminCounts()]);
  const today = summary.rows[0];

  return (
    <div className="space-y-8">
      <Flash msg={msg} />
      {!isLive() && (
        <p className="rounded-lg bg-accent p-3 text-sm text-accent-fg">
          <strong>Test mode.</strong> Stripe test payments only; CJ orders are sandbox orders (never charged or shipped).
          Set <code>STORE_MODE=live</code> to go live.
        </p>
      )}

      <section aria-labelledby="today" className="space-y-3">
        <h1 id="today" className="text-2xl font-extrabold">
          Today
        </h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Stat label="Orders" value={today.orders} />
          <Stat label="Revenue (incl. VAT)" value={formatGBP(today.revenuePence)} />
          <Stat label="Supplier cost" value={formatGBP(today.supplierCostPence)} />
          <Stat label="Stripe fees" value={formatGBP(today.stripeFeesPence)} />
          <Stat label="Est. profit" value={formatGBP(today.profitPence)} />
          <Stat label="Needs attention" value={counts.attention} tone={counts.attention ? "warn" : undefined} />
        </div>
        {counts.awaitingCjPayment > 0 && (
          <p className="rounded-lg border border-danger p-3 text-sm">
            <strong>{counts.awaitingCjPayment} CJ order(s) are waiting for you to pay</strong> in your CJ dashboard
            (My CJ → Orders). CJ won&apos;t ship until they&apos;re paid.
          </p>
        )}
      </section>

      <section aria-labelledby="daily" className="space-y-3">
        <h2 id="daily" className="text-xl font-bold">
          Daily summary (last 14 days)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                {["Day", "Orders", "Revenue", "VAT", "Supplier cost", "Stripe fees", "Est. profit", `After ads (£${store.pricing.adCostPerOrder}/order)`].map(
                  (h) => (
                    <th key={h} scope="col" className="whitespace-nowrap p-2 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...summary.rows, summary.totals].map((r) => (
                <tr key={r.day} className={`border-t border-border ${r.day === "Total" ? "font-bold" : ""}`}>
                  <td className="p-2">{r.day}</td>
                  <td className="p-2">{r.orders}</td>
                  <td className="p-2">{formatGBP(r.revenuePence)}</td>
                  <td className="p-2">{formatGBP(r.vatPence)}</td>
                  <td className="p-2">{formatGBP(r.supplierCostPence)}</td>
                  <td className="p-2">{formatGBP(r.stripeFeesPence)}</td>
                  <td className="p-2">{formatGBP(r.profitPence)}</td>
                  <td className={`p-2 ${r.profitAfterAdsPence < 0 ? "text-danger" : ""}`}>{formatGBP(r.profitAfterAdsPence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Profit = revenue − VAT − supplier cost (CJ&apos;s actual charge once known, otherwise the estimate) − Stripe fees.
          &quot;After ads&quot; also subtracts the ad cost per order from the config file.
        </p>
      </section>

      <section aria-labelledby="orders" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="orders" className="mr-auto text-xl font-bold">
            Orders
          </h2>
          <Link href="/admin" className={btn}>
            Paid
          </Link>
          <Link href="/admin?filter=attention" className={btn}>
            Needs attention ({counts.attention})
          </Link>
          <Link href="/admin?filter=all" className={btn}>
            All incl. abandoned
          </Link>
          <form action={runTrackingNow}>
            <button className={btnPrimary}>Check tracking now</button>
          </form>
        </div>
        <p className="text-xs text-muted">
          Tracking is also checked automatically every 6 hours
          {counts.lastTracking ? ` (last: ${dt.format(counts.lastTracking.startedAt)})` : ""}.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                {["Order", "Customer", "Status", "Total", "CJ order(s)", "Tracking", "Profit", "Actions"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap p-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="p-2">
                    <p className="font-semibold">{o.number}</p>
                    <p className="text-xs text-muted">{dt.format(o.paidAt ?? o.createdAt)}</p>
                    {o.isTest && <p className="text-xs font-bold text-accent-fg">TEST</p>}
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-muted">{o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</summary>
                      <ul className="mt-1 space-y-0.5">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            {i.quantity} × {i.title} ({i.variantName}) — {i.warehouseCountry}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="p-2 text-xs">
                    <p className="font-semibold">{o.customerName ?? "—"}</p>
                    <p>{o.email}</p>
                    <p className="text-muted">
                      {[o.shipCity, o.shipPostcode].filter(Boolean).join(", ")}
                    </p>
                  </td>
                  <td className="p-2">
                    <StatusBadge status={o.status} />
                    {o.attentionReason && <p className="mt-1 max-w-xs whitespace-pre-line text-xs text-danger">{o.attentionReason}</p>}
                  </td>
                  <td className="p-2 tabular-nums">{formatGBP(o.totalPence)}</td>
                  <td className="p-2 text-xs">
                    {o.shipments.length === 0 && <span className="text-muted">—</span>}
                    {o.shipments.map((s) => (
                      <p key={s.id}>
                        <span className="font-mono">{s.cjOrderId ?? "not created"}</span>{" "}
                        <span className="text-muted">
                          ({s.fromCountry}
                          {s.cjStatus ? `, ${s.cjStatus}` : ""}
                          {s.isSandbox ? ", sandbox" : ""})
                        </span>
                      </p>
                    ))}
                  </td>
                  <td className="p-2 text-xs">
                    {o.shipments.filter((s) => s.trackingNumber).length === 0 && <span className="text-muted">—</span>}
                    {o.shipments
                      .filter((s) => s.trackingNumber)
                      .map((s) => (
                        <p key={s.id}>
                          {s.trackingUrl ? (
                            <a href={s.trackingUrl} className="font-mono underline" target="_blank" rel="noreferrer">
                              {s.trackingNumber}
                            </a>
                          ) : (
                            <span className="font-mono">{s.trackingNumber}</span>
                          )}
                          {s.carrier && <span className="text-muted"> {s.carrier}</span>}
                        </p>
                      ))}
                  </td>
                  <td className={`p-2 tabular-nums ${o.profit.profitPence < 0 ? "text-danger" : ""}`}>
                    {formatGBP(o.profit.profitPence)}
                    <p className="text-xs text-muted">{o.profit.costIsActual ? "actual cost" : "est. cost"}</p>
                  </td>
                  <td className="space-y-1 p-2">
                    {o.status === "NEEDS_ATTENTION" && (
                      <form action={retryOrder}>
                        <input type="hidden" name="id" value={o.id} />
                        <button className={btnPrimary}>Retry CJ order</button>
                      </form>
                    )}
                    {!isLive() && o.status === "SENT_TO_CJ" && o.shipments.some((s) => s.isSandbox && s.cjOrderId) && (
                      <form action={simulateSandboxShipment}>
                        <input type="hidden" name="id" value={o.id} />
                        <button className={btn}>Simulate shipment (sandbox)</button>
                      </form>
                    )}
                    {o.stripePaymentIntentId && o.refundedPence < o.totalPence && o.status !== "REFUNDED" && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted">Refund…</summary>
                        <form action={refundOrder} className="mt-1 space-y-1">
                          <input type="hidden" name="id" value={o.id} />
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="confirm" value="yes" required /> Refund{" "}
                            {formatGBP(o.totalPence - o.refundedPence)} to the customer
                          </label>
                          <button className={btn}>Confirm refund</button>
                        </form>
                      </details>
                    )}
                    {o.refundedPence > 0 && <p className="text-xs text-muted">Refunded {formatGBP(o.refundedPence)}</p>}
                    {!["PENDING_PAYMENT", "EXPIRED"].includes(o.status) && (
                      <form action={setOrderStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={o.id} />
                        <label className="sr-only" htmlFor={`st-${o.id}`}>
                          Set status
                        </label>
                        <select id={`st-${o.id}`} name="status" className="rounded border border-border bg-bg text-xs" defaultValue="">
                          <option value="" disabled>
                            Set status…
                          </option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="REFUNDED">Refunded</option>
                          <option value="SENT_TO_CJ">Sent to CJ (fixed manually)</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                        </select>
                        <button className={btn}>Save</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}
