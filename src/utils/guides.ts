import type { CollectionEntry } from 'astro:content';

// The glob loader lowercases ids ("zh-tw/..."), so read language and slug from the file path.
const parts = (g: CollectionEntry<'guides'>) => {
  const m = (g.filePath ?? '').match(/guides\/([^/]+)\/([^/]+)\.md$/);
  if (!m) throw new Error(`Unexpected guide path: ${g.filePath}`);
  return { lang: m[1], slug: m[2] };
};
export const guideLang = (g: CollectionEntry<'guides'>) => parts(g).lang;
export const guideSlug = (g: CollectionEntry<'guides'>) => parts(g).slug;
