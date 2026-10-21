import { useEffect, useMemo, useState } from 'react';
import { tourUi } from '../../locales/newToolsUi';
import { clampInt, fmt } from './util';

interface Props { lang: 'en' | 'zh-TW' }

const KEY = 'ptcg_tool_tournament';

/** Common Swiss structure for one-day best-of-three events. Organisers can differ. */
export const structure: { max: number; rounds: number; cut: number }[] = [
  { max: 8, rounds: 3, cut: 0 },
  { max: 12, rounds: 4, cut: 2 },
  { max: 20, rounds: 5, cut: 4 },
  { max: 32, rounds: 5, cut: 8 },
  { max: 64, rounds: 6, cut: 8 },
  { max: 128, rounds: 7, cut: 8 },
  { max: 226, rounds: 8, cut: 8 },
  { max: 409, rounds: 9, cut: 16 },
  { max: Infinity, rounds: 10, cut: 32 },
];
export const suggest = (players: number) => structure.find((s) => players <= s.max) ?? structure[structure.length - 1];

type Row = { w: number; l: number; t: number; pts: number; n: number; made: number };

/** Monte Carlo Swiss: pair by points, random results, random tiebreakers. */
const simulate = (players: number, rounds: number, cut: number, tieRate: number) => {
  const sims = Math.max(150, Math.min(2500, Math.floor(2_500_000 / (players * rounds))));
  const rows = new Map<string, Row>();
  const pts = new Int16Array(players);
  const w = new Int8Array(players);
  const l = new Int8Array(players);
  const t = new Int8Array(players);
  const tb = new Float64Array(players);
  const order = Array.from({ length: players }, (_, i) => i);
  const byPoints = (a: number, b: number) => pts[b] - pts[a] || tb[a] - tb[b];
  for (let s = 0; s < sims; s++) {
    pts.fill(0); w.fill(0); l.fill(0); t.fill(0);
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < players; i++) tb[i] = Math.random();
      order.sort(byPoints);
      for (let i = 0; i + 1 < players; i += 2) {
        const a = order[i], b = order[i + 1];
        const x = Math.random();
        if (x < tieRate) { pts[a] += 1; pts[b] += 1; t[a]++; t[b]++; }
        else if (x < tieRate + (1 - tieRate) / 2) { pts[a] += 3; w[a]++; l[b]++; }
        else { pts[b] += 3; w[b]++; l[a]++; }
      }
      // Odd player out gets a bye, which counts as a win.
      if (players % 2) { const a = order[players - 1]; pts[a] += 3; w[a]++; }
    }
    // Final standings: points, then a random stand-in for Opponents' Win %.
    for (let i = 0; i < players; i++) tb[i] = Math.random();
    order.sort(byPoints);
    for (let rank = 0; rank < players; rank++) {
      const p = order[rank];
      const k = `${w[p]}-${l[p]}-${t[p]}`;
      let row = rows.get(k);
      if (!row) { row = { w: w[p], l: l[p], t: t[p], pts: pts[p], n: 0, made: 0 }; rows.set(k, row); }
      row.n++;
      if (rank < cut) row.made++;
    }
  }
  const total = sims * players;
  return [...rows.values()]
    .map((r) => ({ ...r, share: r.n / total, p: r.made / r.n }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w);
};

