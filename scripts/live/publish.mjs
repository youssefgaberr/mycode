// Publish a copy file (see data/pending-publish.json) to the live shop, a batch
// at a time. Skips anything already PUBLISHED or REJECTED, and when CJ's API
// points run out it waits 20 minutes and carries on. Safe to stop and re-run.
//   node scripts/live/publish.mjs data/pending-publish.json [batchSize]
import { readFileSync } from "node:fs";
import { bulkPublish, exportCandidates, login, sleep } from "./lib.mjs";

const file = process.argv[2] ?? "data/pending-publish.json";
const per = Number(process.argv[3] ?? 12);
const all = JSON.parse(readFileSync(file, "utf8"));

for (let round = 1; round <= 60; round++) {
  const { browser, ctx, page } = await login();
  const done = new Set(
    [...(await exportCandidates(ctx, "PUBLISHED")), ...(await exportCandidates(ctx, "REJECTED"))].map((c) => c.cjProductId),
  );
  const left = all.filter((x) => !done.has(x.cjProductId));
  console.log(new Date().toISOString(), `round ${round}: ${left.length} left`);
  if (left.length === 0) {
    await browser.close();
    break;
  }
  const batch = [...left.filter((x) => x.reject), ...left.filter((x) => !x.reject).slice(0, per)];
  const msg = await bulkPublish(page, batch);
  console.log("  ", msg.slice(0, 240));
  await browser.close();
  if (/points used up|Insufficient API points/.test(msg)) await sleep(20 * 60 * 1000);
}
