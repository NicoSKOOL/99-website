// Loads page copy written by the writer. One JSON file per page, id = "home" or the slug.
const files = import.meta.glob("../content/pages/*.json", { eager: true, import: "default" });
const idOf = (page) => (page.url === "/" ? "home" : page.slug);
export const hasContent = (page) => Boolean(files[`../content/pages/${idOf(page)}.json`]);
export function contentFor(page) {
  const id = page.url === "/" ? "home" : page.slug;
  const c = files[`../content/pages/${id}.json`];
  if (!c) throw new Error(`Missing content file src/content/pages/${id}.json for ${page.url}`);
  return c;
}
