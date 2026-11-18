"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { store } from "@/config/store";
import { db } from "@/lib/db";
import { isLive } from "@/lib/env";
import { checkPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { fetchOffer, fetchVideos, saveProduct, syncCatalog } from "@/lib/cj/catalog";
import { importProducts, PIN_PREFIX } from "@/lib/cj/import";
import { discoverProducts, searchToSourcing } from "@/lib/cj/discover";
import { collectTrendingCandidates, importTrendingProducts } from "@/lib/cj/trending";
import { aiConfigured } from "@/lib/ai/copywriter";
import { contentByKey } from "@/content/products";
import { seedDemoProducts } from "@/lib/demo";
import * as cj from "@/lib/cj/client";
import { checkTracking, retryCjSubmission } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import { formatGBP, formatMoney } from "@/lib/pricing";
import { marketConfig } from "@/config/store";

const back = (path: string, msg: string): never => redirect(`${path}?msg=${encodeURIComponent(msg)}`);

// ── auth ────────────────────────────────────────────────────────────────────
export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    redirect("/admin/login?error=1");
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ── catalogue ───────────────────────────────────────────────────────────────
export async function resyncFromCj() {
  await requireAdmin();
  const log = await db.syncLog.create({ data: { kind: "sync" } });
  const lines: string[] = [];
  let msg: string;
  try {
    const r = await syncCatalog((s) => lines.push(s));
    msg = `Re-sync done: ${r.updated} updated, ${r.hidden} hidden (out of stock), ${r.failed} failed.${
      r.priceChanges.length ? ` ${r.priceChanges.length} price change(s).` : ""
    }`;
    await db.syncLog.update({
      where: { id: log.id },
      data: { ok: r.failed === 0, summary: `${msg}\n${lines.join("\n")}`, finishedAt: new Date() },
    });
  } catch (err) {
    msg = `Re-sync failed: ${(err as Error).message}`;
    await db.syncLog.update({ where: { id: log.id }, data: { ok: false, summary: msg, finishedAt: new Date() } });
  }
  updateTag("products");
  back("/admin/products", msg);
}

const cjConfigured = () => !!(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN);

/** Collects log lines from a CJ job and stores them so /admin can show "Last run log". */
async function withRunLog<T>(kind: string, run: (log: (s: string) => void) => Promise<T>, summarise: (r: T) => string) {
  const lines: string[] = [];
  const log = (s: string) => {
    lines.push(s);
    console.log(`[${kind}] ${s}`);
  };
  const row = await db.syncLog.create({ data: { kind: `admin-${kind}` } });
  try {
    const result = await run(log);
    const msg = summarise(result);
    await db.syncLog.update({ where: { id: row.id }, data: { ok: true, summary: `${msg}\n${lines.join("\n")}`.slice(0, 60000), finishedAt: new Date() } });
    return msg;
  } catch (err) {
    const msg = `Failed: ${(err as Error).message}`;
    await db.syncLog.update({ where: { id: row.id }, data: { ok: false, summary: `${msg}\n${lines.join("\n")}`.slice(0, 60000), finishedAt: new Date() } });
    return msg;
  }
}

/** Same as `npm run import`, run on the server with the CJ key saved in Vercel. */
export async function importFromCj() {
  await requireAdmin();
  if (!cjConfigured()) back("/admin/products", "Add CJ_API_KEY in Vercel → Settings → Environment Variables, redeploy, then try again.");
  const msg = await withRunLog(
    "import",
    (log) => importProducts({ log }),
    (r) => `Imported ${r.imported} of ${r.total} products from CJ.${r.removedDemo ? ` Removed ${r.removedDemo} demo products.` : ""} Check each one below.`,
  );
  updateTag("products");
  back("/admin/products", msg);
}

/** Test mode only: fill an empty shop with clearly-labelled demo products. */
export async function loadDemoProducts() {
  await requireAdmin();
  if (isLive()) back("/admin/products", "Demo products are disabled in live mode.");
  const n = await seedDemoProducts({ log: () => {} });
  updateTag("products");
  back("/admin/products", n ? `Loaded ${n} demo products.` : "Real products exist, so demo products were not added.");
}

/** Same as `npm run discover` (smaller batch, to fit in one request). */
export async function discoverTrending() {
  await requireAdmin();
  if (!cjConfigured()) back("/admin/sourcing", "Add CJ_API_KEY in Vercel → Settings → Environment Variables, redeploy, then try again.");
  const msg = await withRunLog(
    "discover",
    (log) => discoverProducts({ limit: 10, log }),
    (r) => `Searched CJ: ${r.eligible} eligible products found, ${r.saved} added to the sourcing database with photos, videos and costs.`,
  );
  back("/admin/sourcing", msg);
}

/**
 * Imports a batch of trending products from CJ with AI-written copy and
 * publishes them (marked HOT). About 10–12 per run; run again for more.
 */
export async function importTrending() {
  await requireAdmin();
  if (!cjConfigured()) back("/admin/products", "Add CJ_API_KEY in Vercel → Settings → Environment Variables, redeploy, then try again.");
  if (!aiConfigured()) back("/admin/products", "Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables (needed to write product descriptions), redeploy, then try again.");
  const msg = await withRunLog(
    "trending",
    (log) => importTrendingProducts({ limit: 12, log }),
    (r) =>
      `Published ${r.published} trending product(s)${r.titles.length ? `: ${r.titles.slice(0, 6).join(", ")}${r.titles.length > 6 ? "…" : ""}` : ""}. ` +
      `${r.rejected} screened out, ${r.skipped} not shippable, ${r.failed} failed. Run again for more.`,
  );
  updateTag("products");
  back("/admin/products", msg);
}

/** Collect trending products into the sourcing database (no copy written). */
export async function collectTrending() {
  await requireAdmin();
  if (!cjConfigured()) back("/admin/sourcing", "Add CJ_API_KEY in Vercel first.");
  const msg = await withRunLog(
    "collect",
    (log) => collectTrendingCandidates({ limit: 30, log }),
    (r) => `Collected ${r.saved} trending products into the sourcing database (${r.found} found). Run again for more.`,
  );
  back("/admin/sourcing", msg);
}

const bulkSchema = z.array(
  z.union([
    z.object({ cjProductId: z.string().min(1), reject: z.string().min(1) }),
    z.object({
      cjProductId: z.string().min(1),
      category: z.enum(store.categories.map((c) => c.slug) as [string, ...string[]]),
      title: z.string().trim().min(3).max(80),
      summary: z.string().trim().min(10).max(160),
      description: z.string().trim().min(40).max(4000),
      bullets: z.array(z.string().trim().min(2)).min(2).max(6),
    }),
  ]),
);

/**
 * Bulk publish: JSON array of { cjProductId, category, title, summary,
 * description, bullets } (or { cjProductId, reject }) — our own copy for
 * products found on CJ. Fetches fresh price, stock and shipping for each and
 * publishes it marked HOT. Stops before the time limit; re-submit the rest.
 */
export async function bulkPublish(formData: FormData) {
  await requireAdmin();
  let items: z.infer<typeof bulkSchema>;
  try {
    const parsed = bulkSchema.safeParse(JSON.parse(String(formData.get("json") ?? "[]")));
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; "));
    items = parsed.data;
  } catch (err) {
    back("/admin/sourcing", `Bulk publish: invalid JSON — ${(err as Error).message}`);
    return;
  }
  const started = Date.now();
  const msg = await withRunLog(
    "bulk",
    async (log) => {
      const r = { published: 0, rejected: 0, failed: 0, notProcessed: [] as string[] };
      for (const item of items) {
        if (Date.now() - started > 235_000) {
          r.notProcessed.push(item.cjProductId);
          continue;
        }
        if ("reject" in item) {
          await db.sourcingCandidate.updateMany({ where: { cjProductId: item.cjProductId }, data: { status: "REJECTED", notes: item.reject } });
          r.rejected++;
          continue;
        }
        try {
          const { detail, offer, offers } = await fetchOffer(item.cjProductId);
          if (!offer) throw new Error("no stock that ships to the UK any more");
          const videos = await fetchVideos(item.cjProductId);
          const product = await saveProduct({
            content: {
              key: `cj-${item.cjProductId}`,
              category: item.category as (typeof store.categories)[number]["slug"],
              searchTerms: [],
              match: { all: [] },
              title: item.title,
              summary: item.summary,
              description: item.description,
              bullets: item.bullets,
            },
            detail,
            offer,
            offers,
            videos,
          });
          await db.product.update({ where: { id: product.id }, data: { isTrending: true } });
          await db.sourcingCandidate.updateMany({
            where: { cjProductId: item.cjProductId },
            data: { status: "PUBLISHED", productId: product.id },
          });
          r.published++;
          log(`  ✓ ${product.title}`);
        } catch (err) {
          r.failed++;
          log(`  ✗ ${item.cjProductId}: ${(err as Error).message}`);
        }
      }
      return r;
    },
    (r) =>
      `Bulk publish: ${r.published} published, ${r.rejected} rejected, ${r.failed} failed` +
      (r.notProcessed.length ? `, ${r.notProcessed.length} not processed (time limit) — submit them again.` : "."),
  );
  updateTag("products");
  back("/admin/sourcing", msg);
}

/** Search CJ for a keyword and add the best listings to the sourcing database. */
export async function searchCj(formData: FormData) {
  await requireAdmin();
  const keyword = String(formData.get("keyword") ?? "").trim().slice(0, 80);
  if (keyword.length < 2) back("/admin/sourcing", "Type what you're looking for, e.g. “silicone air fryer liner”.");
  if (!cjConfigured()) back("/admin/sourcing", "Add CJ_API_KEY in Vercel → Settings → Environment Variables, redeploy, then try again.");
  const msg = await withRunLog(
    "search",
    (log) => searchToSourcing(keyword, { limit: 8, log }),
    (r) => `“${keyword}”: ${r.found} listings found on CJ, ${r.saved} added below (UK/EU stock first).`,
  );
  back(`/admin/sourcing`, msg);
}

/**
 * Use a sourcing candidate as one of the core products (keeps our own copy for
 * that product) and pin it, so future imports keep this exact CJ listing.
 */
export async function useForCoreProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const key = String(formData.get("contentKey"));
  const content = contentByKey(key);
  if (!content) back("/admin/sourcing", "Choose which product this listing should be.");
  const candidate = await db.sourcingCandidate.findUniqueOrThrow({ where: { id } });
  let msg: string;
  try {
    const { detail, offer, offers } = await fetchOffer(candidate.cjProductId);
    if (!offer) throw new Error("No in-stock variant ships to the UK any more.");
    const videos = await fetchVideos(candidate.cjProductId);
    const product = await saveProduct({ content: content!, detail, offer, offers, videos });
    const pinKey = `${PIN_PREFIX}${key}`;
    await db.setting.upsert({
      where: { key: pinKey },
      create: { key: pinKey, value: candidate.cjProductId },
      update: { value: candidate.cjProductId },
    });
    await db.sourcingCandidate.update({ where: { id }, data: { status: "PUBLISHED", productId: product.id } });
    if (candidate.source === "trending") await db.product.update({ where: { id: product.id }, data: { isTrending: true } });
    msg = `“${product.title}” now uses this CJ listing (${product.isAddOn ? "add-on" : "main product"}, ${formatGBP(product.pricePence)}).`;
  } catch (err) {
    msg = `Couldn't use this listing: ${(err as Error).message}`;
  }
  updateTag("products");
  back("/admin/sourcing", msg);
}

