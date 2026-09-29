import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRedirects } from "../plugins/99-website/scripts/validate-redirects.mjs";

const siteMapCsv = "url,slug,page_name,title_tag,page_type,parent,target_keyword,volume,kd,intent,primary_cta,phase,data_source,notes\n/,home,Home,T1,home,,k,1,1,commercial,call,now,manual,\n/services/sil/,sil,SIL,T2,service,/,k2,,,transactional,call,now,manual,\n";

test("every crawled page needs a row, targets must exist, no chains", () => {
  const redirectsCsv = "old_url,new_url,status,notes\n/,/,keep,\n/old-sil/,/services/sil/,301,\n/gone/,,410,thin page\n/a/,/b/,301,\n/b/,/services/sil/,301,\n";
  const { errors } = validateRedirects({ crawlPaths: ["/", "/old-sil/", "/gone/", "/missing/", "/a/", "/b/"], redirectsCsv, siteMapCsv });
  const msgs = errors.map((e) => e.message).join(" | ");
  assert.match(msgs, /\/missing\/ has no redirect row/);
  assert.match(msgs, /\/b\/ is not a page in site-map.csv/);
  assert.match(msgs, /chain/);
});

test("a complete, valid redirect file passes", () => {
  const redirectsCsv = "old_url,new_url,status,notes\n/,/,keep,\n/old-sil/,/services/sil/,301,\n/gone/,,410,thin page\n";
  assert.deepEqual(validateRedirects({ crawlPaths: ["/", "/old-sil/", "/gone/"], redirectsCsv, siteMapCsv }).errors, []);
});
