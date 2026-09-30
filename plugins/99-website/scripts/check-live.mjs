#!/usr/bin/env node
// After a deploy: every sitemap URL answers 200, canonicals point at the live host, noindex is what we chose,
// and the form endpoint exists (an empty POST must answer 400, not 404 or 405).
//   node check-live.mjs sites/<slug> https://<host>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { decode } from "./lib/html.mjs";

export const sitemapUrls = (xml) => [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => decode(m[1].trim()));

export function checkLivePage({ url, status, html, expectNoindex, host }) {
  const f = [];
  if (status !== 200) return [`${url}: HTTP ${status}`];
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1] || "";
  let canonHost = "";
  try { canonHost = new URL(canon).host; } catch {}
  if (canonHost !== host) f.push(`${url}: canonical "${canon}" is not on ${host}`);
  const hasNoindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  if (hasNoindex !== expectNoindex) f.push(`${url}: ${expectNoindex ? "noindex missing (staging must stay out of Google)" : "noindex present on a live launch"}`);
  return f;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [siteDir, base] = process.argv.slice(2);
  if (!siteDir || !base) { console.error("usage: node check-live.mjs sites/<slug> https://<host>"); process.exit(1); }
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const host = new URL(base).host;
  const failures = [];
  const sm = await fetch(new URL("/sitemap.xml", base));
  const urls = sm.ok ? sitemapUrls(await sm.text()) : [];
  if (!sm.ok) failures.push(`sitemap.xml: HTTP ${sm.status}`);
  if (urls.length !== site.pages.length) failures.push(`sitemap lists ${urls.length} URLs, the site has ${site.pages.length} pages`);
  for (const u of urls) {
    const live = new URL(new URL(u).pathname, base).href; // fetch on the host we deployed to, even if the sitemap names another
    const r = await fetch(live, { redirect: "manual" });
    failures.push(...checkLivePage({ url: live, status: r.status, html: r.status === 200 ? await r.text() : "", expectNoindex: site.noindex, host }));
  }
  const form = await fetch(new URL("/api/contact", base), { method: "POST", body: new URLSearchParams() });
  if (form.status !== 400) failures.push(`/api/contact: empty POST answered ${form.status} (want 400: is the Pages Function deployed?)`);
  const lines = [`# Live check: ${base}`, "", `${urls.length} URLs checked, noindex expected: ${site.noindex}`, "",
    ...(failures.length ? failures.map((f) => `- FAIL ${f}`) : ["All pass."]), ""];
  fs.mkdirSync(path.join(siteDir, "audits"), { recursive: true });
  fs.writeFileSync(path.join(siteDir, "audits/live-check.md"), lines.join("\n"));
  console.log(lines.join("\n"));
  process.exitCode = failures.length ? 1 : 0;
}
