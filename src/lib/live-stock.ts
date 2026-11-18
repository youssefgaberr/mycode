/**
 * Live availability check at checkout: asks CJ for the current stock of each
 * basket item in the warehouse it will ship from.
 *
 * CJ allows ~1 request/second, so this checks at most a handful of items. If
 * CJ can't be reached it lets the order through (the daily sync and the order
 * step still catch problems) rather than blocking every sale during an outage.
 */
import * as cj from "@/lib/cj/client";
import { num } from "@/lib/cj/catalog";

const MAX_CHECKS = 6;

export async function liveStockProblems(
  lines: { cjVariantId: string; title: string; quantity: number; warehouseCountry: string }[],
): Promise<string[]> {
  if (!process.env.CJ_API_KEY && !process.env.CJ_ACCESS_TOKEN) return [];
  const problems: string[] = [];
  for (const line of lines.filter((l) => !l.cjVariantId.startsWith("DEMO-")).slice(0, MAX_CHECKS)) {
    try {
      const stock = await cj.getStockByVid(line.cjVariantId);
      const here = stock.find((s) => s.countryCode === line.warehouseCountry);
      if (!here || num(here.totalInventoryNum) < line.quantity) problems.push(line.title);
    } catch (err) {
      console.warn(`[live-stock] couldn't check ${line.cjVariantId}: ${(err as Error).message}`);
      return problems; // fail open: don't block checkout because CJ is unreachable
    }
  }
  return problems;
}