/** Show or remove the "HOT" badge / Trending strip for a product. */
export async function setTrending(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isTrending = formData.get("trending") === "true";
  await db.product.update({ where: { id }, data: { isTrending } });
  updateTag("products");
  back("/admin/products", isTrending ? "Marked as trending (HOT badge shown)." : "Removed from trending.");
}

export async function setPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const published = formData.get("published") === "true";
  await db.product.update({ where: { id }, data: { published } });
  updateTag("products");
  back("/admin/products", published ? "Product is now visible in the shop." : "Product hidden from the shop.");
}

// ── orders ──────────────────────────────────────────────────────────────────
export async function retryOrder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  let msg: string;
  try {
    const result = await retryCjSubmission(id);
    msg = result === "sent" ? "Order sent to CJ." : "Still failing — see the reason on the order.";
  } catch (err) {
    msg = (err as Error).message;
  }
  back("/admin", msg);
}

const MANUAL_STATUSES = ["CANCELLED", "REFUNDED", "SENT_TO_CJ", "SHIPPED", "DELIVERED"];

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!MANUAL_STATUSES.includes(status)) back("/admin", "Invalid status.");
  await db.order.update({ where: { id }, data: { status, ...(status !== "NEEDS_ATTENTION" ? { attentionReason: null } : {}) } });
  back("/admin", `Order marked ${status.toLowerCase().replace(/_/g, " ")}.`);
}

