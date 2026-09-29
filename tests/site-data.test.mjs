import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontMatter, buildSiteData, redirectLines, pageFile } from "../plugins/99-website/scripts/site-data.mjs";

const CLIENT = `---
business_name: Cedar & Stone Landscapes
domain:
mode: new            # new | rebuild
country: United States
location_code: 2840
home_city: Charlotte
sensitive_niche: false
primary_cta: form    # call | form | booking
phone: (704) 555-0142
email: hello@cedarandstone.example
hours: Mon-Fri 7am-5pm
---

# Client context

**FICTIONAL demo business for a tutorial.**
`;
const MAP = `url,slug,page_name,title_tag,page_type,parent,target_keyword,volume,kd,intent,primary_cta,phase,data_source,notes
/,home,Home,Charlotte Landscaping | Cedar & Stone,home,,charlotte landscaping,1000,1,commercial,form,now,datawise,
/services/,services,Services,Services | Cedar & Stone,hub,/,,,,,form,now,datawise,
/services/paver-patios/,paver-patios,Patios and Pavers,"Paver Patios Charlotte NC: Patios, Walkways",service,/services/,pavers charlotte nc,110,0,commercial,form,now,datawise,
/blog/,blog,Blog,Blog | Cedar & Stone,hub,/,,,,,form,now,datawise,
/blog/later-post/,later-post,Later,Later Post,blog,/blog/,later kw,10,0,informational,form,later,datawise,
/areas-served/fort-mill-sc/,fort-mill-sc,"Fort Mill, SC",Landscaping Fort Mill SC,area,/areas-served/,landscaping fort mill sc,140,0,commercial,form,now,datawise,
`;

test("front matter: comments stripped, blanks kept, & kept raw", () => {
  const fm = parseFrontMatter(CLIENT);
  assert.equal(fm.business_name, "Cedar & Stone Landscapes");
  assert.equal(fm.mode, "new");
  assert.equal(fm.primary_cta, "form");
  assert.equal(fm.domain, "");
  assert.equal(fm.phone, "(704) 555-0142");
});

test("only phase=now pages are built, with files and nav", () => {
  const d = buildSiteData({ siteMapCsv: MAP, clientMd: CLIENT, siteUrl: "http://localhost:4321" });
  assert.deepEqual(d.pages.map((p) => p.url), ["/", "/services/", "/services/paver-patios/", "/blog/", "/areas-served/fort-mill-sc/"]);
  assert.equal(d.pages[2].title, "Paver Patios Charlotte NC: Patios, Walkways");
  assert.equal(d.pages[2].file, "services/paver-patios/index.html");
  assert.deepEqual(d.nav.services, [{ url: "/services/paver-patios/", name: "Patios and Pavers" }]);
  assert.deepEqual(d.nav.areas, [{ url: "/areas-served/fort-mill-sc/", name: "Fort Mill, SC" }]);
  assert.equal(d.business.name, "Cedar & Stone Landscapes");
  assert.equal(d.business.demo, true);
  assert.equal(d.noindex, true);
});

test("pageFile maps urls to built files", () => {
  assert.equal(pageFile("/"), "index.html");
  assert.equal(pageFile("/about/"), "about/index.html");
});

test("redirectLines keeps only 301 rows, Cloudflare format", () => {
  const csv = "old_url,new_url,status,notes\n/,/,keep,\n/old/,/services/x/,301,\n/gone/,,410,thin\n";
  assert.deepEqual(redirectLines(csv), ["/old/ /services/x/ 301"]);
});
