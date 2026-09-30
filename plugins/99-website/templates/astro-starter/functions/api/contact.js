// Cloudflare Pages Function: POST /api/contact. Honeypot, Turnstile, then one email through Resend.
// Env: TURNSTILE_SECRET, RESEND_API_KEY, LEAD_TO, LEAD_FROM, PHONE, LOG_ONLY ("1" = no email, for demos).
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function handleContact({ form, env, fetchFn = fetch, ip = "" }) {
  const get = (k) => String(form.get(k) ?? "").trim();
  if (get("company_website")) return { status: 400, body: "Bad request" };
  if (!get("name") || !get("phone")) return { status: 400, body: "Please add your name and phone number." };
  const token = get("cf-turnstile-response");
  if (!token) return { status: 400, body: "Please complete the check and try again." };
  const ts = await fetchFn("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  if (!(await ts.json()).success) return { status: 400, body: "Please complete the check and try again." };
  const lead = ["name", "phone", "email", "town", "service", "message"].map((k) => `<p><b>${k}</b>: ${esc(get(k))}</p>`).join("");
  if (env.LOG_ONLY === "1") { console.log("lead (LOG_ONLY)", get("name"), get("service")); return { status: 303, location: "/thanks/" }; }
  const r = await fetchFn("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.LEAD_FROM, to: env.LEAD_TO, reply_to: get("email") || undefined, subject: `New estimate request: ${get("service") || "website"}`, html: lead }),
  });
  if (!r.ok) return { status: 502, body: `Sorry, the form did not send. Please call us${env.PHONE ? ` on ${env.PHONE}` : ""}.` };
  return { status: 303, location: "/thanks/" };
}

export async function onRequestPost({ request, env }) {
  const r = await handleContact({ form: await request.formData(), env, ip: request.headers.get("CF-Connecting-IP") ?? "" });
  return r.location ? Response.redirect(new URL(r.location, request.url), 303) : new Response(r.body, { status: r.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
