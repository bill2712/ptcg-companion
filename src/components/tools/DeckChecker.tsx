import { useEffect, useMemo, useState } from 'react';
import { deckUi } from '../../locales/newToolsUi';
import { fmt, hyper, pct } from './util';
import { loadDecks, saveDecks, type SavedDeck } from './storage';

interface Props { lang: 'en' | 'zh-TW' }

type Section = 'pokemon' | 'trainer' | 'energy' | 'other';
interface Line { count: number; name: string; full: string; section: Section }
interface Card { name: string; section: Section; uid: number }

const DRAFT_KEY = 'ptcg_deck_draft_v1';
const HAND = 7;
const PRIZES = 6;
const MAX_COPIES = 4;
const DECK_SIZE = 60;

const SAMPLE = `Pokémon: 13
4 Sparky Pup SVI 1
3 Thunder Hound ex SVI 2
2 Pebble Mole PAL 3
2 Cloud Moth OBF 4
2 Rapid Bird PAR 5

Trainer: 35
4 Professor's Research SVI 189
4 Boss's Orders PAL 172
3 Iono PAL 185
4 Nest Ball SVI 181
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
3 Switch SVI 194
3 Energy Retrieval SVI 171
2 Super Rod PAL 188
2 Choice Belt PAL 176
2 Artazon PAL 171

Energy: 12
12 Basic Lightning Energy SVE 4`;

const headerRe = /^\s*(pok[eé]mon|trainers?|energy|寶可夢|宝可梦|訓練家|训练家|物品|能量|total cards|卡牌總數)\s*[:：]?\s*\d*\s*$/i;
const lineRe = /^\s*(\d{1,2})\s*[xX×]?\s+(.+?)\s*$/;
// Trailing set code and collector number, e.g. "SVI 57", "PR-SV 12", "sv8a 123".
const setRe = /\s+[A-Za-z][A-Za-z0-9-]{1,6}\s+[A-Za-z]{0,3}\d{1,4}[a-z]?$/;
const basicEnergyRe = /^(basic\s+)?(\{[A-Z]\}|grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy)\s+energy$|^基本.{1,3}能量$/i;

const sectionOf = (h: string): Section | null => {
  const s = h.toLowerCase();
  if (/pok|寶可夢|宝可梦/.test(s)) return 'pokemon';
  if (/trainer|訓練家|训练家|物品/.test(s)) return 'trainer';
  if (/energy|能量/.test(s)) return 'energy';
  return null;
};

export const parseDeck = (text: string) => {
  const lines: Line[] = [];
  const bad: string[] = [];
  let section: Section = 'other';
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    if (headerRe.test(l)) {
      section = sectionOf(l) ?? section;
      continue;
    }
    const m = l.match(lineRe);
    if (!m) { bad.push(l); continue; }
    const full = m[2];
    const name = full.replace(setRe, '').trim() || full;
    const sec: Section = section === 'other' && basicEnergyRe.test(name) ? 'energy' : section;
    lines.push({ count: Number(m[1]), name, full, section: sec });
  }
  return { lines, bad };
};

