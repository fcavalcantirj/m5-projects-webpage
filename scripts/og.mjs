// Renders og.jpg (1200x630) from scripts/og.html. Needs Playwright with Chromium:
//   PLAYWRIGHT_FROM=/path/to/a/project/with/@playwright/test node scripts/og.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const from = process.env.PLAYWRIGHT_FROM ?? process.cwd();
const { chromium } = createRequire(`${from}/package.json`)("@playwright/test");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(new URL("og.html", import.meta.url).href, { waitUntil: "networkidle" });
await page.screenshot({ path: fileURLToPath(new URL("../og.jpg", import.meta.url)), type: "jpeg", quality: 85 });
await browser.close();
console.log("og.jpg written");
