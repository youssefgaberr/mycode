// Shared helpers for driving the LIVE admin (/admin) from the command line with
// Playwright. Nothing here contains secrets: the admin password comes from the
// ADMIN_PASSWORD environment variable.
//
//   ADMIN_PASSWORD=... node scripts/live/count.mjs
//
// Optional: BRIGHTPAN_URL (default https://brightpan.vercel.app).
// Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
// on your own computer; Claude Code cloud sessions already have it).
import { createRequire } from "node:module";

// require() also finds a globally installed Playwright (NODE_PATH), unlike import.
const { chromium } = createRequire(import.meta.url)("playwright");

export const base = (process.env.BRIGHTPAN_URL ?? "https://brightpan.vercel.app").replace(/\/$/, "");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function login() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Set ADMIN_PASSWORD (the live admin password) first.");
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch(proxy ? { proxy } : {});
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(340_000); // admin actions can run for up to ~4 minutes
  await page.goto(`${base}/admin/login`);
  await page.fill("#password", password);
  await page.click('button:has-text("Log in")');
  await page.waitForURL(`${base}/admin`);
  return { browser, ctx, page };
}

/** Sourcing candidates by status (NEW, APPROVED, REJECTED, PUBLISHED). */
export async function exportCandidates(ctx, status = "NEW") {
  const res = await ctx.request.get(`${base}/admin/sourcing/export?status=${status}`);
  if (!res.ok()) throw new Error(`export failed: HTTP ${res.status()}`);
  return res.json();
}

/** Submit a bulk-publish JSON array; returns the flash message. */
export async function bulkPublish(page, items) {
  await page.goto(`${base}/admin/sourcing`, { waitUntil: "domcontentloaded" });
  await page.click('summary:has-text("Bulk publish")');
  await page.fill("textarea[name=json]", JSON.stringify(items));
  await page.click('button:has-text("Publish all")');
  await page.waitForURL(/msg=/);
  return page.locator("p[role=status]").innerText();
}