/**
 * Full refund through Stripe. Requires ticking the confirmation box. Remember
 * to cancel the CJ order in your CJ dashboard if it hasn't shipped yet.
 */
export async function refundOrder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (formData.get("confirm") !== "yes") back("/admin", "Tick the confirmation box to refund.");
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  if (!order.stripePaymentIntentId) back("/admin", "This order has no Stripe payment to refund.");
  const remaining = order.totalPence - order.refundedPence;
  if (remaining <= 0) back("/admin", "This order has already been fully refunded.");
  let msg: string;
  try {
    await getStripe().refunds.create(
      { payment_intent: order.stripePaymentIntentId!, amount: remaining, reason: "requested_by_customer", metadata: { orderNumber: order.number } },
      { idempotencyKey: `refund_${order.id}_${remaining}` },
    );
    await db.order.update({ where: { id }, data: { status: "REFUNDED", refundedPence: order.totalPence, attentionReason: null } });
    msg = `Refunded ${formatMoney(remaining, marketConfig(order.market))} for ${order.number}. If CJ hasn't shipped it, cancel the CJ order in your CJ dashboard.`;
  } catch (err) {
    msg = `Refund failed: ${(err as Error).message}`;
  }
  back("/admin", msg);
}

export async function runTrackingNow() {
  await requireAdmin();
  const r = await checkTracking();
  back("/admin", `Tracking checked: ${r.checked} order(s), ${r.shipped} newly shipped, ${r.emailed} email(s) sent.${r.problems.length ? ` Problems: ${r.problems.join("; ")}` : ""}`);
}

