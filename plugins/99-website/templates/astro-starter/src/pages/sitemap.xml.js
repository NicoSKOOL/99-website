import site from "../data/site.json";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export function GET() {
  const urls = site.pages.map((p) => `  <url><loc>${esc(site.site_url + p.url)}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
