import { useEffect, useMemo, useRef, useState } from 'react';
import { trackerUi } from '../../locales/newToolsUi';
import { fmt } from './util';
import {
  download, loadDecks, loadRecords, newId, saveRecords, today,
  type MatchRecord, type Result, type Turn,
} from './storage';

interface Props { lang: 'en' | 'zh-TW' }

type Tally = { w: number; l: number; t: number; n: number };
const tally = (rs: MatchRecord[]): Tally => {
  const x = { w: 0, l: 0, t: 0, n: rs.length };
  for (const r of rs) { if (r.result === 'W') x.w++; else if (r.result === 'L') x.l++; else x.t++; }
  return x;
};
// Win rate counts a tie as a game that was not won, as most players do.
const rate = (x: Tally) => (x.n ? x.w / x.n : 0);
const pctTxt = (x: Tally) => (x.n ? `${Math.round(rate(x) * 100)}%` : '–');
const wlt = (x: Tally) => `${x.w}-${x.l}-${x.t}`;

const resultStyle: Record<Result, string> = {
  W: 'bg-emerald-500 text-white border-emerald-500',
  L: 'bg-rose-500 text-white border-rose-500',
  T: 'bg-amber-400 text-amber-950 border-amber-400',
};

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export default function MatchTracker({ lang }: Props) {
  const ui = trackerUi[lang];
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deckNames, setDeckNames] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form
  const [deck, setDeck] = useState('');
  const [opp, setOpp] = useState('');
  const [result, setResult] = useState<Result | ''>('');
  const [turn, setTurn] = useState<Turn>('');
  const [date, setDate] = useState('');
  const [event, setEvent] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const rs = loadRecords();
    setRecords(rs);
    setDeckNames(loadDecks().map((d) => d.name));
    setDate(today());
    // Start from the last deck played, since most people log several games in a row.
    if (rs[0]) { setDeck(rs[0].deck); setEvent(rs[0].date === today() ? rs[0].event ?? '' : ''); }
    // Prefill from the match counter's win screen (?result=W&turn=first&opp=...).
    const q = new URLSearchParams(location.search);
    const r = q.get('result');
    if (r === 'W' || r === 'L' || r === 'T') {
      setResult(r);
      const tn = q.get('turn');
      if (tn === 'first' || tn === 'second') setTurn(tn);
      const o = q.get('opp');
      if (o) setNote(o.slice(0, 60));
      setMsg(ui.fromCounter);
      history.replaceState(null, '', location.pathname);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveRecords(records); }, [records, loaded]);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 4000); };

  const add = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!result) { flash(ui.pickResult); return; }
    const rec: MatchRecord = {
      id: newId(),
      date: date || today(),
      deck: deck.trim() || ui.unnamed,
      opp: opp.trim() || ui.unknown,
      result,
      turn,
      ...(event.trim() ? { event: event.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    setRecords((rs) => [rec, ...rs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)));
    setOpp(''); setResult(''); setTurn(''); setNote('');
    flash(ui.added);
  };

  const remove = (id: string) => {
    if (!window.confirm(ui.confirmDelete)) return;
    setRecords((rs) => rs.filter((r) => r.id !== id));
  };

  const decks = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) m.set(r.deck, (m.get(r.deck) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  }, [records]);
  const opps = useMemo(() => [...new Set(records.map((r) => r.opp))].sort(), [records]);
  const view = filter ? records.filter((r) => r.deck === filter) : records;
  const all = tally(view);
  const first = tally(view.filter((r) => r.turn === 'first'));
  const second = tally(view.filter((r) => r.turn === 'second'));

  const matchups = useMemo(() => {
    const m = new Map<string, MatchRecord[]>();
    for (const r of view) m.set(r.opp, [...(m.get(r.opp) ?? []), r]);
    return [...m.entries()].map(([o, rs]) => ({ o, x: tally(rs) })).sort((a, b) => b.x.n - a.x.n || rate(b.x) - rate(a.x));
  }, [view]);

  const byDeck = useMemo(() => decks.map((d) => ({ d, x: tally(records.filter((r) => r.deck === d)) })), [decks, records]);

  // Current streak, newest first.
  const streak = (() => {
    if (!view.length) return null;
    const r0 = view[0].result;
    let n = 0;
    for (const r of view) { if (r.result === r0) n++; else break; }
    return { r: r0, n };
  })();
  const last10 = tally(view.slice(0, 10));

  const exportCsv = () => {
    const head = ['date', 'deck', 'opponent', 'result', 'turn', 'event', 'note'];
    const rows = records.map((r) => [r.date, r.deck, r.opp, r.result, r.turn, r.event ?? '', r.note ?? ''].map(csvCell).join(','));
    download(`ptcg-match-records-${today()}.csv`, [head.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
  };
  const exportJson = () => download(`ptcg-match-records-${today()}.json`, JSON.stringify(records, null, 2), 'application/json');
  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data)) throw new Error();
      const ok = data.filter((r: any) => r && typeof r.deck === 'string' && typeof r.opp === 'string' && ['W', 'L', 'T'].includes(r.result));
      const have = new Set(records.map((r) => r.id));
      const fresh = ok.map((r: any) => ({ ...r, id: typeof r.id === 'string' ? r.id : newId(), date: typeof r.date === 'string' ? r.date : today(), turn: r.turn === 'first' || r.turn === 'second' ? r.turn : '' }))
        .filter((r: MatchRecord) => !have.has(r.id));
      setRecords((rs) => [...fresh, ...rs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)));
      flash(fmt(ui.imported, { n: fresh.length }));
    } catch {
      flash(ui.importFailed);
    }
  };
  const clearAll = () => {
    if (!window.confirm(ui.confirmClear)) return;
    setRecords([]);
  };

  const field = 'h-11 w-full px-3 rounded-xl bg-surface-2 border border-line text-fg focus:outline-none focus:border-accent';
  const label = 'block text-sm font-medium text-muted mb-1.5';
  const seg = (on: boolean) => `press flex-1 h-11 rounded-xl border text-sm font-semibold ${on ? 'bg-accent text-accent-fg border-accent' : 'bg-surface-2 border-line text-fg'}`;

  const statCard = (title: string, x: Tally, strong = false) => (
    <div className={`p-4 rounded-2xl border ${strong ? 'bg-accent-soft border-accent/30' : 'bg-surface-2 border-line'}`}>
      <p className="text-xs text-muted mb-1">{title}</p>
      <p className={`text-2xl font-bold tabular ${strong ? 'text-accent' : 'text-fg'}`}>{pctTxt(x)}</p>
      <p className="text-xs text-faint tabular mt-0.5">{wlt(x)} · {fmt(ui.games, { n: x.n })}</p>
    </div>
  );

  const bar = (x: Tally) => (
    <div className="flex h-2 w-full max-w-[160px] rounded-full overflow-hidden bg-surface-3" aria-hidden="true">
      <span className="bg-emerald-500" style={{ width: `${(x.w / x.n) * 100}%` }} />
      <span className="bg-amber-400" style={{ width: `${(x.t / x.n) * 100}%` }} />
      <span className="bg-rose-500" style={{ width: `${(x.l / x.n) * 100}%` }} />
    </div>
  );

  const shown = showAll ? view : view.slice(0, 15);

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={add} className="p-6 sm:p-8 rounded-3xl bg-surface border border-line scroll-mt-24">
        <h2 className="text-xl font-bold text-fg mb-5">{ui.addTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>{ui.myDeck}</span>
            <input className={field} value={deck} onChange={(e) => setDeck(e.target.value)} list="mt-decks" placeholder={ui.deckPh} maxLength={60} />
          </label>
          <label className="block">
            <span className={label}>{ui.oppDeck}</span>
            <input className={field} value={opp} onChange={(e) => setOpp(e.target.value)} list="mt-opps" placeholder={ui.oppPh} maxLength={60} />
          </label>
        </div>
        <datalist id="mt-decks">{[...new Set([...decks, ...deckNames])].map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="mt-opps">{opps.map((d) => <option key={d} value={d} />)}</datalist>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <span className={label}>{ui.result}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={ui.result}>
              {(['W', 'L', 'T'] as Result[]).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={result === r} onClick={() => setResult(r)}
                  className={`press flex-1 h-11 rounded-xl border text-sm font-bold ${result === r ? resultStyle[r] : 'bg-surface-2 border-line text-fg'}`}>
                  {ui[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>{ui.turn}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={ui.turn}>
              <button type="button" role="radio" aria-checked={turn === 'first'} onClick={() => setTurn(turn === 'first' ? '' : 'first')} className={seg(turn === 'first')}>{ui.first}</button>
              <button type="button" role="radio" aria-checked={turn === 'second'} onClick={() => setTurn(turn === 'second' ? '' : 'second')} className={seg(turn === 'second')}>{ui.second}</button>
            </div>
          </div>
        </div>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg list-none">+ {ui.more}</summary>
          <div className="grid sm:grid-cols-3 gap-4 mt-3">
            <label className="block">
              <span className={label}>{ui.date}</span>
              <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block">
              <span className={label}>{ui.event}</span>
              <input className={field} value={event} onChange={(e) => setEvent(e.target.value)} placeholder={ui.eventPh} maxLength={60} />
            </label>
            <label className="block">
              <span className={label}>{ui.note}</span>
              <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder={ui.notePh} maxLength={120} />
            </label>
          </div>
        </details>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button type="submit" className="press h-12 px-8 rounded-full bg-accent text-accent-fg font-semibold">{ui.add}</button>
          <p className="text-sm text-muted min-h-[1.25rem]" aria-live="polite">{msg}</p>
        </div>
      </form>

      {loaded && records.length === 0 && (
        <div className="p-6 rounded-3xl border border-dashed border-line-strong text-center">
          <p className="text-fg font-semibold mb-1">{ui.emptyTitle}</p>
          <p className="text-sm text-muted">{ui.emptyDesc}</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-bold text-fg">{ui.statsTitle}</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={ui.filter} className="h-10 px-3 rounded-xl bg-surface-2 border border-line text-fg text-sm max-w-full">
              <option value="">{ui.allDecks}</option>
              {decks.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCard(ui.overall, all, true)}
            {statCard(ui.goingFirst, first)}
            {statCard(ui.goingSecond, second)}
            {statCard(ui.last10, last10)}
          </div>
          {streak && streak.n >= 2 && (
            <p className="mt-3 text-sm text-muted">{fmt(streak.r === 'W' ? ui.streakW : streak.r === 'L' ? ui.streakL : ui.streakT, { n: streak.n })}</p>
          )}
          {first.n >= 3 && second.n >= 3 && Math.abs(rate(first) - rate(second)) >= 0.15 && (
            <p className="mt-2 text-sm text-muted">💡 {rate(first) > rate(second) ? ui.tipFirst : ui.tipSecond}</p>
          )}

          <h3 className="mt-8 mb-3 text-sm font-semibold text-fg">{ui.matchups}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3 font-medium">{ui.opponent}</th>
                  <th className="py-2 pr-3 font-medium">{ui.record}</th>
                  <th className="py-2 pr-3 font-medium">{ui.winRate}</th>
                  <th className="py-2 font-medium hidden sm:table-cell"><span className="sr-only">{ui.winRate}</span></th>
                </tr>
              </thead>
              <tbody>
                {matchups.map(({ o, x }) => (
                  <tr key={o} className="border-t border-line">
                    <td className="py-2 pr-3 text-fg font-medium">{o}</td>
                    <td className="py-2 pr-3 text-muted">{wlt(x)}</td>
                    <td className={`py-2 pr-3 font-semibold ${rate(x) >= 0.55 ? 'text-emerald-600 dark:text-emerald-400' : rate(x) < 0.45 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctTxt(x)}</td>
                    <td className="py-2 hidden sm:table-cell">{bar(x)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filter && byDeck.length > 1 && (
            <>
              <h3 className="mt-8 mb-3 text-sm font-semibold text-fg">{ui.byDeck}</h3>
              <ul className="grid sm:grid-cols-2 gap-2">
                {byDeck.map(({ d, x }) => (
                  <li key={d}>
                    <button type="button" onClick={() => setFilter(d)} className="press w-full text-left p-3 rounded-2xl bg-surface-2 border border-line hover:border-line-strong">
                      <span className="flex justify-between gap-3">
                        <span className="text-sm font-medium text-fg truncate">{d}</span>
                        <span className="text-sm font-semibold tabular text-fg">{pctTxt(x)}</span>
                      </span>
                      <span className="block text-xs text-faint tabular mt-0.5">{wlt(x)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {records.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <h2 className="text-xl font-bold text-fg mb-4">{ui.historyTitle}</h2>
          <ul className="divide-y divide-line">
            {shown.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center text-xs font-bold ${resultStyle[r.result]}`}>{ui[r.result].slice(0, 1)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate"><b className="font-semibold">{r.deck}</b> <span className="text-muted">{ui.vs}</span> {r.opp}</span>
                  <span className="block text-xs text-faint truncate">
                    {r.date}{r.turn ? ` · ${r.turn === 'first' ? ui.first : ui.second}` : ''}{r.event ? ` · ${r.event}` : ''}{r.note ? ` · ${r.note}` : ''}
                  </span>
                </span>
                <button type="button" onClick={() => remove(r.id)} aria-label={ui.delete} title={ui.delete} className="press w-9 h-9 shrink-0 rounded-full text-faint hover:text-rose-500 hover:bg-surface-2">✕</button>
              </li>
            ))}
          </ul>
          {view.length > 15 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="press mt-3 text-sm font-semibold text-accent">
              {showAll ? ui.showLess : fmt(ui.showAll, { n: view.length })}
            </button>
          )}
        </div>
      )}

      <div className="p-5 rounded-3xl bg-surface-2 border border-line">
        <p className="text-sm text-muted mb-3">{ui.backupDesc}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!records.length} className="press h-10 px-4 rounded-full bg-surface border border-line text-sm font-semibold text-fg disabled:opacity-40">{ui.exportCsv}</button>
          <button type="button" onClick={exportJson} disabled={!records.length} className="press h-10 px-4 rounded-full bg-surface border border-line text-sm font-semibold text-fg disabled:opacity-40">{ui.exportJson}</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="press h-10 px-4 rounded-full bg-surface border border-line text-sm font-semibold text-fg">{ui.importJson}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          {records.length > 0 && <button type="button" onClick={clearAll} className="press h-10 px-4 rounded-full text-sm font-semibold text-rose-600 dark:text-rose-400">{ui.clearAll}</button>}
        </div>
      </div>
    </div>
  );
}
