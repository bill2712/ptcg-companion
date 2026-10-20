// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './src/site.config.ts';

export default defineConfig({
  site: siteConfig.siteUrl,
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    // The English counter lives at both / and /en/; keep only / in the sitemap.
    sitemap({ filter: (page) => !page.endsWith('/en/') && !page.includes('/404') }),
  ],
});
