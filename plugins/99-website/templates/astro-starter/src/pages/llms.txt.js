import site from "../data/site.json";
export function GET() {
  const b = site.business;
  const line = (p) => `- [${p.page_name}](${site.site_url}${p.url})`;
  const group = (title, t) => {
    const items = site.pages.filter((p) => p.type === t).map(line);
    return items.length ? [`## ${title}`, ...items, ""] : [];
  };
  const body = [`# ${b.name}`, "", `> Serving ${b.home_city}. Phone ${b.phone}.`, "",
    ...group("Services", "service"), ...group("Areas", "area"), ...group("Guides", "blog")].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
