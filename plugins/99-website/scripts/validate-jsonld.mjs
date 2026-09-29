#!/usr/bin/env node
// Schema is a claims layer: it may only say what the page visibly says.
//   node validate-jsonld.mjs sites/<slug> [--allow-ratings]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { strip, norm, jsonLdBlocks } from "./lib/html.mjs";

const BUSINESS_TYPES = /LocalBusiness|HomeAndConstructionBusiness|LandscapeArchitect|GeneralContractor|ProfessionalService|MedicalBusiness|LegalService|FinancialService|HealthAndBeautyBusiness|AutomotiveBusiness|FoodEstablishment|Store/;

export function validateJsonLd({ html, page, business, allowRatings = false }) {
  const f = [];
  const nodes = [];
  let graphs = 0;
  for (const raw of jsonLdBlocks(html)) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { f.push(`JSON-LD does not parse: ${e.message}`); continue; }
    if (data["@graph"]) graphs++;
    nodes.push(...(data["@graph"] || [data]));
  }
  if (!nodes.length) return f.length ? f : ["no JSON-LD on the page"];
  if (graphs !== 1) f.push(`${graphs} @graph blocks (want exactly 1)`);
  const types = nodes.flatMap((n) => [].concat(n["@type"] || []));
  const has = (t) => types.some((x) => (t instanceof RegExp ? t.test(x) : x === t));
  for (const t of ["WebSite", "WebPage"]) if (!has(t)) f.push(`missing ${t}`);
  if (!has(BUSINESS_TYPES)) f.push("missing LocalBusiness (or a subtype)");
  if (page.url !== "/" && !has("BreadcrumbList")) f.push("missing BreadcrumbList");
  if (page.type === "service" && !has("Service")) f.push("missing Service on a service page");
  if (page.type === "blog") {
    const art = nodes.find((n) => [].concat(n["@type"]).includes("Article"));
    if (!art) f.push("missing Article on a blog post"); else if (!art.author) f.push("Article has no author");
  }
  const visible = norm(strip(html));
  for (const n of nodes) {
    if ([].concat(n["@type"]).includes("FAQPage")) for (const q of n.mainEntity || []) {
      if (!visible.includes(norm(q.name))) f.push(`FAQ question in schema but not on the page: "${q.name.slice(0, 50)}"`);
      if (!visible.includes(norm(q.acceptedAnswer?.text || ""))) f.push(`FAQ answer in schema but not on the page: "${q.name.slice(0, 50)}"`);
    }
    if (!allowRatings && (n.aggregateRating || n.review)) f.push("aggregateRating/review in schema but proof.md has no reviews (pass --allow-ratings only when it does)");
    if (n.telephone && n.telephone !== business.phone) f.push(`telephone "${n.telephone}" differs from business phone "${business.phone}"`);
  }
  return f;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const allowRatings = process.argv.includes("--allow-ratings");
  let n = 0;
  for (const page of site.pages) {
    const file = path.join(siteDir, "site/dist", page.file);
    if (!fs.existsSync(file)) { console.log(`FAIL ${page.url}: not built`); n++; continue; }
    for (const m of validateJsonLd({ html: fs.readFileSync(file, "utf8"), page, business: site.business, allowRatings })) { console.log(`FAIL ${page.url}: ${m}`); n++; }
  }
  console.log(n ? `\n${n} failure(s)` : `schema valid on all ${site.pages.length} pages`);
  process.exit(n ? 1 : 0);
}
