import { test } from "node:test";
import assert from "node:assert/strict";
import { parity } from "../plugins/99-website/scripts/gbp-parity.mjs";

const site = {
  site_url: "https://cedarandstone.example",
  business: { name: "Cedar & Stone Landscapes", phone: "(704) 555-0142" },
  nav: { services: [{ url: "/services/paver-patios/", name: "Paver Patios" }, { url: "/services/retaining-walls/", name: "Retaining Walls" }],
    areas: [{ url: "/areas-served/fort-mill-sc/", name: "Fort Mill, SC" }] },
};
const gbp = (o = {}) => ({ name: "Cedar & Stone Landscapes", phone: "704-555-0142", website: "https://cedarandstone.example/",
  services: ["Paver Patios", "Retaining Walls"], serviceArea: ["Fort Mill, SC"], address: "", ...o });

test("a matching profile has no mismatches", () => assert.deepEqual(parity(site, gbp()).mismatches, []));
test("phone formatting and '&' vs 'and' are not mismatches", () =>
  assert.deepEqual(parity(site, gbp({ phone: "+1 704 555 0142", name: "Cedar and Stone Landscapes" })).mismatches, []));
test("a different phone is a mismatch with a fix", () => {
  const m = parity(site, gbp({ phone: "704-555-0199" })).mismatches;
  assert.equal(m[0].field, "phone"); assert.match(m[0].fix, /\(704\) 555-0142/);
});
test("services missing on either side are mismatches", () => {
  const m = parity(site, gbp({ services: ["Paver Patios", "Tree Removal"] })).mismatches.map((x) => x.field + ":" + x.site + "|" + x.gbp);
  assert.ok(m.some((x) => x.startsWith("service:Retaining Walls|")));
  assert.ok(m.some((x) => x.startsWith("service:|Tree Removal")));
});
test("website on another host is a mismatch", () =>
  assert.equal(parity(site, gbp({ website: "https://old-site.example/" })).mismatches[0].field, "website"));
test("service area town missing from the profile is a mismatch", () =>
  assert.equal(parity(site, gbp({ serviceArea: [] })).mismatches[0].field, "service_area"));
test("the address is never in a fix", () => {
  const all = parity(site, gbp({ address: "1 Other St", phone: "1" })).mismatches;
  assert.ok(all.every((x) => x.field !== "address"));
});

test("near-identical service names are ONE rename, not a missing pair", () => {
  const m = parity(site, gbp({ services: ["Paver Patio Installation", "Retaining Walls"] })).mismatches;
  assert.equal(m.length, 1);
  assert.equal(m[0].field, "service_name");
  assert.match(m[0].fix, /Rename "Paver Patio Installation" to "Paver Patios"/);
});
test("Google place names with state, postcode and country match the plain town", () => {
  const s = { ...site, nav: { ...site.nav, areas: [{ url: "/x/", name: "Croydon" }] } };
  assert.deepEqual(parity(s, gbp({ serviceArea: ["Croydon VIC 3136, Australia"] })).mismatches, []);
  const s2 = { ...site, nav: { ...site.nav, areas: [{ url: "/x/", name: "Fort Mill, SC" }] } };
  assert.deepEqual(parity(s2, gbp({ serviceArea: ["Fort Mill SC 29715, USA"] })).mismatches, []);
});
