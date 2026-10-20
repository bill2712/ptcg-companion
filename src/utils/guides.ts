import type { CollectionEntry } from 'astro:content';

// The glob loader lowercases ids ("zh-tw/..."), so read language and slug from the file path.
const parts = (g: CollectionEntry<'guides'>) => {
  const m = (g.filePath ?? '').match(/guides\/([^/]+)\/([^/]+)\.md$/);
  if (!m) throw new Error(`Unexpected guide path: ${g.filePath}`);
  return { lang: m[1], slug: m[2] };
};
export const guideLang = (g: CollectionEntry<'guides'>) => parts(g).lang;
export const guideSlug = (g: CollectionEntry<'guides'>) => parts(g).slug;

// Icon and colour for each guide card.
const meta: Record<string, { icon: string; tint: string }> = {
  'how-to-use-ptcg-companion': { icon: '📱', tint: 'from-violet-500/20 to-indigo-500/5' },
  'special-conditions': { icon: '🧪', tint: 'from-green-500/20 to-emerald-500/5' },
  'turn-structure': { icon: '🔄', tint: 'from-sky-500/20 to-blue-500/5' },
  'prize-cards-and-winning': { icon: '🏆', tint: 'from-amber-500/20 to-yellow-500/5' },
  'damage-calculation': { icon: '💥', tint: 'from-rose-500/20 to-red-500/5' },
  'match-timer-and-tournament-play': { icon: '⏱️', tint: 'from-fuchsia-500/20 to-pink-500/5' },
  'deck-building-probability': { icon: '🎲', tint: 'from-sky-500/20 to-cyan-500/5' },
  'pokemon-tcg-glossary': { icon: '📚', tint: 'from-orange-500/20 to-amber-500/5' },
};
export const guideMeta = (slug: string) => meta[slug] ?? { icon: '📖', tint: 'from-zinc-500/20 to-zinc-500/5' };

/** Rough reading time in minutes (CJK counted per character). */
export const readingMinutes = (body = '') => {
  const cjk = (body.match(/[㐀-鿿]/g) ?? []).length;
  const words = body.replace(/[㐀-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220 + cjk / 450));
};
