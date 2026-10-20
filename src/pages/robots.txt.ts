import type { APIRoute } from 'astro';
import { siteConfig, isPreviewBuild } from '../site.config';

export const GET: APIRoute = () =>
  new Response(
    isPreviewBuild
      ? 'User-agent: *\nAllow: /\n' // previews carry a noindex tag instead
      : `User-agent: *\nAllow: /\n\nSitemap: ${siteConfig.siteUrl}/sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
