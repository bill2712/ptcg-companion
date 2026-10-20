import { useEffect, useState } from 'react';
import { toolUi, type ToolUi } from '../../locales/toolsContent';
import { clampInt, fmt, hyper, pct } from './util';

interface Props { lang: 'en' | 'zh-TW' }

const KEY = 'ptcg_tool_prob';
const PRIZES = 6;
const HAND = 7;

export default function ProbabilityCalc({ lang }: Props) {
  const ui: ToolUi = toolUi[lang];
  const [deck, setDeck] = useState(60);
  const [copies, setCopies] = useState(4);
  const [seen, setSeen] = useState(8);
  const [basics, setBasics] = useState(12);

  // Remember the last inputs, so deck builders can come back to them.
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v) { setDeck(v.deck ?? 60); setCopies(v.copies ?? 4); setSeen(v.seen ?? 8); setBasics(v.basics ?? 12); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ deck, copies, seen, basics })); } catch {}
  }, [deck, copies, seen, basics]);

  const d = clampInt(deck, HAND + PRIZES, 200);
  const k = clampInt(copies, 1, d);
  const s = clampInt(seen, 1, d - PRIZES);
  const b = clampInt(basics, 1, d);

  // The Prize cards are a uniformly random 6 of the deck, independent of draw order.
  const pOpen = 1 - hyper(d, k, HAND, 0);
  const pSeen = 1 - hyper(d, k, s, 0);
  const pPrizeAny = 1 - hyper(d, k, PRIZES, 0);
  const pPrizeAll = k <= PRIZES ? hyper(d, k, PRIZES, k) : 0;
  const pMull = hyper(d, b, HAND, 0);
  const rows = Array.from({ length: Math.min(k, HAND) + 1 }, (_, x) => ({
    x,
    hand: hyper(d, k, HAND, x),
    prizes: x <= PRIZES ? hyper(d, k, PRIZES, x) : 0,
  }));

  const field = 'h-11 w-full px-3 rounded-xl bg-surface-2 border border-line text-fg tabular text-lg font-semibold focus:outline-none focus:border-accent';
  const num = (id: string, label: string, value: number, set: (n: number) => void, min: number, max: number, hint?: string) => (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-medium text-muted mb-1.5">{label}</span>
      <div className="flex gap-2">
        <button type="button" aria-label="−" onClick={() => set(Math.max(min, value - 1))} className="press w-11 h-11 shrink-0 rounded-xl bg-surface-2 border border-line text-fg text-lg">−</button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className={field + ' text-center'} />
        <button type="button" aria-label="+" onClick={() => set(Math.min(max, value + 1))} className="press w-11 h-11 shrink-0 rounded-xl bg-surface-2 border border-line text-fg text-lg">+</button>
      </div>
      {hint && <span className="block text-xs text-faint mt-1.5">{hint}</span>}
    </label>
  );

  const stat = (label: string, p: number, strong = false) => (
    <div className={`p-4 rounded-2xl border ${strong ? 'bg-accent-soft border-accent/30' : 'bg-surface-2 border-line'}`}>
      <p className="text-xs text-muted leading-snug mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight tabular ${strong ? 'text-accent' : 'text-fg'}`}>{pct(p)}</p>
      {p > 0 && p < 0.1 && <p className="text-xs text-faint mt-0.5">{fmt(ui.oneIn, { n: Math.round(1 / p).toLocaleString(lang) })}</p>}
    </div>
  );

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
      <div className="grid sm:grid-cols-2 gap-5">
        {num('p-deck', ui.deckSize, deck, setDeck, HAND + PRIZES, 200)}
        {num('p-copies', ui.copies, copies, setCopies, 1, d)}
        {num('p-seen', ui.seen, seen, setSeen, 1, d - PRIZES, ui.seenHint)}
        {num('p-basics', ui.basics, basics, setBasics, 1, d)}
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3" aria-live="polite">
        {stat(ui.inOpening, pOpen, true)}
        {stat(fmt(ui.atLeastOne, { n: s }), pSeen)}
        {stat(ui.prizedAny, pPrizeAny)}
        {stat(ui.prizedAll, pPrizeAll)}
        {stat(ui.mulligan, pMull, true)}
      </div>

      <h3 className="mt-8 mb-3 text-sm font-semibold text-fg">{ui.distribution}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 pr-4 font-medium">{ui.exactly}</th>
              <th className="py-2 pr-4 font-medium">{ui.inHand}</th>
              <th className="py-2 font-medium">{ui.inPrizes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.x} className="border-t border-line">
                <td className="py-2 pr-4 text-fg font-semibold">{r.x}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(2, r.hand * 100)}px` }} aria-hidden="true" />
                    <span className="text-fg">{pct(r.hand)}</span>
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(2, r.prizes * 100)}px` }} aria-hidden="true" />
                    <span className="text-fg">{pct(r.prizes)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
