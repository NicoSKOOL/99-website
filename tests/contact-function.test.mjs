import { test } from "node:test";
import assert from "node:assert/strict";
import { handleContact } from "../plugins/99-website/templates/astro-starter/functions/api/contact.js";

const form = (o = {}) => new Map(Object.entries({ name: "Ana", phone: "704 555 0100", email: "ana@x.example", service: "Paver Patios", message: "Patio", "cf-turnstile-response": "tok", company_website: "", ...o }));
const env = { TURNSTILE_SECRET: "s", RESEND_API_KEY: "k", LEAD_TO: "to@x.example", LEAD_FROM: "site@x.example" };
const fetchOk = (calls) => async (url, init) => { calls.push({ url, body: String(init.body) }); return new Response(JSON.stringify({ success: true, id: "1" }), { status: 200 }); };

test("valid lead: verifies Turnstile, sends one email, redirects to /thanks/", async () => {
  const calls = [];
  const r = await handleContact({ form: form(), env, fetchFn: fetchOk(calls), ip: "1.1.1.1" });
  assert.equal(r.status, 303); assert.equal(r.location, "/thanks/");
  assert.equal(calls.length, 2); assert.match(calls[1].url, /api\.resend\.com/);
});
test("honeypot filled: 400, nothing sent", async () => {
  const calls = [];
  assert.equal((await handleContact({ form: form({ company_website: "spam.com" }), env, fetchFn: fetchOk(calls) })).status, 400);
  assert.equal(calls.length, 0);
});
test("missing Turnstile token: 400, nothing sent", async () => {
  const calls = [];
  assert.equal((await handleContact({ form: form({ "cf-turnstile-response": "" }), env, fetchFn: fetchOk(calls) })).status, 400);
  assert.equal(calls.length, 0);
});
test("missing name or phone: 400", async () => {
  assert.equal((await handleContact({ form: form({ phone: "" }), env, fetchFn: fetchOk([]) })).status, 400);
});
test("Resend down: 502 with a call-us fallback, never a blank error", async () => {
  let n = 0;
  const f = async () => (++n === 1 ? new Response(JSON.stringify({ success: true })) : new Response("x", { status: 500 }));
  const r = await handleContact({ form: form(), env: { ...env, PHONE: "(704) 555-0142" }, fetchFn: f });
  assert.equal(r.status, 502); assert.match(r.body, /555-0142/);
});
test("LOG_ONLY: verifies Turnstile, sends no email, still redirects", async () => {
  const calls = [];
  const r = await handleContact({ form: form(), env: { ...env, LOG_ONLY: "1" }, fetchFn: fetchOk(calls) });
  assert.equal(r.status, 303); assert.equal(calls.length, 1);
});
