import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, toCsv } from "../plugins/99-website/scripts/lib/csv.mjs";

test("parses quoted fields with commas, quotes and newlines", () => {
  const r = parseCsv('a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n1,2,3\n');
  assert.deepEqual(r.header, ["a", "b", "c"]);
  assert.deepEqual(r.rows[0], { a: "x, y", b: 'say "hi"', c: "line1\nline2" });
  assert.deepEqual(r.widths, [3, 3]);
});

test("reports row width so an unquoted comma is detectable", () => {
  const r = parseCsv("a,b\n1,2,3\n");
  assert.deepEqual(r.widths, [3]);
});

test("throws on an unterminated quote", () => {
  assert.throws(() => parseCsv('a\n"open'), /Unterminated quoted field/);
});

test("toCsv round-trips", () => {
  const rows = [{ a: "x, y", b: 'q"t' }];
  assert.deepEqual(parseCsv(toCsv(["a", "b"], rows)).rows, rows);
});