const isBasicEnergy = (l: { name: string; section: Section }) => basicEnergyRe.test(l.name);

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  const buf = new Uint32Array(r.length);
  crypto.getRandomValues(buf);
  for (let i = r.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const sectionStyle: Record<Section, string> = {
  pokemon: 'border-l-rose-500',
  trainer: 'border-l-sky-500',
  energy: 'border-l-amber-400',
  other: 'border-l-zinc-400',
};

export default function DeckChecker({ lang }: Props) {
  const ui = deckUi[lang];
  const [text, setText] = useState('');
  const [basics, setBasics] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [deckName, setDeckName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  // Simulator
  const [sim, setSim] = useState<{ hand: Card[]; prizes: Card[]; deck: Card[]; mulligans: number; open: boolean[] } | null>(null);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d) { setText(d.text ?? ''); setBasics(Array.isArray(d.basics) ? d.basics : []); setDeckName(d.name ?? ''); }
    } catch {}
    setSaved(loadDecks());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, basics, name: deckName })); } catch {}
  }, [text, basics, deckName, loaded]);

  const { lines, bad } = useMemo(() => parseDeck(text), [text]);
  const total = lines.reduce((s, l) => s + l.count, 0);

  // One entry per card name, so the same card from different sets counts together.
  const names = useMemo(() => {
    const m = new Map<string, { name: string; count: number; section: Section }>();
    for (const l of lines) {
      const key = l.name.toLowerCase();
      const cur = m.get(key);
      if (cur) cur.count += l.count;
      else m.set(key, { name: l.name, count: l.count, section: l.section });
    }
    return [...m.values()];
  }, [lines]);

  const bySection = (s: Section) => lines.filter((l) => l.section === s).reduce((n, l) => n + l.count, 0);
  const hasSections = lines.some((l) => l.section !== 'other');
  const basicSet = new Set(basics.map((b) => b.toLowerCase()));
  const basicCount = names.filter((n) => basicSet.has(n.name.toLowerCase())).reduce((s, n) => s + n.count, 0);
  const canBeBasic = (n: { section: Section; name: string }) => n.section === 'pokemon' || (n.section === 'other' && !isBasicEnergy(n));

  const issues: { level: 'error' | 'warn' | 'ok'; text: string }[] = [];
  if (lines.length) {
    if (total === DECK_SIZE) issues.push({ level: 'ok', text: ui.okCount });
    else issues.push({ level: 'error', text: fmt(ui.badCount, { n: total, d: total - DECK_SIZE > 0 ? `+${total - DECK_SIZE}` : total - DECK_SIZE }) });
    const over = names.filter((n) => n.count > MAX_COPIES && !isBasicEnergy(n));
    for (const n of over) issues.push({ level: 'error', text: fmt(ui.tooMany, { name: n.name, n: n.count }) });
    if (!over.length) issues.push({ level: 'ok', text: ui.okCopies });
    if (!basicCount) issues.push({ level: 'warn', text: ui.markBasics });
    if (bad.length) issues.push({ level: 'warn', text: fmt(ui.unread, { n: bad.length, lines: bad.slice(0, 3).join(' / ') }) });
    issues.push({ level: 'warn', text: ui.aceSpec });
  }

  const d = Math.max(total, HAND + PRIZES);
  const mull = basicCount ? hyper(d, basicCount, HAND, 0) : null;

  const toggleBasic = (name: string) =>
    setBasics((b) => (b.some((x) => x.toLowerCase() === name.toLowerCase()) ? b.filter((x) => x.toLowerCase() !== name.toLowerCase()) : [...b, name]));

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3500); };

  const saveDeck = () => {
    const name = deckName.trim();
    if (!name) { flash(ui.nameFirst); return; }
    if (!lines.length) { flash(ui.pasteFirst); return; }
    const next = [{ name, list: text, basics, updated: Date.now() }, ...saved.filter((s) => s.name !== name)];
    setSaved(next);
    saveDecks(next);
    flash(ui.savedMsg);
  };
  const loadDeck = (s: SavedDeck) => { setText(s.list); setBasics(s.basics ?? []); setDeckName(s.name); setSim(null); };
  const deleteDeck = (s: SavedDeck) => {
    if (!window.confirm(fmt(ui.confirmDelete, { name: s.name }))) return;
    const next = saved.filter((x) => x.name !== s.name);
    setSaved(next);
    saveDecks(next);
  };

  const draw = (mulligans = 0) => {
    let uid = 0;
    const cards: Card[] = lines.flatMap((l) => Array.from({ length: l.count }, () => ({ name: l.name, section: l.section, uid: uid++ })));
    if (cards.length < HAND + PRIZES) return;
    const s = shuffle(cards);
    setSim({ hand: s.slice(0, HAND), prizes: s.slice(HAND, HAND + PRIZES), deck: s.slice(HAND + PRIZES), mulligans, open: Array(PRIZES).fill(false) });
  };
  const isBasic = (c: Card) => basicSet.has(c.name.toLowerCase());
  const handHasBasic = sim ? sim.hand.some(isBasic) : true;
  const drawOne = () => setSim((s) => (s && s.deck.length ? { ...s, hand: [...s.hand, s.deck[0]], deck: s.deck.slice(1) } : s));

  const field = 'w-full px-3 rounded-xl bg-surface-2 border border-line text-fg focus:outline-none focus:border-accent';
  const btn = 'press h-10 px-4 rounded-full text-sm font-semibold';
  const icon = { error: '✕', warn: '!', ok: '✓' };
  const iconStyle = { error: 'bg-rose-500 text-white', warn: 'bg-amber-400 text-amber-950', ok: 'bg-emerald-500 text-white' };

  const card = (c: Card, i: number) => (
    <li key={c.uid} className={`px-3 py-2.5 rounded-xl bg-surface-2 border border-line border-l-4 ${sectionStyle[c.section]} text-sm text-fg leading-snug flex items-center justify-between gap-2`} style={{ animation: `sheetIn 0.25s ${i * 0.03}s both` }}>
      <span className="truncate">{c.name}</span>
      {isBasic(c) && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300">{ui.basicTag}</span>}
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label htmlFor="dc-list" className="text-xl font-bold text-fg">{ui.pasteTitle}</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setText(SAMPLE); setBasics(['Sparky Pup', 'Pebble Mole', 'Cloud Moth', 'Rapid Bird']); setDeckName(''); setSim(null); }} className={`${btn} bg-surface-2 text-fg`}>{ui.sample}</button>
            {text && <button type="button" onClick={() => { setText(''); setBasics([]); setDeckName(''); setSim(null); }} className={`${btn} text-muted`}>{ui.clear}</button>}
          </div>
        </div>
        <p className="text-sm text-muted mb-3">{ui.pasteHint}</p>
        <textarea id="dc-list" value={text} onChange={(e) => { setText(e.target.value); setSim(null); }} rows={10} spellCheck={false} placeholder={ui.pastePh} className={`${field} py-3 font-mono text-sm leading-relaxed`} />

        {saved.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted mb-2">{ui.savedDecks}</p>
            <ul className="flex flex-wrap gap-2">
              {saved.map((s) => (
                <li key={s.name} className="inline-flex items-center rounded-full bg-surface-2 border border-line">
                  <button type="button" onClick={() => loadDeck(s)} className="press pl-3 pr-2 h-9 text-sm font-medium text-fg">{s.name}</button>
                  <button type="button" onClick={() => deleteDeck(s)} aria-label={`${ui.delete}: ${s.name}`} className="press pr-3 pl-1 h-9 text-faint hover:text-rose-500">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <h2 className="text-xl font-bold text-fg">{ui.checkTitle}</h2>
            <p className={`text-3xl font-bold tabular ${total === DECK_SIZE ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{total}<span className="text-base text-muted font-semibold"> / {DECK_SIZE}</span></p>
          </div>

          {hasSections && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {(['pokemon', 'trainer', 'energy'] as Section[]).map((s) => (
                <div key={s} className={`p-3 rounded-2xl bg-surface-2 border border-line border-l-4 ${sectionStyle[s]}`}>
                  <p className="text-xs text-muted">{ui[s]}</p>
                  <p className="text-xl font-bold tabular text-fg">{bySection(s)}</p>
                </div>
              ))}
            </div>
          )}

          <ul className="space-y-2" aria-live="polite">
            {issues.map((x, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${iconStyle[x.level]}`} aria-hidden="true">{icon[x.level]}</span>
                <span className="text-fg leading-relaxed">{x.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <input value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder={ui.deckNamePh} maxLength={60} aria-label={ui.deckNamePh} className={`${field} h-11 flex-1`} />
            <button type="button" onClick={saveDeck} className={`${btn} h-11 bg-accent text-accent-fg`}>{ui.save}</button>
          </div>
          <p className="text-sm text-muted mt-2 min-h-[1.25rem]" aria-live="polite">{msg}</p>
        </div>
      )}

      {names.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-fg">{ui.oddsTitle}</h2>
            {mull !== null && (
              <span className="px-3 py-1.5 rounded-full bg-accent-soft text-accent text-sm font-semibold tabular">{fmt(ui.mulliganRate, { p: pct(mull), n: basicCount })}</span>
            )}
          </div>
          <p className="text-sm text-muted mb-4">{ui.oddsHint}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3 font-medium">{ui.basicCol}</th>
                  <th className="py-2 pr-3 font-medium">{ui.card}</th>
                  <th className="py-2 pr-3 font-medium text-right">#</th>
                  <th className="py-2 pr-3 font-medium text-right">{ui.inOpening}</th>
                  <th className="py-2 pr-3 font-medium text-right">{ui.byTurn1}</th>
                  <th className="py-2 font-medium text-right">{ui.prizedAny}</th>
                </tr>
              </thead>
              <tbody>
                {names.map((n) => {
                  const k = Math.min(n.count, d);
                  return (
                    <tr key={n.name} className="border-t border-line">
                      <td className="py-2 pr-3">
                        {canBeBasic(n) && (
                          <input type="checkbox" checked={basicSet.has(n.name.toLowerCase())} onChange={() => toggleBasic(n.name)} aria-label={`${ui.basicCol}: ${n.name}`} className="w-5 h-5 accent-[var(--accent)]" />
                        )}
                      </td>
                      <td className={`py-2 pr-3 text-fg border-l-4 pl-2 ${sectionStyle[n.section]}`}>{n.name}</td>
                      <td className="py-2 pr-3 text-right text-muted">{n.count}</td>
                      <td className="py-2 pr-3 text-right text-fg font-semibold">{pct(1 - hyper(d, k, HAND, 0))}</td>
                      <td className="py-2 pr-3 text-right text-fg">{pct(1 - hyper(d, k, HAND + 1, 0))}</td>
                      <td className="py-2 text-right text-muted">{pct(1 - hyper(d, k, PRIZES, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-fg">{ui.simTitle}</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => draw(0)} disabled={total < HAND + PRIZES} className={`${btn} h-11 bg-accent text-accent-fg disabled:opacity-40`}>{sim ? ui.newHand : ui.drawHand}</button>
              {sim && <button type="button" onClick={drawOne} disabled={!sim.deck.length} className={`${btn} h-11 bg-surface-2 text-fg border border-line disabled:opacity-40`}>{ui.drawOne}</button>}
            </div>
          </div>
          {!sim && <p className="text-sm text-muted">{ui.simHint}</p>}
          {sim && (
            <>
              {basicCount > 0 && !handHasBasic && (
                <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-fg"><b>{ui.mulligan}</b> {ui.mulliganDesc}</p>
                  <button type="button" onClick={() => draw(sim.mulligans + 1)} className={`${btn} bg-rose-500 text-white shrink-0`}>{ui.reshuffle}</button>
                </div>
              )}
              {sim.mulligans > 0 && <p className="mb-3 text-xs text-muted">{fmt(ui.mulliganCount, { n: sim.mulligans })}</p>}
              <p className="text-xs font-semibold text-muted mb-2">{fmt(ui.handN, { n: sim.hand.length })}</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">{sim.hand.map(card)}</ul>
              <p className="text-xs font-semibold text-muted mb-2">{ui.prizes}</p>
              <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {sim.prizes.map((c, i) => (
                  <li key={c.uid}>
                    {sim.open[i] ? (
                      <span className={`block h-full min-h-[64px] px-2 py-2 rounded-xl bg-surface-2 border border-line border-l-4 ${sectionStyle[c.section]} text-xs text-fg leading-snug`}>{c.name}</span>
                    ) : (
                      <button type="button" onClick={() => setSim((s) => s && { ...s, open: s.open.map((o, j) => (j === i ? true : o)) })} aria-label={fmt(ui.revealPrize, { n: i + 1 })}
                        className="press w-full min-h-[64px] rounded-xl ball-pattern bg-gradient-to-br from-[var(--accent)] to-rose-700 text-white text-lg font-bold shadow">?</button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-faint">{fmt(ui.deckLeft, { n: sim.deck.length })}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
