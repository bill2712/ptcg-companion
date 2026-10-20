import { useEffect, useState } from 'react';
import { toolUi, type ToolUi } from '../../locales/toolsContent';
import { fmt, randomBit } from './util';

interface Props { lang: 'en' | 'zh-TW' }

type Result = { kind: 'one' | 'many' | 'until'; flips: boolean[] };

export default function CoinFlip({ lang }: Props) {
  const ui: ToolUi = toolUi[lang];
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<Result | null>(null);
  const [spin, setSpin] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ h: 0, t: 0 });

  const run = (kind: Result['kind']) => {
    if (busy) return;
    const flips: boolean[] = [];
    if (kind === 'one') flips.push(randomBit());
    if (kind === 'many') for (let i = 0; i < count; i++) flips.push(randomBit());
    if (kind === 'until') {
      // Heads until the first tails; cap keeps a freak streak finite.
      do flips.push(randomBit()); while (flips[flips.length - 1] && flips.length < 100);
    }
    setBusy(true);
    setSpin((s) => s + 1);
    try { navigator.vibrate?.(15); } catch {}
    window.setTimeout(() => {
      setResult({ kind, flips });
      const h = flips.filter(Boolean).length;
      setTally((x) => ({ h: x.h + h, t: x.t + flips.length - h }));
      setBusy(false);
    }, 450);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('button, input, select')) return;
      e.preventDefault();
      run('one');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const heads = result ? result.flips.filter(Boolean).length : 0;
  const face = result?.kind === 'one' ? (result.flips[0] ? 'H' : 'T') : null;
  const total = tally.h + tally.t;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => run('one')}
          aria-label={ui.flip}
          className={`press w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg border-4 select-none ${
            face === 'H'
              ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 text-amber-950'
              : face === 'T'
                ? 'bg-gradient-to-br from-zinc-300 to-zinc-500 border-zinc-200 text-zinc-900'
                : 'bg-gradient-to-br from-amber-200 to-amber-400 border-amber-100 text-amber-950'
          }`}
          style={{ transform: `rotateY(${spin * 720}deg)`, transition: 'transform 450ms cubic-bezier(.2,.7,.3,1)' }}
        >
          {busy ? '…' : face === 'H' ? ui.heads : face === 'T' ? ui.tails : '🪙'}
        </button>
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {busy || !result
            ? ui.tapToFlip
            : result.kind === 'one'
              ? (result.flips[0] ? ui.heads : ui.tails)
              : result.kind === 'many'
                ? fmt(ui.headsOf, { h: heads, n: result.flips.length })
                : fmt(ui.headsBeforeTails, { h: heads })}
        </p>
      </div>

      {result && result.kind !== 'one' && !busy && (
        <div className="mt-6 text-center">
          <p className="text-3xl font-bold tracking-tight text-fg tabular mb-3">
            {result.kind === 'many' ? fmt(ui.headsOf, { h: heads, n: result.flips.length }) : fmt(ui.headsBeforeTails, { h: heads })}
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {result.flips.map((h, i) => (
              <li key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${h ? 'bg-amber-400 text-amber-950' : 'bg-zinc-400 text-zinc-900'}`}>
                {h ? ui.heads.slice(0, 1) : ui.tails.slice(0, 1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-surface-2">
          <label className="sr-only" htmlFor="coin-count">{ui.coins}</label>
          <select
            id="coin-count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-11 px-3 rounded-xl bg-surface border border-line text-fg tabular"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button type="button" onClick={() => run('many')} className="press flex-1 h-11 rounded-xl bg-accent text-accent-fg font-semibold">
            {fmt(ui.flipN, { n: count })}
          </button>
        </div>
        <button type="button" onClick={() => run('until')} className="press h-[60px] rounded-2xl bg-surface-2 border border-line text-fg font-semibold hover:bg-surface-3">
          {ui.untilTails}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>
          {ui.history}: <b className="text-fg tabular">{tally.h}</b> {ui.heads} · <b className="text-fg tabular">{tally.t}</b> {ui.tails}
          {total > 0 && <span className="text-faint"> ({Math.round((tally.h / total) * 100)}% / {total} {ui.flips})</span>}
        </span>
        {total > 0 && (
          <button type="button" onClick={() => setTally({ h: 0, t: 0 })} className="text-accent font-medium">{ui.resetTally}</button>
        )}
      </div>
    </div>
  );
}
