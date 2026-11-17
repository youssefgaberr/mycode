import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  buildCjOrderRequest,
  checkTracking,
  groupByWarehouse,
  markOrderPaid,
  orderProfitPence,
  recordDispute,
  recordRefund,
  retryCjSubmission,
  submitOrderToCj,
  type CjOrderApi,
} from "@/lib/orders";
import type Stripe from "stripe";

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const address = {
  customerName: "Ada Lovelace",
  phone: "+44 7700 900123",
  shipLine1: "1 Test Street",
  shipLine2: null,
  shipCity: "Leeds",
  shipCounty: null,
  shipPostcode: "LS1 1AA",
  shipCountry: "GB",
};

async function makeOrder(status = "PAID", items = [{ wh: "GB", vid: "V1" }, { wh: "CN", vid: "V2" }]) {
  return db.order.create({
    data: {
      number: `BP-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      stripeSessionId: `cs_test_${Math.random().toString(36).slice(2)}`,
      status,
      email: "ada@example.com",
      ...address,
      subtotalPence: 3000,
      discountPence: 0,
      deliveryPence: 399,
      totalPence: 3399,
      vatPence: 567,
      estCostPence: 1200,
      items: {
        create: items.map((i) => ({
          cjVariantId: i.vid,
          title: `Item ${i.vid}`,
          variantName: "Standard",
          quantity: 1,
          unitPricePence: 1500,
          unitCostPence: 600,
          warehouseCountry: i.wh,
          logisticName: "CJPacket",
        })),
      },
    },
  });
}

function fakeCj(overrides: Partial<CjOrderApi> = {}): CjOrderApi {
  let n = 0;
  return {
    freightCalculate: vi.fn(async () => [{ logisticName: "CJPacket", logisticPrice: 3, logisticAging: "5-8" }]),
    createOrder: vi.fn(async () => ({ orderId: `CJ${++n}`, orderStatus: "CREATED", orderAmount: 7.5 })),
    getOrderDetail: vi.fn(async () => {
      throw new Error("not found");
    }),
    getOrderDetailBatch: vi.fn(async () => []),
    ...overrides,
  } as CjOrderApi;
}

beforeEach(async () => {
  await db.order.deleteMany();
});

describe("pure helpers", () => {
  it("groups items by warehouse", () => {
    const g = groupByWarehouse([
      { id: "1", cjVariantId: "a", quantity: 1, warehouseCountry: "GB", logisticName: null },
      { id: "2", cjVariantId: "b", quantity: 2, warehouseCountry: "CN", logisticName: null },
      { id: "3", cjVariantId: "c", quantity: 1, warehouseCountry: "GB", logisticName: null },
    ]);
    expect(g.map((x) => [x.fromCountry, x.items.length])).toEqual([
      ["GB", 2],
      ["CN", 1],
    ]);
  });

  it("builds a sandbox, create-only CJ order", () => {
    const req = buildCjOrderRequest(
      { number: "BP-1", ...address },
      { fromCountry: "GB", items: [{ id: "li1", cjVariantId: "V1", quantity: 2, warehouseCountry: "GB", logisticName: null }] },
      "CJPacket",
      true,
    );
    expect(req).toMatchObject({
      orderNumber: "BP-1-GB",
      shippingCountryCode: "GB",
      shippingCountry: "United Kingdom",
      shippingProvince: "Leeds",
      shippingZip: "LS1 1AA",
      payType: 3,
      isSandbox: 1,
      fromCountryCode: "GB",
      products: [{ vid: "V1", quantity: 2, storeLineItemId: "li1" }],
    });
  });

  it("rejects incomplete addresses", () => {
    expect(() =>
      buildCjOrderRequest({ number: "BP-1", ...address, shipPostcode: null }, { fromCountry: "GB", items: [] }, "X", true),
    ).toThrow(/postcode/);
  });

  it("computes order profit", () => {
    const p = orderProfitPence({ totalPence: 3399, vatPence: 567, estCostPence: 1200, cjCostUsd: null, stripeFeePence: 71 });
    // VAT in £33.99 is 566p (3399 − round(3399 / 1.2))
    expect(p.profitPence).toBe(3399 - 566 - 1200 - 71);
  });
});

describe("markOrderPaid", () => {
  it("saves the address once, ignoring duplicate webhooks", async () => {
    const order = await makeOrder("PENDING_PAYMENT");
    const session = {
      id: order.stripeSessionId,
      payment_status: "paid",
      livemode: false,
      payment_intent: "pi_123",
      amount_total: 3399,
      amount_subtotal: 3000,
      total_details: { amount_discount: 0, amount_shipping: 399, amount_tax: 0 },
      customer_details: { email: "grace@example.com", name: "Grace Hopper", phone: "+447700900000", address: null },
      collected_information: {
        shipping_details: {
          name: "Grace Hopper",
          address: { line1: "2 Road", line2: null, city: "York", state: null, postal_code: "YO1 1AA", country: "GB" },
        },
      },
      metadata: { orderId: order.id },
    } as unknown as Stripe.Checkout.Session;

    expect(await markOrderPaid(session)).toBe(order.id);
    expect(await markOrderPaid(session)).toBeNull();
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved).toMatchObject({ status: "PAID", email: "grace@example.com", shipCity: "York", shipPostcode: "YO1 1AA" });
  });
});

describe("submitOrderToCj", () => {
  it("creates one CJ sandbox order per warehouse", async () => {
    const order = await makeOrder();
    const api = fakeCj();
    expect(await submitOrderToCj(order.id, api)).toBe("sent");
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipments: true } });
    expect(saved.status).toBe("SENT_TO_CJ");
    expect(saved.shipments).toHaveLength(2);
    expect(saved.shipments.every((s) => s.cjOrderId && s.isSandbox)).toBe(true);
    expect(saved.cjCostUsd).toBe(15);
    expect(vi.mocked(api.createOrder).mock.calls[0][0]).toMatchObject({ isSandbox: 1, payType: 3 });
    // second call does nothing
    expect(await submitOrderToCj(order.id, api)).toBe("skipped");
    expect(api.createOrder).toHaveBeenCalledTimes(2);
  });

  it("marks NEEDS_ATTENTION on failure and does not retry by itself", async () => {
    const order = await makeOrder();
    const api = fakeCj({
      createOrder: vi.fn(async (req) => {
        if (req.fromCountryCode === "CN") throw Object.assign(new Error("Insufficient inventory"), { code: 1603001 });
        return { orderId: "CJ-GB", orderStatus: "CREATED" };
      }),
    });
    expect(await submitOrderToCj(order.id, api)).toBe("needs_attention");
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipments: true } });
    expect(saved.status).toBe("NEEDS_ATTENTION");
    expect(saved.attentionReason).toMatch(/CN: .*Insufficient inventory.*1603001/);
    expect(await submitOrderToCj(order.id, api)).toBe("skipped");
    expect(api.createOrder).toHaveBeenCalledTimes(2);
  });

  it("retry links an order CJ created despite an earlier error", async () => {
    const order = await makeOrder("PAID", [{ wh: "GB", vid: "V1" }]);
    const failing = fakeCj({ createOrder: vi.fn(async () => Promise.reject(new Error("timeout"))) });
    await submitOrderToCj(order.id, failing);

    const api = fakeCj({ getOrderDetail: vi.fn(async () => ({ orderId: "CJ-EXISTING", orderStatus: "UNPAID" })) });
    expect(await retryCjSubmission(order.id, api)).toBe("sent");
    expect(api.createOrder).not.toHaveBeenCalled();
    const s = await db.cjShipment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(s.cjOrderId).toBe("CJ-EXISTING");
  });

  it("refuses demo products", async () => {
    const order = await makeOrder("PAID", [{ wh: "GB", vid: "DEMO-x-0" }]);
    expect(await submitOrderToCj(order.id, fakeCj())).toBe("needs_attention");
  });
});

describe("checkTracking", () => {
  it("records tracking, emails once, and rolls up to SHIPPED", async () => {
    const order = await makeOrder("PAID", [{ wh: "GB", vid: "V1" }]);
    await submitOrderToCj(order.id, fakeCj());
    const shipment = await db.cjShipment.findFirstOrThrow({ where: { orderId: order.id } });

    const api = {
      getOrderDetailBatch: vi.fn(async () => [
        { orderId: shipment.cjOrderId!, orderStatus: "SHIPPED", trackNumber: "TRK123", logisticName: "Royal Mail" },
      ]),
    };
    const r1 = await checkTracking(api);
    expect(r1).toMatchObject({ checked: 1, shipped: 1, emailed: 1 });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipments: true } });
    expect(saved.status).toBe("SHIPPED");
    expect(saved.shipments[0].trackingNumber).toBe("TRK123");

    const r2 = await checkTracking(api);
    expect(r2.emailed).toBe(0);
  });
});

describe("refunds and disputes", () => {
  it("records full and partial refunds", async () => {
    const order = await makeOrder("SHIPPED");
    await db.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: "pi_refund" } });
    await recordRefund({ payment_intent: "pi_refund", amount: 3399, amount_refunded: 1000 } as unknown as Stripe.Charge);
    let saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved).toMatchObject({ status: "SHIPPED", refundedPence: 1000 });
    await recordRefund({ payment_intent: "pi_refund", amount: 3399, amount_refunded: 3399 } as unknown as Stripe.Charge);
    saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("REFUNDED");
  });

  it("profit accounts for refunds", () => {
    const p = orderProfitPence({ totalPence: 2400, vatPence: 400, refundedPence: 1200, estCostPence: 500, cjCostUsd: null, stripeFeePence: 56 });
    expect(p.revenueExVatPence).toBe(1000);
    expect(p.profitPence).toBe(1000 - 500 - 56);
  });

  it("flags disputes", async () => {
    const order = await makeOrder("DELIVERED");
    await db.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: "pi_dispute" } });
    await recordDispute({ payment_intent: "pi_dispute", reason: "fraudulent" } as unknown as Stripe.Dispute);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("NEEDS_ATTENTION");
    expect(saved.attentionReason).toMatch(/dispute/);
  });
});
