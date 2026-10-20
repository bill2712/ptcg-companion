import type { APIRoute } from 'astro';
import { siteConfig } from '../site.config';

// Generated from site.config.ts so the publisher ID lives in one place.
export const GET: APIRoute = () => {
  const id = siteConfig.adsense.publisherId;
  const body = id
    ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`
    : '# AdSense publisher ID not set yet (see src/site.config.ts)\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
