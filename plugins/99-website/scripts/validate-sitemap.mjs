#!/usr/bin/env node
// Validate research/site-map.csv against the 99-website page-plan rules.
//   node validate-sitemap.mjs sites/<slug>/research/site-map.csv [--json] [--crawl research/crawl/pages.jsonl]
//   --crawl (rebuild mode): old URLs may keep their path.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCsv } from "./lib/csv.mjs";
import { kwIndex } from "./lib/keyword.mjs";

export const SITEMAP_COLUMNS = ["url", "slug", "page_name", "title_tag", "page_type", "parent", "target_keyword",
  "volume", "kd", "intent", "primary_cta", "phase", "data_source", "notes"];
export const PAGE_TYPES = ["home", "hub", "service", "area", "blog", "about", "contact", "legal"];
const KEYWORD_TYPES = new Set(["home", "service", "area", "blog"]);
const INTENTS = ["transactional", "commercial", "informational", "navigational"];
const HUB_URLS = ["/services/", "/areas-served/", "/blog/"];
const PREFIX = { service: "/services/", area: "/areas-served/", blog: "/blog/" };
const SOURCES = ["datawise", "dataforseo", "manual"];

// existingPaths (rebuild mode): URLs the old site already has. They keep their path even when it
// breaks the /services/, /areas-served/ pattern, because moving a page that already ranks is risk
// with no upside. New pages still follow the pattern.
export function validateSiteMap(text, { existingPaths = [] } = {}) {
  const existing = new Set(existingPaths);
  const errors = [];
  const warnings = [];
  let parsed;
  try { parsed = parseCsv(text); } catch (e) { return { errors: [{ row: 0, field: "file", message: e.message }], warnings, rows: [] }; }
  const { header, rows, widths } = parsed;
  const missing = SITEMAP_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { errors: [{ row: 1, field: "header", message: `missing columns: ${missing.join(", ")}` }], warnings, rows };

  const err = (i, field, message) => errors.push({ row: i + 2, field, message });
  const urls = new Set(rows.map((r) => r.url));
  const seenUrl = new Map();
  const seenTitle = new Map();
  const seenKw = new Map();
  const sources = new Set();

  rows.forEach((r, i) => {
    const t = r.page_type;
    if (widths[i] !== header.length) err(i, "row", `has ${widths[i]} fields but the header has ${header.length} (an unquoted comma?)`);
    if (!PAGE_TYPES.includes(t)) err(i, "page_type", `"${t}" must be one of ${PAGE_TYPES.join(", ")}`);

    const u = r.url;
    if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/.test(u)) {
      err(i, "url", `"${u}" must be lowercase letters, numbers and hyphens, starting and ending with /`);
    } else {
      const segs = u.split("/").filter(Boolean);
      if (t === "home" && u !== "/") err(i, "url", "the home page url must be /");
      const kept = existing.has(u);
      if (t === "hub" && !HUB_URLS.includes(u) && !kept) err(i, "url", `a hub url must be one of ${HUB_URLS.join(", ")}`);
      if (PREFIX[t] && !kept && !(u.startsWith(PREFIX[t]) && segs.length === 2)) err(i, "url", `a ${t} url must look like ${PREFIX[t]}{slug}/`);
      if (["about", "contact", "legal"].includes(t) && segs.length !== 1) err(i, "url", `a ${t} url must be one level deep, like /${t}/`);
      if (!["home", "hub"].includes(t) && segs.length && r.slug !== segs[segs.length - 1]) err(i, "slug", `"${r.slug}" must equal the last url part "${segs[segs.length - 1]}"`);
    }
    if (seenUrl.has(u)) err(i, "url", `duplicate of row ${seenUrl.get(u)}`); else seenUrl.set(u, i + 2);

    const title = r.title_tag;
    if (!title) err(i, "title_tag", "required");
    else {
      const len = [...title].length;
      if (len > 60) err(i, "title_tag", `${len} characters, max 60`);
      if (title.includes("\u2014")) err(i, "title_tag", "contains an em dash");
      const k = title.toLowerCase();
      if (seenTitle.has(k)) err(i, "title_tag", `duplicate of row ${seenTitle.get(k)}`); else seenTitle.set(k, i + 2);
    }

    const kw = r.target_keyword.toLowerCase().replace(/\s+/g, " ").trim();
    if (title && kw) {
      const at = kwIndex(title, kw);
      if (at < 0) err(i, "title_tag", `does not contain the target keyword "${r.target_keyword}" (catch it now, not at build)`);
      else if (at > title.length / 2) err(i, "title_tag", "target keyword is in the second half (put it in the first half)");
    }
    if (KEYWORD_TYPES.has(t)) {
      if (!kw) err(i, "target_keyword", `required for ${t} pages`);
      if (!INTENTS.includes(r.intent)) err(i, "intent", `"${r.intent}" must be one of ${INTENTS.join(", ")}`);
    }
    if (kw) {
      if (seenKw.has(kw)) err(i, "target_keyword", `"${r.target_keyword}" already used on row ${seenKw.get(kw)} (one keyword per page)`);
      else seenKw.set(kw, i + 2);
    }

    if (r.volume !== "" && !/^\d+$/.test(r.volume)) err(i, "volume", `"${r.volume}" must be blank or a whole number from the tool (never estimated)`);
    if (r.kd !== "" && !(/^\d+$/.test(r.kd) && Number(r.kd) <= 100)) err(i, "kd", `"${r.kd}" must be blank or a whole number from 0 to 100 (never estimated)`);
    if (!["now", "later"].includes(r.phase)) err(i, "phase", `"${r.phase}" must be now or later`);

    if (t === "home") { if (r.parent) err(i, "parent", "the home page has no parent"); }
    else if (!r.parent) err(i, "parent", "required: the url of the parent page");
    else if (!urls.has(r.parent)) err(i, "parent", `"${r.parent}" is not a url in this file`);

    if (!SOURCES.includes(r.data_source)) err(i, "data_source", `"${r.data_source}" must be ${SOURCES.join(", ")}`);
    else sources.add(r.data_source);
    if (kw && r.volume === "" && r.data_source !== "manual") warnings.push({ row: i + 2, field: "volume", message: "blank although a keyword tool was used: confirm the tool returned nothing" });
  });

  if (sources.size > 1) errors.push({ row: 0, field: "data_source", message: `mixed sources (${[...sources].join(", ")}): one plan, one source` });
  if (!rows.some((r) => r.page_type === "home")) errors.push({ row: 0, field: "page_type", message: "no home page row" });
  const services = rows.filter((r) => r.page_type === "service").length;
  if (!services) errors.push({ row: 0, field: "page_type", message: "no service pages" });
  if (services > 15) warnings.push({ row: 0, field: "page_type", message: `${services} service pages: check every one passed the publication gate` });
  return { errors, warnings, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ci = process.argv.indexOf("--crawl");
  const existingPaths = ci > -1
    ? fs.readFileSync(process.argv[ci + 1], "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).path)
    : [];
  const res = validateSiteMap(fs.readFileSync(process.argv[2], "utf8"), { existingPaths });
  if (process.argv.includes("--json")) console.log(JSON.stringify({ errors: res.errors, warnings: res.warnings }, null, 2));
  else {
    for (const e of res.errors) console.log(`ERROR  row ${e.row} ${e.field}: ${e.message}`);
    for (const w of res.warnings) console.log(`WARN   row ${w.row} ${w.field}: ${w.message}`);
    console.log(`${res.rows.length} pages, ${res.errors.length} errors, ${res.warnings.length} warnings`);
  }
  process.exit(res.errors.length ? 1 : 0);
}
