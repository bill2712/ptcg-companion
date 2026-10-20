// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { siteConfig, isPreviewBuild } from './src/site.config.ts';
import { langs, contentLangs, localePath } from './src/locales/translations.ts';

// Guide translations and last-updated dates, read from the Markdown files so
// the sitemap can list hreflang alternates and <lastmod> for every guide.
const guidesDir = './src/content/guides';
/** slug -> { lang -> updated date } @type {Record<string, Record<string, string | undefined>>} */
const guideIndex = {};
for (const lang of fs.readdirSync(guidesDir)) {
  for (const file of fs.readdirSync(path.join(guidesDir, lang))) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const slug = file.replace(/\.md$/, '');
    const src = fs.readFileSync(path.join(guidesDir, lang, file), 'utf8');
    const updated = src.match(/^updated:\s*(\S+)/m)?.[1];
    (guideIndex[slug] ??= {})[lang] = updated;
  }
}

/** Languages a page exists in, from its path after the language prefix. @param {string} suffix @returns {string[]} */
const pageLangs = (suffix) => {
  const guide = suffix.match(/^guides\/([^/]+)\/$/);
  if (guide) return Object.keys(guideIndex[guide[1]] ?? {});
  if (/^(guides|tools|about|support)\//.test(suffix)) return [...contentLangs];
  return [...langs]; // counter and legal pages exist in every language
};

export default defineConfig({
  site: siteConfig.siteUrl,
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    sitemap({
      // The English counter lives at both / and /en/; keep only / in the sitemap.
      // Preview builds are noindex, so they get an empty sitemap.
      filter: (page) => !isPreviewBuild && !page.endsWith('/en/') && !page.includes('/404'),
      serialize(item) {
        const { pathname } = new URL(item.url);
        const m = pathname.match(/^\/([^/]+)\/(.*)$/);
        const lang = pathname === '/' ? 'en' : m?.[1] ?? 'en';
        const suffix = pathname === '/' ? '' : m?.[2] ?? '';
        const alternates = pageLangs(suffix);
        if (alternates.length > 1) {
          const abs = (/** @type {string} */ l) => new URL(localePath(l, suffix), siteConfig.siteUrl).href;
          item.links = [
            ...alternates.map((l) => ({ lang: l, url: abs(l) })),
            { lang: 'x-default', url: abs(alternates.includes('en') ? 'en' : alternates[0]) },
          ];
        }
        const guide = suffix.match(/^guides\/([^/]+)\/$/);
        const updated = guide && guideIndex[guide[1]]?.[lang];
        if (updated) item.lastmod = new Date(updated).toISOString();
        return item;
      },
    }),
  ],
});
