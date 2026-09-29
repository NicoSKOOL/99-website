// JSON-LD as a claims layer: only what the page visibly says. One @graph per page.
export function graphFor({ site, page, content, pages }) {
  const base = site.site_url;
  const b = site.business;
  const orgId = `${base}/#business`;
  const url = `${base}${page.url}`;
  const sameAs = [b.gbp_url, ...(b.socials || []).map((s) => s.url)].filter(Boolean);
  const nodes = [
    { "@type": "WebSite", "@id": `${base}/#website`, url: `${base}/`, name: b.name, publisher: { "@id": orgId } },
    {
      "@type": b.schema_type || "LocalBusiness", "@id": orgId, name: b.name, url: `${base}/`,
      ...(b.phone && { telephone: b.phone }), ...(b.email && { email: b.email }),
      ...(b.home_city && { areaServed: [b.home_city, ...site.nav.areas.map((a) => a.name)] }),
      ...(b.founded && { foundingDate: b.founded }),
      // Testimonials stay visible text only: self-serving Review/aggregateRating markup is not eligible for stars.
      ...(sameAs.length && { sameAs }),
    },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, isPartOf: { "@id": `${base}/#website` }, about: { "@id": orgId } },
  ];
  if (page.url !== "/") {
    const chain = [];
    for (let p = page; p; p = pages.find((x) => x.url === p.parent)) chain.unshift(p);
    nodes.push({
      "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`,
      itemListElement: chain.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.page_name, item: `${base}${p.url}` })),
    });
  }
  if (page.type === "service") {
    nodes.push({ "@type": "Service", "@id": `${url}#service`, name: page.page_name, provider: { "@id": orgId }, areaServed: b.home_city, url });
  }
  if (page.type === "blog") {
    nodes.push({
      "@type": "Article", "@id": `${url}#article`, headline: content.h1, url,
      ...(content.author && { author: { "@type": "Person", name: content.author } }),
      ...(content.date && { datePublished: content.date }), publisher: { "@id": orgId },
    });
  }
  if (content.faqs?.length) {
    nodes.push({
      "@type": "FAQPage", "@id": `${url}#faq`,
      mainEntity: content.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": nodes };
}

// Safe inside <script>: "</script>" and "<!--" can never end the tag early.
export const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
