# PTCG Companion

Free Pokémon TCG match assistant: damage counters, Special Conditions, Prize cards, Pokémon Checkup, coin flip and match timer, plus original rule guides. Built with Astro + React + Tailwind.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the build |

## Deployment

The site is hosted on Cloudflare Workers (static assets). Cloudflare Workers Builds deploys `main` automatically; other branches become preview builds.

- `wrangler.jsonc`: serves `dist/` and returns `dist/404.html` for unknown URLs.
- `public/_headers`: security headers and caching rules, applied by Cloudflare.

## Ads and donations: `src/site.config.ts`

Everything monetisation-related lives in one file:

- `siteUrl`: the public domain. Used for canonical URLs, sitemap, robots.txt.
- `adsense.publisherId`: e.g. `pub-1234567890123456`. When empty, no AdSense code loads and `/ads.txt` contains only a comment.
- `adsense.slots.content`: ad unit ID for guide pages. Leave empty to rely on Auto ads.
- `adsense.showOnCounter`: off by default. Ads next to fast-tapped game buttons cause accidental clicks, which AdSense counts as invalid traffic.
- `donation.kofi` / `buyMeACoffee` / `paypal`: unused ones are hidden.

## AdSense checklist

1. Use a domain you own (AdSense does not accept `*.pages.dev` subdomains) and set `siteUrl`.
2. Fill in `adsense.publisherId`, deploy, then add the site in AdSense. `ads.txt` is generated automatically.
3. In AdSense > Privacy & messaging, publish the European regulations (GDPR) message. The site already sets Google Consent Mode v2 defaults for EEA/UK/CH.
4. In Auto ads settings, exclude the counter pages (`/` and `/<lang>/`) if you turn Auto ads on. The AdSense script is only loaded on content pages unless `showOnCounter` is true.

## Content

- Guides: `src/content/guides/<lang>/<slug>.md` (English and Traditional Chinese). Same file name in both folders = translation.
- Counter UI strings: `src/locales/translations.ts`, `siteTranslations.ts`, `onboardTranslations.ts` (missing keys fall back to English).
- Privacy policy, terms and contact page: `src/locales/legalPages.ts`, all 13 languages. Change `LEGAL_UPDATED` there when you edit the copy.
- About / Support copy: `src/locales/pageContent.ts`.
- Tools (`/<lang>/tools/...`: coin flip, probability calculator, damage calculator): copy in `src/locales/toolsContent.ts`, components in `src/components/tools/`.

## SEO notes

- `siteUrl` must be the address the site is really served from: canonical links, hreflang, the sitemap and robots.txt are built from it.
- The sitemap lists hreflang alternates and `<lastmod>` for guides (see `astro.config.mjs`).
- Cloudflare preview builds (any branch other than `main`) get a `noindex` tag and an empty sitemap, so previews never compete with the live site.

PTCG Companion is a fan-made tool and is not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company.