/**
 * TEST MODE ONLY: walks a CJ sandbox order through payment → shipped with a
 * fake tracking number, so you can test the tracking email end to end.
 */
export async function simulateSandboxShipment(formData: FormData) {
  await requireAdmin();
  if (isLive()) back("/admin", "Sandbox simulation is disabled in live mode.");
  const id = String(formData.get("id"));
  const shipments = await db.cjShipment.findMany({ where: { orderId: id, isSandbox: true, cjOrderId: { not: null } } });
  if (shipments.length === 0) back("/admin", "No sandbox CJ orders on this order.");
  const notes: string[] = [];
  for (const s of shipments) {
    const step = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        notes.push(`${name}: ${(err as Error).message}`);
      }
    };
    await step("pay", () => cj.sandboxSimulatePay(s.cjOrderId!));
    await step("unshipped", () => cj.sandboxUpdateStatus(s.cjOrderId!, 400));
    await step("tracking", () => cj.sandboxUpdateTrackNumber(s.cjOrderId!, `SBX${Date.now().toString().slice(-9)}`));
    await step("shipped", () => cj.sandboxUpdateStatus(s.cjOrderId!, 500));
  }
  const r = await checkTracking();
  back("/admin", `Sandbox shipment simulated; ${r.emailed} shipping email(s) sent.${notes.length ? ` Notes: ${notes.join("; ")}` : ""}`);
}

// ── sourcing ────────────────────────────────────────────────────────────────
export async function setCandidateStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["NEW", "APPROVED", "REJECTED"].includes(status)) back("/admin/sourcing", "Invalid status.");
  await db.sourcingCandidate.update({ where: { id }, data: { status } });
  back("/admin/sourcing", `Marked ${status.toLowerCase()}.`);
}

const publishSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(10).max(160),
  description: z.string().trim().min(40).max(4000),
  bullets: z.string().trim().min(3).max(1000),
  category: z.enum(store.categories.map((c) => c.slug) as [string, ...string[]]),
});

/**
 * Publishes a sourcing candidate to the shop with YOUR title and description.
 * Fetches fresh price/stock/shipping from CJ first.
 */
export async function publishCandidate(formData: FormData) {
  await requireAdmin();
  const parsed = publishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    back("/admin/sourcing", `Please complete every field: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    return;
  }
  const f = parsed.data;
  const candidate = await db.sourcingCandidate.findUniqueOrThrow({ where: { id: f.id } });
  let msg: string;
  try {
    const { detail, offer, offers } = await fetchOffer(candidate.cjProductId);
    if (!offer) throw new Error("No in-stock variant ships to the UK any more.");
    const videos = await fetchVideos(candidate.cjProductId);
    const product = await saveProduct({
      content: {
        key: `cj-${candidate.cjProductId}`,
        category: f.category as (typeof store.categories)[number]["slug"],
        searchTerms: [],
        match: { all: [] },
        title: f.title,
        summary: f.summary,
        description: f.description,
        bullets: f.bullets.split("\n").map((b) => b.trim()).filter(Boolean),
      },
      detail,
      offer,
      offers,
      videos,
    });
    await db.sourcingCandidate.update({ where: { id: f.id }, data: { status: "PUBLISHED", productId: product.id } });
    if (candidate.source === "trending") await db.product.update({ where: { id: product.id }, data: { isTrending: true } });
    msg = `Published “${product.title}”${product.isAddOn ? " (as an add-on — profit below threshold)" : ""}.`;
  } catch (err) {
    msg = `Publish failed: ${(err as Error).message}`;
  }
  updateTag("products");
  back("/admin/sourcing", msg);
}
