// Run "Collect trending" N times (default 1). Each run ≈ 4 min and ≈ 4,000 CJ API points.
import { base, login } from "./lib.mjs";

const runs = Number(process.argv[2] ?? 1);
const { browser, page } = await login();
for (let i = 1; i <= runs; i++) {
  await page.goto(`${base}/admin/sourcing`, { waitUntil: "domcontentloaded" });
  await page.click('button:has-text("Collect trending")');
  await page.waitForURL(/msg=/);
  console.log(`run ${i}:`, await page.locator("p[role=status]").innerText());
}
await browser.close();
