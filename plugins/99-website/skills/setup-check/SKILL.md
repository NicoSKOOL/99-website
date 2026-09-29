---
name: setup-check
description: Use first, before building any site with the 99-website pack, or when any 99-website step fails with a connection or login error. Checks Node, Cloudflare login, Lighthouse, Chrome, keys, the design skills, and the DataWise, DataForSEO, fal and treg connections, then picks the keyword data source (DataWise, DataForSEO or manual).
---

# Setup check

One screen that says what works, what does not, and the one-line fix for each problem. Run it once per machine and again whenever something breaks. It changes nothing except `.99-website/setup.json` in the current folder.

Scripts live in `<base>/../../scripts/`, where `<base>` is the "Base directory for this skill" shown when this skill loaded.

## Step 1: Local checks

Run `node "<base>/../../scripts/doctor.mjs" --json` and keep the JSON. Do not re-run the individual commands yourself.

## Step 2: Connection checks

One cheap call each, in this order. MCP tool names differ by install (for example `mcp__datawise__datawise_keyword_metrics` in Claude Code, `mcp__claude_ai_DataWise_SEO__datawise_keyword_metrics` through a claude.ai connector). Use whichever exists. Never print API keys or tokens.

1. **DataWise.** Call `datawise_keyword_metrics` with `keywords: ["plumber"]`. Use the `location_code` from any `sites/*/business/client.md` front matter, else `2840`.
   - Returns a search volume: `ok`.
   - Text contains "MCP access is included with AI Ranking Skool membership and DataWise Pro": `not_member`.
   - Text contains "early access": `early_access`.
   - No DataWise tool exists: `not_connected`.
   - Both a claude.ai DataWise connector and a project/plugin DataWise server are present: still `ok`, plus warning "DataWise is connected twice. Remove one so the tools do not show up under two names."
2. **DataForSEO** (only if DataWise is not `ok`). Call the tool whose name contains `kw_data_google_ads_search_volume` with `keywords: ["plumber"]`. `ok`, `not_connected`, or `error` with the message.
3. **fal.** Call the fal tool whose name contains `get_pricing` for `fal-ai/flux-2-pro` (if there is no pricing tool, call the one containing `search_models` with query `flux 2 pro`). `ok` with the price if returned, else `not_connected`.
4. **treg.** Call `catalog_search` with query `submit sitemap to google search console`. `ok` if a result looks like `webmasters-sitemaps-submit`. Do not call the endpoint itself.

## Step 3: Pick the keyword data path

- `datawise` if DataWise is `ok`.
- `dataforseo` if DataWise is not `ok` and DataForSEO is `ok`.
- `manual` otherwise.

If DataWise returned `not_member`, say exactly: "DataWise's MCP needs DataWise Pro or AI Ranking Skool membership (upgrade at https://datawiseseo.com/settings). Or use your own DataForSEO account: https://app.dataforseo.com/?aff=182182. Or continue with keywords you paste in (volumes stay blank)."

## Step 4: Save `.99-website/setup.json`

Create the `.99-website/` folder in the current working folder if needed and write (overwrite):

    {
      "checked_at": "<ISO timestamp>",
      "keyword_path": "datawise | dataforseo | manual",
      "connections": {
        "datawise":   { "status": "...", "detail": "..." },
        "dataforseo": { "status": "...", "detail": "..." },
        "fal":        { "status": "...", "detail": "..." },
        "treg":       { "status": "...", "detail": "..." }
      },
      "local": <the doctor JSON>
    }

## Step 5: Show the screen

A table with columns Check, Status (OK, MISSING, WARN), Needed for (now, build, deploy), Fix. Use these fixes:

| Problem | Fix |
|---|---|
| DataWise not connected (Claude Code) | `claude mcp add --transport http --scope user datawise https://mcp.datawiseseo.com/mcp`, restart `claude`, type `/mcp`, pick `datawise`, Authenticate, log in, Allow |
| DataWise not connected (Claude desktop) | Settings > Connectors > Add custom connector, URL `https://mcp.datawiseseo.com/mcp`, Connect |
| DataForSEO not connected | Sign up at https://app.dataforseo.com/?aff=182182, then `claude mcp add --transport http --scope user dataforseo https://mcp.dataforseo.com/mcp` and Authenticate in `/mcp` |
| fal not connected | Put `export FAL_KEY=...` in `~/.zshrc`, open a new terminal, restart `claude` (this plugin already declares the fal server) |
| treg not connected | Only needed at the deploy step. Leave it for now |
| Anything from the doctor JSON | Use its `fix` text |

Then one line: `Keyword data: <path>`.

Finish with "Ready for business-intake" when `node` is OK (everything else is needed later and shows as WARN, not a blocker). Suggest the next command: `/99-website:business-intake`.

## House rules

- No em dashes.
- Report honestly. A check you could not run is MISSING or WARN, never OK.
