import { test } from "node:test";
import assert from "node:assert/strict";
import { graphFor } from "../plugins/99-website/templates/astro-starter/src/lib/schema.js";

const site = {
  site_url: "https://x.example", nav: { areas: [] },
  business: { name: "Cedar & Stone", phone: "1", home_city: "Charlotte", founded: "2014", gbp_url: "https://g.page/r/abc",
    socials: [{ network: "facebook", label: "Facebook", url: "https://www.facebook.com/cs" }] },
  testimonials: [{ quote: "Great.", name: "J.", source: "owner" }],
};
const page = { url: "/", title: "Home", type: "home", page_name: "Home" };
const biz = (g) => g["@graph"].find((n) => n["@id"].endsWith("#business"));

test("business node lists GBP and social profiles as sameAs, plus foundingDate", () => {
  const b = biz(graphFor({ site, page, content: {}, pages: [page] }));
  assert.deepEqual(b.sameAs, ["https://g.page/r/abc", "https://www.facebook.com/cs"]);
  assert.equal(b.foundingDate, "2014");
});

test("testimonials never become Review or aggregateRating schema (self-serving reviews)", () => {
  const json = JSON.stringify(graphFor({ site, page, content: {}, pages: [page] }));
  assert.doesNotMatch(json, /Review|aggregateRating/);
});

test("no sameAs key when the business has no profiles", () => {
  const b = biz(graphFor({ site: { ...site, business: { ...site.business, socials: [], gbp_url: "" } }, page, content: {}, pages: [page] }));
  assert.equal("sameAs" in b, false);
});
