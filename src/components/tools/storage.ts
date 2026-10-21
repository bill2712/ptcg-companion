// Data the new tools keep in the browser (localStorage only, never sent anywhere).
// The match tracker and the deck checker share deck names through here.

export type Result = 'W' | 'L' | 'T';
export type Turn = 'first' | 'second' | '';

export interface MatchRecord {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  deck: string;
  opp: string;
  result: Result;
  turn: Turn;
  event?: string;
  note?: string;
}

export interface SavedDeck {
  name: string;
  list: string;
  /** Card names marked as Basic Pokémon. */
  basics: string[];
  updated: number;
}

export const RECORDS_KEY = 'ptcg_match_records_v1';
export const DECKS_KEY = 'ptcg_saved_decks_v1';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const isRecord = (r: any): r is MatchRecord =>
  r && typeof r === 'object' && typeof r.deck === 'string' && typeof r.opp === 'string' && ['W', 'L', 'T'].includes(r.result);

export const loadRecords = (): MatchRecord[] => {
  const v = read<unknown>(RECORDS_KEY, []);
  return Array.isArray(v) ? v.filter(isRecord) : [];
};
export const saveRecords = (r: MatchRecord[]) => write(RECORDS_KEY, r);

export const loadDecks = (): SavedDeck[] => {
  const v = read<unknown>(DECKS_KEY, []);
  return Array.isArray(v) ? v.filter((d: any) => d && typeof d.name === 'string' && typeof d.list === 'string') : [];
};
export const saveDecks = (d: SavedDeck[]) => write(DECKS_KEY, d);

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Today in the visitor's time zone, as yyyy-mm-dd. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Offer `text` as a file download. */
export const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
