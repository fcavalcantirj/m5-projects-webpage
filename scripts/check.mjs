// Gate for the page: node scripts/check.mjs [--offline]. No dependencies.
// Checks the data, that index.html is fresh from it, the images, the headers, and (unless --offline)
// that every outbound link answers 2xx/3xx.
import { readFileSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const failures = [];
const fail = (msg) => failures.push(msg);
const offline = process.argv.includes("--offline");

const { site, projects } = JSON.parse(read("projects.json"));
const html = read("index.html");

// 1. The data.
const ids = new Set();
for (const p of projects) {
  for (const key of ["id", "name", "kicker", "tagline", "description", "status", "statusLabel", "size"])
    if (!p[key]) fail(`${p.id ?? "?"}: missing ${key}`);
  if (ids.has(p.id)) fail(`${p.id}: duplicate id`);
  ids.add(p.id);
  if (!["live", "open", "building"].includes(p.status)) fail(`${p.id}: unknown status ${p.status}`);
  if (p.status === "building" && p.links.length) fail(`${p.id}: under construction but has links`);
  if (p.status !== "building" && !p.links.length) fail(`${p.id}: no link`);
  if (p.status === "live" && !p.links.some((l) => l.kind === "site")) fail(`${p.id}: live without a site link`);
  for (const l of p.links) if (!/^https:\/\//.test(l.href)) fail(`${p.id}: link is not https: ${l.href}`);
  if (/colibrino|casa-viva|pense-bem-wars|pense-bem-esp32/i.test(JSON.stringify(p))) fail(`${p.id}: names a project the owner left out`);
  if (!html.includes(`id="t-${p.id}"`)) fail(`${p.id}: not in index.html`);
}
if (/colibrino|casa-viva|pense-bem-wars|pense-bem-esp32/i.test(html)) fail("index.html names a project the owner left out");

// 2. index.html is what scripts/build.mjs makes from the data now.
const before = html;
execFileSync(process.execPath, [new URL("build.mjs", import.meta.url).pathname], { stdio: "ignore" });
if (read("index.html") !== before) fail("index.html was stale: run node scripts/build.mjs and commit it");

// 3. The page.
const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
if (h1 !== 1) fail(`expected one <h1>, found ${h1}`);
if (!/<html lang="en">/.test(html)) fail("no lang on <html>");
if (/ style="/.test(html)) fail("inline style attribute (blocked by the CSP)");
if (/<script(?![^>]*(src="\/|type="application\/ld\+json"))/.test(html)) fail("inline script (blocked by the CSP)");
try {
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
} catch (e) {
  fail(`JSON-LD does not parse: ${e.message}`);
}
for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
  if (!/\balt="[^"]+"/.test(tag)) fail(`img without alt: ${tag}`);
  if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) fail(`img without width/height: ${tag}`);
}
const local = [...html.matchAll(/(?:src|href|poster|content)="(?:https:\/\/m5-projects\.vercel\.app)?\/([^"#?]+\.(?:webp|mp4|jpg|png|svg|css|js|txt|xml))"/g)].map((m) => m[1]);
for (const path of new Set(local)) {
  if (path.startsWith("_vercel/")) continue;
  if (!existsSync(new URL(path, root))) fail(`missing file: ${path}`);
  else if (path.startsWith("img/") && statSync(new URL(path, root)).size > 300_000) fail(`${path} is over 300 KB`);
}
if (!local.includes("og.jpg")) fail("no og:image");

// 4. Headers: the CSP names no outside origin.
const vercel = JSON.parse(read("vercel.json"));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value ?? "";
if (!csp) fail("no Content-Security-Policy in vercel.json");
if (/https?:|\*|'unsafe-/.test(csp)) fail(`CSP allows more than the site itself: ${csp}`);

// 5. Outbound links answer (live).
if (!offline) {
  const hrefs = [...new Set([site.github, ...projects.flatMap((p) => p.links.map((l) => l.href))])];
  await Promise.all(
    hrefs.map(async (href) => {
      try {
        const res = await fetch(href, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "m5-projects-link-check" } });
        if (res.status >= 400) fail(`${href} answered ${res.status}`);
      } catch (e) {
        fail(`${href}: ${e.message}`);
      }
    }),
  );
}

if (failures.length) {
  console.error(`check: ${failures.length} failure(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`check: ok (${projects.length} projects${offline ? ", links not fetched" : ", all links answer"})`);
