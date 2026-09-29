import { test } from "node:test";
import assert from "node:assert/strict";
import { validateJsonLd } from "../plugins/99-website/scripts/validate-jsonld.mjs";

const business = { name: "Cedar & Stone </script> Landscapes", phone: "(704) 555-0142" };
const graph = (extra = []) => ({ "@context": "https://schema.org", "@graph": [
  { "@type": "WebSite", name: business.name }, { "@type": "LandscapeArchitect", telephone: business.phone }, { "@type": "WebPage" },
  { "@type": "BreadcrumbList", itemListElement: [] }, { "@type": "Service", name: "Patios" }, ...extra] });
const html = (g, body = "") => `<html><head><script type="application/ld+json">${JSON.stringify(g).replace(/</g, "\\u003c")}</script></head><body>${body}</body></html>`;
const page = { url: "/services/paver-patios/", type: "service" };

test("a correct service graph passes, even with & and </script> in the name", () => {
  assert.deepEqual(validateJsonLd({ html: html(graph()), page, business }), []);
});
test("broken JSON fails", () => {
  assert.match(validateJsonLd({ html: '<script type="application/ld+json">{bad</script>', page, business }).join(), /parse/);
});
test("FAQ in schema must be visible on the page", () => {
  const faq = { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "How long?", acceptedAnswer: { "@type": "Answer", text: "Two days." } }] };
  assert.match(validateJsonLd({ html: html(graph([faq])), page, business }).join(), /FAQ/);
  assert.deepEqual(validateJsonLd({ html: html(graph([faq]), "<details><summary>How long?</summary><p>Two days.</p></details>"), page, business }), []);
});
test("ratings are refused unless allowed", () => {
  const g = graph(); g["@graph"][1].aggregateRating = { ratingValue: 5, reviewCount: 3 };
  assert.match(validateJsonLd({ html: html(g), page, business }).join(), /aggregateRating/);
});
test("telephone must match the business phone", () => {
  const g = graph(); g["@graph"][1].telephone = "704-555-9999";
  assert.match(validateJsonLd({ html: html(g), page, business }).join(), /telephone/);
});
test("service page without Service fails", () => {
  const g = graph(); g["@graph"] = g["@graph"].filter((n) => n["@type"] !== "Service");
  assert.match(validateJsonLd({ html: html(g), page, business }).join(), /Service/);
});
