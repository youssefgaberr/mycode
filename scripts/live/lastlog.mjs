// Print the latest sourcing run log (collect / bulk publish / search).
import { base, login } from "./lib.mjs";

const { browser, page } = await login();
await page.goto(`${base}/admin/sourcing`, { waitUntil: "domcontentloaded" });
console.log((await page.locator("details pre").allTextContents()).join("\n-----\n"));
await browser.close();
