# 99 Website

Repeatable Claude Code skills that build SEO websites scoring 99 on Lighthouse (Astro + Cloudflare).

Status: Stage 1 (setup check, business intake, keyword site map). Build, audit and deploy skills come next.

## Install

    /plugin marketplace add NicoSKOOL/99-website
    /plugin install 99-website@99-website

## Skills

| Skill | What it does |
|---|---|
| `/99-website:setup-check` | Checks every connection and picks your keyword data source |
| `/99-website:business-intake` | Learns the business (interview, or crawl of the old site) into `sites/<slug>/business/` |
| `/99-website:keyword-sitemap` | Turns keyword data into an approved page plan (`site-map.csv`) |

## Keyword data

- DataWise (needs DataWise Pro or AI Ranking Skool membership): https://datawiseseo.com
- Or your own DataForSEO account: https://app.dataforseo.com/?aff=182182
- Or paste your own keywords (volumes stay blank)

## Tests

    npm test

MIT licence.
