# Pocket hardware projects

One static page that gathers fcavalcantirj's ESP32 and M5Stack projects: https://m5-projects.vercel.app

- `projects.json` is the content: one entry per card. Every sentence comes from that project's own README or site.
- `node scripts/build.mjs` writes `index.html` from `template.html` and `projects.json` (commit the result; the site has no build step on Vercel).
- `node scripts/check.mjs` is the gate: data, a fresh `index.html`, images (size, alt, width/height), the CSP, and every outbound link answering. `--offline` skips the links. CI runs it on every push.
- `scripts/og.mjs` renders the share image `og.jpg` from `scripts/og.html` (needs Playwright with Chromium).

Plain HTML, CSS and a few lines of JS, no external fonts or scripts. Vercel Web Analytics counts visits without cookies.

Code is MIT. The images are from each project and keep that project's terms.
