import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSiteMap, SITEMAP_COLUMNS } from "../plugins/99-website/scripts/validate-sitemap.mjs";
import { toCsv } from "../plugins/99-website/scripts/lib/csv.mjs";

const row = (o) => ({ url: "", slug: "", page_name: "", title_tag: "", page_type: "", parent: "", target_keyword: "",
  volume: "", kd: "", intent: "", primary_cta: "call", phase: "now", data_source: "datawise", notes: "", ...o });
const GOOD = [
  row({ url: "/", slug: "home", page_name: "Home", title_tag: "NDIS Support Melbourne | My Inclusion", page_type: "home", target_keyword: "ndis support melbourne", volume: "320", kd: "12", intent: "commercial" }),
  row({ url: "/services/", slug: "services", page_name: "Services", title_tag: "Our NDIS Services | My Inclusion", page_type: "hub", parent: "/" }),
  row({ url: "/services/support-coordination/", slug: "support-coordination", page_name: "Support Coordination", title_tag: "NDIS Support Coordination, Melbourne | My Inclusion", page_type: "service", parent: "/services/", target_keyword: "ndis support coordination", volume: "0", kd: "", intent: "transactional" }),
  row({ url: "/contact/", slug: "contact", page_name: "Contact", title_tag: "Contact My Inclusion", page_type: "contact", parent: "/" }),
];
const csv = (rows) => toCsv(SITEMAP_COLUMNS, rows);
const fields = (res) => res.errors.map((e) => `${e.row}:${e.field}`);

test("a clean plan passes", () => {
  const res = validateSiteMap(csv(GOOD));
  assert.deepEqual(res.errors, []);
});

test("zero volume and blank KD are valid, estimates are not", () => {
  const bad = GOOD.map((r, i) => (i === 2 ? { ...r, volume: "~50", kd: "est. 20" } : r));
  assert.deepEqual(fields(validateSiteMap(csv(bad))).sort(), ["4:kd", "4:volume"]);
});

test("one keyword per page", () => {
  const dup = [...GOOD, row({ url: "/blog/what-is-support-coordination/", slug: "what-is-support-coordination", page_name: "Post", title_tag: "What Is Support Coordination?", page_type: "blog", parent: "/", target_keyword: "NDIS  Support Coordination", intent: "informational" })];
  const res = validateSiteMap(csv(dup));
  assert.ok(res.errors.some((e) => e.field === "target_keyword" && /already used on row 4/.test(e.message)));
});

test("title rules: 60 chars, no em dash, unique", () => {
  const long = GOOD.map((r, i) => (i === 3 ? { ...r, title_tag: "Contact \u2014 " + "x".repeat(60) } : r));
  const msgs = validateSiteMap(csv(long)).errors.filter((e) => e.field === "title_tag").map((e) => e.message).join(" | ");
  assert.match(msgs, /max 60/);
  assert.match(msgs, /em dash/);
});

test("url rules per page type", () => {
  const bad = GOOD.map((r, i) => (i === 2 ? { ...r, url: "/Support_Coordination" } : r));
  assert.ok(validateSiteMap(csv(bad)).errors.some((e) => e.field === "url"));
  const wrongPrefix = GOOD.map((r, i) => (i === 2 ? { ...r, url: "/support-coordination/" } : r));
  assert.ok(validateSiteMap(csv(wrongPrefix)).errors.some((e) => /\/services\/\{slug\}\//.test(e.message)));
});

test("parent must exist, data_source must be single and valid", () => {
  const bad = GOOD.map((r, i) => (i === 2 ? { ...r, parent: "/nope/", data_source: "manual" } : r));
  const res = validateSiteMap(csv(bad));
  assert.ok(res.errors.some((e) => e.field === "parent"));
  assert.ok(res.errors.some((e) => /mixed sources/.test(e.message)));
});

test("an unquoted comma shifts columns and is reported", () => {
  const text = csv(GOOD).replace("Contact My Inclusion", "Contact, My Inclusion").replace('"Contact, My Inclusion"', "Contact, My Inclusion");
  assert.ok(validateSiteMap(text).errors.some((e) => e.field === "row"));
});

test("missing columns stop validation with one clear error", () => {
  const res = validateSiteMap("url,slug\n/,home\n");
  assert.equal(res.errors.length, 1);
  assert.match(res.errors[0].message, /missing columns/);
});
