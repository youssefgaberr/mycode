// Save candidates (default status NEW) to a JSON file for writing copy.
//   node scripts/live/export.mjs NEW data/candidates.json
import { writeFileSync } from "node:fs";
import { exportCandidates, login } from "./lib.mjs";

const status = process.argv[2] ?? "NEW";
const out = process.argv[3] ?? "data/candidates.json";
const { browser, ctx } = await login();
const rows = await exportCandidates(ctx, status);
writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`saved ${rows.length} ${status} candidates to ${out}`);
await browser.close();
