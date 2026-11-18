import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatGBP } from "@/lib/pricing";
import { categoryName, store, warehouseLabels } from "@/config/store";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash, btn, btnPrimary } from "@/components/admin/ui";
import { importFromCj, loadDemoProducts, resyncFromCj, setPublished, setTrending } from "../actions";
import { isLive } from "@/lib/env";

export const maxDuration = 300;

const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

async function Products({ searchParams }: Pick<PageProps<"/admin/products">, "searchParams">) {
  await requireAdmin();
  const { msg } = await searchParams;
  const [products, lastSync] = await Promise.all([
    db.product.findMany({
      include: { variants: { where: { active: true } }, images: { take: 1, orderBy: { position: "asc" } }, videos: true },
      orderBy: [{ isAddOn: "asc" }, { createdAt: "asc" }],
    }),
    db.syncLog.findFirst({ where: { kind: { in: ["sync", "admin-import"] } }, orderBy: { startedAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold">Products</h1>
        {!isLive() && (
          <form action={loadDemoProducts}>
            <SubmitButton className={btn} pendingText="Loading…">Load demo products</SubmitButton>
          </form>
        )}
        <form action={importFromCj}>
          <SubmitButton className={btn} pendingText="Importing from CJ… (1–3 min)">Import products from CJ</SubmitButton>
        </form>
        <form action={resyncFromCj}>
          <SubmitButton className={btnPrimary} pendingText="Re-syncing… (1–2 min)">Re-sync prices &amp; stock from CJ</SubmitButton>
        </form>
      </div>
      {!(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN) && (
        <p className="rounded-lg border border-danger p-3 text-sm">
          <strong>CJ isn&apos;t connected.</strong> Add <code>CJ_API_KEY</code> in Vercel → your project → Settings →
          Environment Variables, then redeploy. Import, re-sync and order automation need it.
        </p>
      )}
      <p className="text-sm text-muted">
        <strong>Import products from CJ</strong> finds the best CJ match for each product in your content file (takes 1–3
        minutes; keep this page open). It replaces any demo products.
      </p>
      <p className="text-sm text-muted">
        Re-sync fetches current supplier prices, stock and UK shipping from CJ, recalculates shop prices
        (×{store.pricing.markup}, .99, min £{store.pricing.minimumPrice}), and hides products that are out of stock (they
        reappear automatically when stock returns). It also runs daily.{" "}
        {lastSync && `Last run: ${dt.format(lastSync.startedAt)} — ${lastSync.ok ? "OK" : "had problems"}.`}
      </p>
      {lastSync?.summary && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Last sync / import log</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3">{lastSync.summary}</pre>
        </details>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              {["Product", "Shop price", "Cost + UK ship", "Est. profit*", "Type", "Warehouse / delivery", "Stock", "Visible", ""].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap p-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted">
                  No products yet. Use “Import products from CJ”{!isLive() && " or “Load demo products”"} above.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              const visible = p.published && p.inStock && p.variants.length > 0;
              return (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="max-w-xs p-2">
                    <Link href={`/products/${p.slug}`} className="font-semibold hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted">{categoryName(p.category)}</p>
                    <p className="text-xs text-muted" title="CJ's original name — check it matches your copy">
                      CJ: {p.cjName ?? "—"} <span className="font-mono">({p.cjProductId})</span>
                    </p>
                    <p className="text-xs text-muted">
                      {p.variants.length} variant(s), {p.videos.length} video(s)
                      {p.isDemo && <strong className="ml-1 text-accent-fg">DEMO</strong>}
                      {p.isTrending && <strong className="ml-1 text-danger">HOT</strong>}
                    </p>
                  </td>
                  <td className="p-2 tabular-nums">{formatGBP(p.pricePence)}</td>
                  <td className="p-2 tabular-nums">
                    {formatGBP(p.supplierCostPence)} + {formatGBP(p.shippingCostPence)}
                  </td>
                  <td className={`p-2 tabular-nums ${p.estProfitPence < 0 ? "text-danger" : ""}`}>{formatGBP(p.estProfitPence)}</td>
                  <td className="p-2 text-xs">{p.isAddOn ? "Add-on only" : "Main"}</td>
                  <td className="p-2 text-xs">
                    {warehouseLabels[p.warehouseCountry] ?? p.warehouseCountry}
                    <br />
                    {p.logisticName} · {p.deliveryMinDays ?? "?"}–{p.deliveryMaxDays ?? "?"} days
                  </td>
                  <td className="p-2 tabular-nums">{p.inStock ? stock : <span className="text-danger">Out</span>}</td>
                  <td className="p-2">{visible ? "Yes" : "No"}</td>
                  <td className="space-y-1 p-2">
                    <form action={setTrending}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="trending" value={String(!p.isTrending)} />
                      <button className={btn}>{p.isTrending ? "Un-mark HOT" : "Mark HOT"}</button>
                    </form>
                    <form action={setPublished}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="published" value={String(!p.published)} />
                      <button className={btn}>{p.published ? "Hide" : "Publish"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        *Estimated profit for a single-item order: price ex VAT − cost − UK shipping − Stripe fee − £{store.pricing.adCostPerOrder} ad
        cost. Below £{store.pricing.addOnProfitThreshold} → shown only in &quot;Complete your order&quot;.
      </p>
    </div>
  );
}

export default function AdminProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
      <Products searchParams={props.searchParams} />
    </Suspense>
  );
}
