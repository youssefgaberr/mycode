import "server-only";
import { db } from "@/lib/db";
import { store } from "@/config/store";
import { toPence } from "@/lib/pricing";
import { orderProfitPence } from "@/lib/orders";

/** Orders that represent real sales (paid and not cancelled/refunded). */
export const SOLD_STATUSES = ["PAID", "SUBMITTING", "SENT_TO_CJ", "SHIPPED", "DELIVERED", "NEEDS_ATTENTION"];

export async function getAdminOrders(filter?: string) {
  const where =
    filter === "attention"
      ? { status: "NEEDS_ATTENTION" }
      : filter === "all"
        ? {}
        : { status: { notIn: ["PENDING_PAYMENT", "EXPIRED"] } };
  const orders = await db.order.findMany({
    where,
    include: { items: true, shipments: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return orders.map((o) => ({ ...o, profit: orderProfitPence(o) }));
}

const londonDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });

export interface DaySummary {
  day: string;
  orders: number;
  revenuePence: number;
  vatPence: number;
  supplierCostPence: number;
  stripeFeesPence: number;
  profitPence: number;
  profitAfterAdsPence: number;
}

/** Revenue, costs and estimated profit per day (UK time) for the last `days` days. */
export async function getDailySummary(days = 14): Promise<{ rows: DaySummary[]; totals: DaySummary }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const orders = await db.order.findMany({
    where: { status: { in: SOLD_STATUSES }, paidAt: { gte: since } },
    orderBy: { paidAt: "desc" },
  });
  const adCost = toPence(store.pricing.adCostPerOrder);
  const byDay = new Map<string, DaySummary>();
  const blank = (day: string): DaySummary => ({
    day,
    orders: 0,
    revenuePence: 0,
    vatPence: 0,
    supplierCostPence: 0,
    stripeFeesPence: 0,
    profitPence: 0,
    profitAfterAdsPence: 0,
  });
  for (let i = 0; i < days; i++) {
    const d = londonDay.format(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    byDay.set(d, blank(d));
  }
  const totals = blank("Total");
  for (const o of orders) {
    const d = londonDay.format(o.paidAt!);
    const row = byDay.get(d) ?? blank(d);
    const p = orderProfitPence(o);
    for (const r of [row, totals]) {
      r.orders++;
      r.revenuePence += o.totalPence;
      r.vatPence += o.vatPence;
      r.supplierCostPence += p.supplierCostPence;
      r.stripeFeesPence += p.stripeFeePence;
      r.profitPence += p.profitPence;
      r.profitAfterAdsPence += p.profitPence - adCost;
    }
    byDay.set(d, row);
  }
  return { rows: [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)), totals };
}

export async function getAdminCounts() {
  const [attention, awaitingCjPayment, lastSync, lastTracking] = await Promise.all([
    db.order.count({ where: { status: "NEEDS_ATTENTION" } }),
    db.cjShipment.count({
      where: { cjOrderId: { not: null }, shippedAt: null, cjStatus: { in: ["CREATED", "IN_CART", "UNPAID"] } },
    }),
    db.syncLog.findFirst({ where: { kind: "sync" }, orderBy: { startedAt: "desc" } }),
    db.syncLog.findFirst({ where: { kind: "tracking" }, orderBy: { startedAt: "desc" } }),
  ]);
  return { attention, awaitingCjPayment, lastSync, lastTracking };
}
