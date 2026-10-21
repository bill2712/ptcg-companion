import type { CollectionEntry } from 'astro:content';
import type { Energy } from './energy';

// The glob loader lowercases ids ("zh-tw/..."), so read language and slug from the file path.
const parts = (g: CollectionEntry<'guides'>) => {
  const m = (g.filePath ?? '').match(/guides\/([^/]+)\/([^/]+)\.md$/);
  if (!m) throw new Error(`Unexpected guide path: ${g.filePath}`);
  return { lang: m[1], slug: m[2] };
};
export const guideLang = (g: CollectionEntry<'guides'>) => parts(g).lang;
export const guideSlug = (g: CollectionEntry<'guides'>) => parts(g).slug;

// Energy type (badge + card colour) for each guide card.
const meta: Record<string, Energy> = {
  'how-to-use-ptcg-companion': 'Lightning',
  'special-conditions': 'Psychic',
  'turn-structure': 'Water',
  'prize-cards-and-winning': 'Dragon',
  'damage-calculation': 'Fire',
  'match-timer-and-tournament-play': 'Darkness',
  'deck-building-probability': 'Metal',
  'pokemon-tcg-glossary': 'Grass',
  'how-to-play-pokemon-tcg': 'Fire',
  'how-to-read-a-pokemon-card': 'Water',
  'pokemon-card-types': 'Grass',
  'common-rules-mistakes': 'Fighting',
  'pokemon-tcg-vs-tcg-pocket': 'Stellar',
  'going-first-and-mulligans': 'Lightning',
  'weakness-and-resistance': 'Fighting',
  'retreat-and-switching': 'Colorless',
  'how-to-build-a-pokemon-deck': 'Psychic',
  'standard-expanded-and-rotation': 'Dragon',
};
export const guideType = (slug: string): Energy => meta[slug] ?? 'Colorless';

// Order of the sections on the guides index.
export const guideCategories = ['beginner', 'rules', 'strategy', 'reference'] as const;
export type GuideCategory = (typeof guideCategories)[number];

// Energy type for each tool card.
const toolMeta: Record<string, Energy> = {
  'coin-flip': 'Lightning',
  'probability-calculator': 'Water',
  'damage-calculator': 'Fire',
  'match-tracker': 'Fighting',
  'deck-checker': 'Grass',
  'tournament-calculator': 'Metal',
};
export const toolType = (slug: string): Energy => toolMeta[slug] ?? 'Colorless';

/** Rough reading time in minutes (CJK counted per character). */
export const readingMinutes = (body = '') => {
  const cjk = (body.match(/[㐀-鿿]/g) ?? []).length;
  const words = body.replace(/[㐀-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220 + cjk / 450));
};
