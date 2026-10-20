import { siteConfig } from '../site.config';

export const absUrl = (path: string) => new URL(path, siteConfig.siteUrl).href;

/** schema.org BreadcrumbList from [name, path] pairs, home first. */
export const breadcrumbLd = (items: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: absUrl(path),
  })),
});
