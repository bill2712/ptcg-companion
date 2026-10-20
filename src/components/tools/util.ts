/** Replace {name} placeholders. */
export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** Fair coin: one bit from the browser's cryptographic RNG. */
export const randomBit = () => {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] & 1) === 1;
};

/** n choose k as a float; exact enough for decks up to a few hundred cards. */
export const choose = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
};

/** P(exactly x successes) drawing `draws` cards from `pop` with `succ` successes. */
export const hyper = (pop: number, succ: number, draws: number, x: number) =>
  choose(succ, x) * choose(pop - succ, draws - x) / choose(pop, draws);

export const pct = (p: number) => {
  const v = p * 100;
  if (v === 0) return '0%';
  if (v < 0.01) return '<0.01%';
  if (v < 1) return `${v.toFixed(2)}%`;
  if (v > 99.9 && v < 100) return '>99.9%';
  return `${v.toFixed(1)}%`;
};

export const clampInt = (v: string | number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
