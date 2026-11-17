import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { isAuthorisedCron } from "@/lib/cron";
import { syncCatalog } from "@/lib/cj/catalog";

export const maxDuration = 300;

/** Runs daily (see vercel.json): re-sync prices and stock, hide out-of-stock products. */
export async function GET(request: Request) {
  if (!isAuthorisedCron(request)) return new Response("Unauthorised", { status: 401 });
  const log = await db.syncLog.create({ data: { kind: "sync" } });
  const lines: string[] = [];
  try {
    const r = await syncCatalog((s) => lines.push(s));
    revalidateTag("products", "max");
    await db.syncLog.update({
      where: { id: log.id },
      data: {
        ok: r.failed === 0,
        summary: `updated ${r.updated}, hidden ${r.hidden}, failed ${r.failed}\n${lines.join("\n")}`,
        finishedAt: new Date(),
      },
    });
    return Response.json(r);
  } catch (err) {
    await db.syncLog.update({ where: { id: log.id }, data: { ok: false, summary: (err as Error).message, finishedAt: new Date() } });
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
