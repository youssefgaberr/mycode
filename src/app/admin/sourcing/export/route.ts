import { connection } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/** Admin-only: candidate data (supplier details) for writing product copy. */
export async function GET(request: Request) {
  await connection();
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });
  const status = new URL(request.url).searchParams.get("status") ?? "NEW";
  const rows = await db.sourcingCandidate.findMany({ where: { status }, orderBy: { discoveredAt: "asc" } });
  return Response.json(
    rows.map((c) => ({
      cjProductId: c.cjProductId,
      categoryHint: c.matchedKeyword,
      cjName: c.cjName,
      cjCategory: c.cjCategory,
      supplierCostUsd: c.supplierCostUsd,
      ukPriceMinor: c.estPricePence,
      ukProfitMinor: c.estProfitPence,
      warehouse: c.warehouseCountry,
      delivery: [c.deliveryMinDays, c.deliveryMaxDays],
      photos: JSON.parse(c.images).length,
      videos: JSON.parse(c.videos).length,
      info: JSON.parse(c.info),
    })),
  );
}
