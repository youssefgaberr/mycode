// How many products are live, and how many candidates are waiting.
import { base, exportCandidates, login } from "./lib.mjs";

const { browser, ctx, page } = await login();
await page.goto(`${base}/shop`, { waitUntil: "domcontentloaded" });
const links = await page.$$eval('a[href^="/products/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
console.log("Products shown in /shop:", links.length);
for (const status of ["NEW", "PUBLISHED", "REJECTED"]) {
  console.log(`Candidates ${status}:`, (await exportCandidates(ctx, status)).length);
}
await browser.close();
