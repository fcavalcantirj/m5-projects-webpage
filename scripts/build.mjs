// Writes index.html from template.html and projects.json. Run by hand (node scripts/build.mjs);
// the output is committed, so the deployed site needs no build step.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const { site, projects } = JSON.parse(read("projects.json"));

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Visible card text: "Wi-Fi" never breaks at its hyphen (U+2011). Metadata keeps the plain spelling.
const esc = (s) => escape(String(s).replaceAll("Wi-Fi", "Wi\u2011Fi"));

const icons = {
  site: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 3 13"/></svg>',
  code: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4"/></svg>',
  doc: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h5l3 3v9H4zM9 2v3h3"/></svg>',
};

function media(p) {
  const m = p.media;
  if (m.type === "image")
    return `<figure class="media fit-${m.fit}"><img src="/${m.src}" width="${m.width}" height="${m.height}" alt="${esc(m.alt)}" loading="${p.size === "xl" ? "eager" : "lazy"}" decoding="async"></figure>`;
  if (m.type === "video")
    return `<figure class="media fit-${m.fit ?? "cover"}"><video src="/${m.src}" poster="/${m.poster}" width="${m.width}" height="${m.height}" muted loop playsinline preload="none" aria-label="${esc(m.alt)}" data-autoplay></video></figure>`;
  if (m.type === "stackfall")
    return `<figure class="media art-stackfall" aria-hidden="true"><div class="well">${Array.from({ length: 4 }, (_, i) => `<span class="piece p${i + 1}"></span>`).join("")}<span class="floor"></span></div></figure>`;
  if (m.type === "atlas")
    return `<figure class="media art-atlas" aria-hidden="true"><div class="layer l3"><b>Board</b><i>dev kits · M5Stack · LilyGO</i></div><div class="layer l2"><b>Module</b><i>WROOM · PICO · MINI</i></div><div class="layer l1"><b>SoC</b><i>ESP32 · S3 · C3 · C6 · P4</i></div></figure>`;
  return `<figure class="media art-tape" aria-hidden="true"><span>Under construction</span></figure>`;
}

function card(p) {
  const links = p.links
    .map(
      (l) =>
        `<a class="btn btn-${l.kind}" href="${esc(l.href)}" target="_blank" rel="noopener">${icons[l.kind] ?? ""}<span>${esc(l.label)}</span><span class="sr"> (${esc(p.name)}, opens in a new tab)</span></a>`,
    )
    .join("");
  const badges = p.badges.map((b) => `<li>${esc(b)}</li>`).join("");
  return `    <article class="card size-${p.size} accent-${p.id} status-${p.status}" aria-labelledby="t-${p.id}">
      ${media(p)}
      <div class="body">
        <p class="kicker"><span class="dot" aria-hidden="true"></span>${esc(p.kicker)}<span class="status">${esc(p.statusLabel)}</span></p>
        <h2 id="t-${p.id}">${esc(p.name)}</h2>
        <p class="tagline">${esc(p.tagline)}</p>
        <p class="desc">${esc(p.description)}</p>
        ${badges ? `<ul class="badges" aria-label="Details">${badges}</ul>` : ""}
        ${links ? `<div class="links">${links}</div>` : ""}
      </div>
    </article>`;
}

const jsonld = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: site.title,
  url: `${site.url}/`,
  description: site.description,
  author: { "@type": "Person", alternateName: site.handle, url: site.github },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: projects
      .filter((p) => p.links.length)
      .map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        description: p.tagline,
        url: (p.links.find((l) => l.kind === "site") ?? p.links[0]).href,
      })),
  },
};

const values = {
  ...site,
  title: escape(site.title),
  description: escape(site.description),
  jsonld: JSON.stringify(jsonld).replace(/</g, "\\u003c"),
  cards: projects.map(card).join("\n"),
  liveCount: projects.filter((p) => p.status !== "building").length,
  buildingCount: projects.filter((p) => p.status === "building").length,
};
const html = read("template.html").replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in values)) throw new Error(`template: no value for {{${k}}}`);
  return String(values[k]);
});
writeFileSync(new URL("index.html", root), html);
console.log(`index.html: ${projects.length} cards, ${html.length} bytes`);
