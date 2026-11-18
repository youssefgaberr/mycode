import { db } from "@/lib/db";
import { isAuthorisedCron } from "@/lib/cron";
import { checkTracking } from "@/lib/orders";

export const maxDuration = 300;

/** Runs on the schedule in vercel.json (daily on Vercel Hobby): CJ status + tracking, shipped emails. */
export async function GET(request: Request) {
  if (!isAuthorisedCron(request)) return new Response("Unauthorised", { status: 401 });
  const log = await db.syncLog.create({ data: { kind: "tracking" } });
  try {
    const result = await checkTracking();
    await db.syncLog.update({
      where: { id: log.id },
      data: { ok: result.problems.length === 0, summary: JSON.stringify(result), finishedAt: new Date() },
    });
    return Response.json(result);
  } catch (err) {
    await db.syncLog.update({
      where: { id: log.id },
      data: { ok: false, summary: (err as Error).message, finishedAt: new Date() },
    });
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