export default function TournamentCalc({ lang }: Props) {
  const ui = tourUi[lang];
  const [players, setPlayers] = useState(32);
  const [rounds, setRounds] = useState(5);
  const [cut, setCut] = useState(8);
  const [custom, setCustom] = useState(false);
  const [tiePct, setTiePct] = useState(5);
  const [me, setMe] = useState({ w: 0, l: 0, t: 0 });
  const [rows, setRows] = useState<ReturnType<typeof simulate> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v) { setPlayers(v.players ?? 32); setCustom(!!v.custom); setRounds(v.rounds ?? 5); setCut(v.cut ?? 8); setTiePct(v.tiePct ?? 5); }
    } catch {}
  }, []);

  const n = clampInt(players, 4, 1024);
  const sug = suggest(n);
  const R = custom ? clampInt(rounds, 1, 15) : sug.rounds;
  const C = custom ? clampInt(cut, 0, n) : sug.cut;
  const tie = clampInt(tiePct, 0, 40) / 100;

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ players, custom, rounds, cut, tiePct })); } catch {}
    setBusy(true);
    const id = window.setTimeout(() => {
      setRows(C > 0 ? simulate(n, R, C, tie) : null);
      setBusy(false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [n, R, C, tie]);

  // Rows worth showing: from the top down to where the cut becomes very unlikely.
  const visible = useMemo(() => {
    if (!rows) return [];
    const r = rows.filter((x) => x.share >= 0.0005);
    const lastLikely = r.reduce((i, x, j) => (x.p >= 0.01 ? j : i), 0);
    return r.slice(0, Math.min(r.length, lastLikely + 3));
  }, [rows]);

  const safe = visible.filter((x) => x.p >= 0.9);
  const minSafePts = safe.length ? Math.min(...safe.map((x) => x.pts)) : null;
  const bubble = visible.filter((x) => x.p >= 0.05 && x.p < 0.9);

  const played = me.w + me.l + me.t;
  const left = Math.max(0, R - played);
  const outcomes = useMemo(() => {
    if (!rows || played > R) return [];
    const out: { w: number; l: number; t: number; p: number | null }[] = [];
    for (let lw = left; lw >= 0; lw--) {
      for (let lt = 0; lt <= left - lw && lt <= 1; lt++) {
        const ll = left - lw - lt;
        const fw = me.w + lw, fl = me.l + ll, ft = me.t + lt;
        const row = rows.find((x) => x.w === fw && x.l === fl && x.t === ft);
        out.push({ w: fw, l: fl, t: ft, p: row ? row.p : null });
      }
    }
    return out.slice(0, 6);
  }, [rows, me, left, played, R]);

  const field = 'h-11 w-full px-3 rounded-xl bg-surface-2 border border-line text-fg tabular text-lg font-semibold text-center focus:outline-none focus:border-accent';
  const num = (id: string, label: string, value: number, set: (v: number) => void, min: number, max: number, disabled = false) => (
    <label htmlFor={id} className={`block ${disabled ? 'opacity-50' : ''}`}>
      <span className="block text-sm font-medium text-muted mb-1.5">{label}</span>
      <div className="flex gap-2">
        <button type="button" disabled={disabled} aria-label="−" onClick={() => set(Math.max(min, value - 1))} className="press w-11 h-11 shrink-0 rounded-xl bg-surface-2 border border-line text-fg text-lg">−</button>
        <input id={id} type="number" inputMode="numeric" disabled={disabled} min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className={field} />
        <button type="button" disabled={disabled} aria-label="+" onClick={() => set(Math.min(max, value + 1))} className="press w-11 h-11 shrink-0 rounded-xl bg-surface-2 border border-line text-fg text-lg">+</button>
      </div>
    </label>
  );
  const pctTxt = (p: number) => (p >= 0.995 ? '>99%' : p < 0.005 ? (p > 0 ? '<1%' : '0%') : `${Math.round(p * 100)}%`);
  const rec = (x: { w: number; l: number; t: number }) => `${x.w}-${x.l}-${x.t}`;
  const tone = (p: number) => (p >= 0.9 ? 'text-emerald-600 dark:text-emerald-400' : p >= 0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted');

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
        <div className="grid sm:grid-cols-2 gap-5">
          {num('t-players', ui.players, players, setPlayers, 4, 1024)}
          {num('t-tie', ui.tieRate, tiePct, setTiePct, 0, 40)}
        </div>
        <label className="mt-5 flex items-center gap-3 text-sm text-fg cursor-pointer">
          <input type="checkbox" checked={custom} onChange={(e) => { setCustom(e.target.checked); if (e.target.checked) { setRounds(sug.rounds); setCut(sug.cut); } }} className="w-5 h-5 accent-[var(--accent)]" />
          {ui.customStructure}
        </label>
        {custom && (
          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            {num('t-rounds', ui.rounds, rounds, setRounds, 1, 15)}
            {num('t-cut', ui.cut, cut, setCut, 0, n)}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-accent-soft border border-accent/30">
            <p className="text-xs text-muted mb-1">{ui.swissRounds}</p>
            <p className="text-2xl font-bold tabular text-accent">{R}</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-2 border border-line">
            <p className="text-xs text-muted mb-1">{ui.topCut}</p>
            <p className="text-2xl font-bold tabular text-fg">{C ? fmt(ui.topN, { n: C }) : ui.noCut}</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-2 border border-line">
            <p className="text-xs text-muted mb-1">{ui.maxPoints}</p>
            <p className="text-2xl font-bold tabular text-fg">{R * 3}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-faint">{ui.points}</p>
      </div>

      {C === 0 && (
        <div className="p-6 rounded-3xl bg-surface border border-line text-sm text-muted">{ui.noCutDesc}</div>
      )}

      {C > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-fg">{ui.chanceTitle}</h2>
            {busy && <span className="text-xs text-muted">{ui.calculating}</span>}
          </div>
          {rows && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-muted mb-1">{ui.safe}</p>
                  <p className="text-lg font-bold text-fg tabular">{safe.length ? safe.filter((x) => x.pts === minSafePts).map(rec).join(' / ') : '–'}</p>
                  {minSafePts !== null && <p className="text-xs text-faint mt-0.5">{fmt(ui.ptsN, { n: minSafePts })}</p>}
                </div>
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/40">
                  <p className="text-xs text-muted mb-1">{ui.bubble}</p>
                  <p className="text-lg font-bold text-fg tabular">{bubble.length ? bubble.slice(0, 3).map(rec).join(' / ') : '–'}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-2 pr-3 font-medium">{ui.record}</th>
                      <th className="py-2 pr-3 font-medium">{ui.pointsCol}</th>
                      <th className="py-2 pr-3 font-medium">{ui.playersWith}</th>
                      <th className="py-2 font-medium">{ui.makeCut}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((x) => (
                      <tr key={rec(x)} className="border-t border-line">
                        <td className="py-2 pr-3 text-fg font-semibold">{rec(x)}</td>
                        <td className="py-2 pr-3 text-muted">{x.pts}</td>
                        <td className="py-2 pr-3 text-muted">{(x.share * n).toFixed(x.share * n < 10 ? 1 : 0)}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, x.p * 90)}px` }} aria-hidden="true" />
                            <span className={`font-semibold ${tone(x.p)}`}>{pctTxt(x.p)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-faint">{ui.simNote}</p>
            </>
          )}
        </div>
      )}

      {C > 0 && rows && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <h2 className="text-xl font-bold text-fg mb-1">{ui.myTitle}</h2>
          <p className="text-sm text-muted mb-5">{ui.myHint}</p>
          <div className="grid grid-cols-3 gap-3">
            {(['w', 'l', 't'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-sm font-medium text-muted mb-1.5">{ui[k]}</span>
                <input type="number" inputMode="numeric" min={0} max={R} value={me[k]} onChange={(e) => setMe((m) => ({ ...m, [k]: clampInt(e.target.value, 0, R) }))} className={field} />
              </label>
            ))}
          </div>
          {played > R ? (
            <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{fmt(ui.tooManyRounds, { n: R })}</p>
          ) : left === 0 ? (
            <p className="mt-4 text-sm text-fg">{fmt(ui.finalChance, { r: rec(me), p: outcomes[0]?.p != null ? pctTxt(outcomes[0].p) : '<1%' })}</p>
          ) : (
            <>
              <p className="mt-4 mb-2 text-sm text-muted">{fmt(ui.roundsLeft, { n: left })}</p>
              <ul className="space-y-2">
                {outcomes.map((o) => (
                  <li key={rec(o)} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface-2 border border-line">
                    <span className="text-sm text-fg">{fmt(ui.finishAt, { r: rec(o) })}</span>
                    <span className={`text-sm font-bold tabular ${tone(o.p ?? 0)}`}>{o.p != null ? pctTxt(o.p) : '<1%'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
