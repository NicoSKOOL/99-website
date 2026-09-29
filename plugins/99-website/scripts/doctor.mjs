#!/usr/bin/env node
// Local environment checks for the 99-website pack. Presence only: never prints key values.
//   node doctor.mjs          table
//   node doctor.mjs --json   machine-readable (used by the setup-check skill)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function findSkills(roots, names) {
  const found = Object.fromEntries(names.map((n) => [n, null]));
  const wanted = new Set(names);
  const walk = (dir, depth) => {
    if (depth > 8 || ![...wanted].some((n) => found[n] === null)) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isFile() && e.name === "SKILL.md") {
        const head = fs.readFileSync(p, "utf8").slice(0, 600);
        const m = head.match(/^name:\s*["']?([^"'\n]+?)["']?\s*$/m);
        if (m && wanted.has(m[1]) && found[m[1]] === null) found[m[1]] = p;
      } else if (e.isDirectory() && !["node_modules", ".git", "marketplaces"].includes(e.name)) {
        // plugins/marketplaces holds catalogs that were added, not installed
        walk(p, depth + 1);
      }
    }
  };
  for (const r of roots) walk(r, 0);
  return found;
}

export function readEnvKeys(names, envFileText, env) {
  const fileKeys = new Set();
  for (const line of envFileText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !line.trim().startsWith("#")) fileKeys.add(m[1]);
  }
  return Object.fromEntries(names.map((n) => [n, Boolean(env[n]) || fileKeys.has(n)]));
}

function run(cmd, args, timeout = 120000) {
  try {
    return { ok: true, out: execFileSync(cmd, args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}

function chromePath(env) {
  const candidates = [
    env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    path.join(env.PROGRAMFILES || "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function runChecks(cwd = process.cwd(), env = process.env) {
  const home = os.homedir();
  const major = Number(process.versions.node.split(".")[0]);
  const res = {};
  res.node = { ok: major >= 18, detail: `v${process.versions.node}`, fix: "Install Node 18 or newer from nodejs.org", needed_for: "now" };

  const who = run("npx", ["-y", "wrangler@4", "whoami"]);
  const loggedIn = who.ok && /logged in/i.test(who.out) && !/not authenticated/i.test(who.out);
  res.wrangler = { ok: loggedIn, detail: loggedIn ? "logged in to Cloudflare" : "not logged in", fix: "npx wrangler login", needed_for: "deploy" };

  const lh = run("npx", ["-y", "lighthouse@12", "--version"]);
  res.lighthouse = { ok: lh.ok, detail: lh.ok ? `v${lh.out.trim()}` : "could not run", fix: "Check your internet connection, then re-run (Lighthouse runs through npx, nothing to install)", needed_for: "build" };

  const chrome = chromePath(env);
  res.chrome = { ok: Boolean(chrome), detail: chrome || "not found", fix: "Install Google Chrome, or set CHROME_PATH", needed_for: "build" };

  let envText = "";
  try { envText = fs.readFileSync(path.join(cwd, ".env"), "utf8"); } catch {}
  const keys = readEnvKeys(["FAL_KEY", "RESEND_API_KEY"], envText, env);
  res.keys = {
    ok: keys.FAL_KEY,
    detail: `FAL_KEY ${keys.FAL_KEY ? "set" : "missing"}, RESEND_API_KEY ${keys.RESEND_API_KEY ? "set" : "missing (needed at deploy)"}`,
    fix: "Add export FAL_KEY=... to your shell profile (~/.zshrc), open a new terminal, restart claude. The fal MCP reads it at startup.",
    needed_for: "build",
  };

  const roots = [path.join(home, ".claude"), path.join(cwd, ".claude"), path.join(home, ".agents"), path.join(cwd, ".agents")];
  const skills = findSkills(roots, ["impeccable", "design-taste-frontend"]);
  const missing = Object.entries(skills).filter(([, p]) => !p).map(([n]) => n);
  res.design_skills = {
    ok: missing.length === 0,
    detail: missing.length ? `missing: ${missing.join(", ")}` : "impeccable + design-taste-frontend installed",
    fix: "/plugin marketplace add pbakaus/impeccable  then install Impeccable from /plugin;  npx skills add https://github.com/Leonxlnx/taste-skill --skill \"design-taste-frontend\"",
    needed_for: "build",
  };
  return res;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = runChecks();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    for (const [name, r] of Object.entries(res)) {
      console.log(`${r.ok ? "OK     " : "MISSING"}  ${name.padEnd(14)} ${r.detail}${r.ok ? "" : `\n         fix: ${r.fix}`}`);
    }
  }
  process.exit(res.node.ok ? 0 : 1);
}
