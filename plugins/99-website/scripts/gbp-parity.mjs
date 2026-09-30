#!/usr/bin/env node
// Does the Google Business Profile describe the same business as the site? Read-only: it proposes fixes, never sends them.
// The address is never compared or changed here (an address edit can trigger re-verification).
//   node gbp-parity.mjs sites/<slug>   (reads audits/gbp-snapshot.json, writes audits/gbp-parity.md)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const digits = (s) => String(s ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const nameKey = (s) => String(s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
// "Croydon VIC 3136, Australia" and "Fort Mill, SC" both reduce to the plain town name.
const townKey = (s) => nameKey(String(s ?? "").split(",")[0].replace(/\b[A-Z]{2,3}\b/g, " ").replace(/\d+/g, " "));
const tokens = (s) => new Set(nameKey(s).split(" ").filter((w) => w && w !== "and").map((w) => w.replace(/s$/, "")));
function overlap(a, b) {
  const x = tokens(a), y = tokens(b);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / new Set([...x, ...y]).size;
}

export function parity(site, gbp) {
  const b = site.business, ok = [], mismatches = [];
  const miss = (field, s, g, fix) => mismatches.push({ field, site: s, gbp: g, fix });
  if (nameKey(b.name) === nameKey(gbp.name)) ok.push("name"); else miss("name", b.name, gbp.name, `Make the profile name "${b.name}" (or fix the site if the profile is the legal name)`);
  if (digits(b.phone) === digits(gbp.phone)) ok.push("phone"); else miss("phone", b.phone, gbp.phone, `Set the profile phone to ${b.phone}`);
  let host = "";
  try { host = new URL(gbp.website).host; } catch {}
  if (host && host === new URL(site.site_url).host) ok.push("website"); else miss("website", site.site_url + "/", gbp.website ?? "", `Set the profile website to ${site.site_url}/`);
  const siteSvc = new Map(site.nav.services.map((s) => [nameKey(s.name), s]));
  const gbpSvc = new Map((gbp.services ?? []).map((s) => [nameKey(s), s]));
  const siteLeft = [...siteSvc.keys()].filter((k) => !gbpSvc.has(k));
  let gbpLeft = [...gbpSvc.keys()].filter((k) => !siteSvc.has(k));
  for (const k of siteLeft) {
    const s = siteSvc.get(k);
    // Same service, different wording: one rename, not "missing" on both sides.
    const best = gbpLeft.map((g) => [g, overlap(s.name, gbpSvc.get(g))]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 0.5) {
      miss("service_name", s.name, gbpSvc.get(best[0]), `Rename "${gbpSvc.get(best[0])}" to "${s.name}" on the profile so it matches the page ${site.site_url}${s.url}`);
      gbpLeft = gbpLeft.filter((g) => g !== best[0]);
    } else miss("service", s.name, "", `Add "${s.name}" to the profile services (page: ${site.site_url}${s.url})`);
  }
  for (const g of gbpLeft) miss("service", "", gbpSvc.get(g), `"${gbpSvc.get(g)}" is on the profile but has no page: remove it from the profile, or plan a page if you really offer it`);
  if (!siteLeft.length && !gbpLeft.length) ok.push("services");
  const towns = [...site.nav.areas.map((a) => a.name), ...(b.home_city ? [b.home_city] : [])];
  const gbpTowns = new Set((gbp.serviceArea ?? []).map(townKey));
  const missingTowns = towns.filter((t) => !gbpTowns.has(townKey(t)));
  if (missingTowns.length) miss("service_area", missingTowns.join("; "), [...(gbp.serviceArea ?? [])].join("; "), `Add to the profile service area: ${missingTowns.join("; ")}`);
  else ok.push("service_area");
  return { ok, mismatches };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const gbp = JSON.parse(fs.readFileSync(path.join(siteDir, "audits/gbp-snapshot.json"), "utf8"));
  const r = parity(site, gbp);
  const lines = [`# GBP parity: ${site.business.name}`, "", `Matches: ${r.ok.join(", ") || "none"}`, "",
    `## Changes to review (${r.mismatches.length})`, "", ...(r.mismatches.length ? r.mismatches.map((m) => `- **${m.field}**: site "${m.site}", profile "${m.gbp}". ${m.fix}`) : ["None. The profile and the site describe the same business."]),
    "", "Nothing has been changed on the profile. Each change needs the owner's yes. The address is never changed from here.", ""];
  fs.writeFileSync(path.join(siteDir, "audits/gbp-parity.md"), lines.join("\n"));
  console.log(lines.join("\n"));
}
