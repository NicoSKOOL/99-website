# 99 Website

Repeatable Claude Code skills that build SEO websites scoring 99 on Lighthouse (Astro + Cloudflare).

Status: Stage 1 done (setup check, business intake, keyword site map), tested on a real rebuild and a fictional new build. Design, build, audit and deploy skills come next.

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

---

## Part of AI Ranking

This is one of the free tools from **AI Ranking**, the community where we learn how to get businesses found on Google and recommended by AI (ChatGPT, Google AI Overviews, Perplexity).

**Free community:** [skool.com/ai-ranking-free](https://skool.com/ai-ranking-free)  
Every free skill in one place, with setup guides.

**Premium:** [skool.com/ai-ranking](https://skool.com/ai-ranking)  
For when you want help, not just tools:
- Support when a skill or a site gets stuck
- 1-1 sessions
- Live Q&A calls
- The full training on how to rank in AI search

Built by [Nico Gorrono](https://airankingskool.com/about/)
