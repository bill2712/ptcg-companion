// Original energy-type badges drawn for this site (not official TCG artwork).
// Each glyph is white on a coloured disc, drawn in a 24×24 box.

export type Energy =
  | 'Grass' | 'Fire' | 'Water' | 'Lightning' | 'Psychic' | 'Fighting'
  | 'Darkness' | 'Metal' | 'Dragon' | 'Colorless' | 'Stellar';

export const energyColor: Record<Energy, string> = {
  Grass: '#3fae49',
  Fire: '#f0532d',
  Water: '#2f8ae6',
  Lightning: '#f5b80f',
  Psychic: '#9a4fd6',
  Fighting: '#c86a2b',
  Darkness: '#3b4660',
  Metal: '#7f8ea3',
  Dragon: '#b8901c',
  Colorless: '#a8b0bd',
  Stellar: '#5a5ce8',
};

// `c` is the disc colour, used for details cut into the white glyph.
const glyphs: Record<Energy, (c: string) => string> = {
  Grass: (c) => `<path d="M5.5 18.5C5.5 10.5 10.5 5.5 18.5 5.5c0 8-5 13-13 13z" fill="#fff"/><path d="M6.5 17.5 14 10" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
  Fire: () => `<path d="M12 3.2c.9 3.6 5.3 5.3 5.3 10.1a5.3 5.3 0 0 1-10.6 0c0-2.4 1.3-3.9 2.6-4.9.2 1.7 1 2.8 2.2 3.1-1-2.6-.9-5.4.5-8.3z" fill="#fff"/>`,
  Water: (c) => `<path d="M12 3.4c3.1 4.1 5.7 7.2 5.7 10.4a5.7 5.7 0 0 1-11.4 0c0-3.2 2.6-6.3 5.7-10.4z" fill="#fff"/><path d="M9.4 14.2a2.8 2.8 0 0 0 2.4 2.7" stroke="${c}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
  Lightning: () => `<path d="M13.6 2.8 5.8 13.4h5.1L9.9 21.2l8.3-11.1h-5.3l.7-7.3z" fill="#fff"/>`,
  Psychic: (c) => `<path d="M2.8 12s3.6-6.2 9.2-6.2 9.2 6.2 9.2 6.2-3.6 6.2-9.2 6.2S2.8 12 2.8 12z" fill="#fff"/><circle cx="12" cy="12" r="3.4" fill="${c}"/><circle cx="13.1" cy="10.9" r="1.1" fill="#fff"/>`,
  Fighting: (c) => `<rect x="5.5" y="7" width="13" height="11.5" rx="3.4" fill="#fff"/><path d="M9.4 7.4v3.8M12.6 7.4v3.8M15.8 7.4v3.8M6 13.2h5.5" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`,
  Darkness: () => `<path d="M15.2 3.6a8.6 8.6 0 1 0 5.2 14.1 7.3 7.3 0 0 1-5.2-14.1z" fill="#fff"/>`,
  Metal: (c) => `<path d="M12 3.2 19.6 7.6v8.8L12 20.8l-7.6-4.4V7.6z" fill="#fff"/><circle cx="12" cy="12" r="3.2" fill="${c}"/>`,
  Dragon: () => `<path d="M6.2 18.8 13 4.6l1.2.6L8.3 19.6zM10.6 19.6 16.6 6l1.2.5-5.1 13.6zM15.2 19.8 19.4 9.6l1 .4-3.3 10.3z" fill="#fff"/>`,
  Colorless: () => `<path d="M12 3.2c.8 4.6 4.2 8 8.8 8.8-4.6.8-8 4.2-8.8 8.8-.8-4.6-4.2-8-8.8-8.8 4.6-.8 8-4.2 8.8-8.8z" fill="#fff"/>`,
  Stellar: () => `<path d="m12 2.8 2 5.4 5.4-2.4-2.4 5.4 5.4 2-5.4 2 2.4 5.4-5.4-2.4-2 5.4-2-5.4-5.4 2.4 2.4-5.4-5.4-2 5.4-2-2.4-5.4 5.4 2.4z" fill="#fff"/>`,
};

/** Full SVG markup for a badge: coloured disc with the white glyph. */
export const energySvg = (type: Energy, size = 24) => {
  const c = energyColor[type];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${c}"/><circle cx="12" cy="12" r="10.6" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/><g transform="translate(2.4 2.4) scale(.8)">${glyphs[type](c)}</g></svg>`;
};

/** Just the white glyph, for use on a background that is already coloured. */
export const energyGlyph = (type: Energy) => glyphs[type](energyColor[type]);

export const energyTypes = Object.keys(energyColor) as Energy[];
