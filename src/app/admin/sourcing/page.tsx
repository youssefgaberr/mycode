import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatGBP } from "@/lib/pricing";
import { store, warehouseLabels } from "@/config/store";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash, StatusBadge, btn, btnPrimary } from "@/components/admin/ui";
import { discoverTrending, publishCandidate, setCandidateStatus } from "../actions";

export const maxDuration = 300;

const parse = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const FILTERS = ["NEW", "APPROVED", "PUBLISHED", "REJECTED"] as const;

async function Sourcing({ searchParams }: Pick<PageProps<"/admin/sourcing">, "searchParams">) {
  await requireAdmin();
  const { msg, status } = await searchParams;
  const current = typeof status === "string" && (FILTERS as readonly string[]).includes(status) ? status : "NEW";
  const [candidates, counts] = await Promise.all([
    db.sourcingCandidate.findMany({
      where: { status: current },
      orderBy: [{ isAddOn: "asc" }, { listedNum: "desc" }],
      take: 100,
    }),
    db.sourcingCandidate.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold">Sourcing database</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Real supplier products found on CJdropshipping by <code>npm run discover</code> (trending and best-selling home
          &amp; kitchen items stocked in UK/EU warehouses first). Every photo and video CJ provides is saved here.
          Approve the ones you like, then publish each with <strong>your own</strong> title and description — supplier
          text is never shown to customers.
        </p>
        </div>
        <form action={discoverTrending}>
          <SubmitButton className={btnPrimary} pendingText="Searching CJ… (2–4 min)">Discover trending products</SubmitButton>
        </form>
      </div>
      <p className="text-xs text-muted">
        Discovery searches CJ and saves up to 12 new products per run (takes 2–4 minutes; keep this page open). Run it
        again for more.
      </p>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/sourcing?status=${s}`}
            aria-current={s === current ? "page" : undefined}
            className={`${btn} ${s === current ? "border-brand bg-accent text-accent-fg" : ""}`}
          >
            {s.toLowerCase()} ({count(s)})
          </Link>
        ))}
      </nav>

      {candidates.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
          Nothing here yet. Press “Discover trending products” above (or run <code>npm run discover</code>).
        </p>
      )}

      <ul className="space-y-4">
        {candidates.map((c) => {
          const images = parse(c.images);
          const videos = parse(c.videos);
          return (
            <li key={c.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <StatusBadge status={c.status} /> · {c.source === "trending" ? "Trending on CJ" : `Best seller for “${c.matchedKeyword}”`}
                    {c.cjCategory && ` · ${c.cjCategory}`}
                  </p>
                  <h2 className="mt-1 font-bold">{c.cjName}</h2>
                  <p className="text-xs text-muted">
                    CJ product <span className="font-mono">{c.cjProductId}</span>
                    {c.cjSku && ` · SKU ${c.cjSku}`}
                    {c.supplierName && ` · supplier: ${c.supplierName}`} · listed by {c.listedNum} shops
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <dt className="text-muted">Supplier cost</dt>
                  <dd className="tabular-nums">${c.supplierCostUsd?.toFixed(2)}</dd>
                  <dt className="text-muted">UK shipping</dt>
                  <dd className="tabular-nums">${c.shippingCostUsd?.toFixed(2)}</dd>
                  <dt className="text-muted">Shop price</dt>
                  <dd className="tabular-nums font-semibold">{c.estPricePence ? formatGBP(c.estPricePence) : "—"}</dd>
                  <dt className="text-muted">Est. profit</dt>
                  <dd className={`tabular-nums ${c.isAddOn ? "text-danger" : "text-success"}`}>
                    {c.estProfitPence != null ? formatGBP(c.estProfitPence) : "—"} {c.isAddOn ? "(add-on)" : ""}
                  </dd>
                  <dt className="text-muted">Ships from</dt>
                  <dd>{warehouseLabels[c.warehouseCountry ?? ""] ?? c.warehouseCountry}</dd>
                  <dt className="text-muted">Delivery</dt>
                  <dd>
                    {c.deliveryMinDays ?? "?"}–{c.deliveryMaxDays ?? "?"} days ({c.logisticName})
                  </dd>
                  <dt className="text-muted">Variants / stock</dt>
                  <dd>
                    {c.variantCount} / {c.stock}
                  </dd>
                  <dt className="text-muted">Media</dt>
                  <dd>
                    {images.length} photos, {videos.length} videos
                  </dd>
                </dl>
              </div>

              {images.length > 0 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Supplier photos">
                  {images.map((src, i) => (
                    <li key={src} className="shrink-0">
                      <a href={src} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Supplier photo ${i + 1}`} loading="lazy" className="size-24 rounded-lg border border-border object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {videos.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Videos are saved and will play on the product page once published (CJ&apos;s video links need our proxy,
                  so they can&apos;t be previewed directly here).
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {c.status !== "APPROVED" && c.status !== "PUBLISHED" && (
                  <form action={setCandidateStatus}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button className={btn}>Approve</button>
                  </form>
                )}
                {c.status !== "REJECTED" && c.status !== "PUBLISHED" && (
                  <form action={setCandidateStatus}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button className={btn}>Reject</button>
                  </form>
                )}
                {c.status === "PUBLISHED" && c.productId && (
                  <Link href="/admin/products" className={btn}>
                    View in products
                  </Link>
                )}
              </div>

              {c.status === "APPROVED" && (
                <details className="mt-4 rounded-xl border border-border p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Publish to the shop with your own copy</summary>
                  <form action={publishCandidate} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="text-sm">
                      Title (your words)
                      <input name="title" required maxLength={80} className="mt-1 h-10 w-full rounded-lg border border-border bg-bg px-2" />
                    </label>
                    <label className="text-sm">
                      Category
                      <select name="category" className="mt-1 h-10 w-full rounded-lg border border-border bg-bg px-2">
                        {store.categories.map((cat) => (
                          <option key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm sm:col-span-2">
                      One-line summary
                      <input name="summary" required maxLength={160} className="mt-1 h-10 w-full rounded-lg border border-border bg-bg px-2" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Description (paragraphs separated by a blank line; no health/safety claims you can&apos;t back up)
                      <textarea name="description" required rows={5} className="mt-1 w-full rounded-lg border border-border bg-bg p-2" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Feature bullets (one per line)
                      <textarea name="bullets" required rows={4} className="mt-1 w-full rounded-lg border border-border bg-bg p-2" />
                    </label>
                    <div className="sm:col-span-2">
                      <SubmitButton className={btnPrimary} pendingText="Publishing…">Fetch latest CJ data &amp; publish</SubmitButton>
                    </div>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SourcingPage(props: PageProps<"/admin/sourcing">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
      <Sourcing searchParams={props.searchParams} />
    </Suspense>
  );
}
