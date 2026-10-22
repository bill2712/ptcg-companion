import { useState, useEffect, useRef, useCallback } from 'react';
import { langs, t, langLabels, localePath, toContentLang } from '../locales/translations';
import { energySvg, energyColor, type Energy } from '../utils/energy';

type ElementType = 'None' | 'Grass' | 'Fire' | 'Water' | 'Lightning' | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal' | 'Dragon' | 'Colorless' | 'Stellar';
type PlayerId = 'p1' | 'p2';
/** -1 = Active Pokémon, 0-4 = Bench slot. */
type Target = number;

// Energy colour for the player panel frame and tint.
const typeHex = (t: ElementType) => (t === 'None' ? '' : energyColor[t as Energy]);

/** Original energy badge (see utils/energy.ts); 'None' shows a rainbow disc. */
const EnergyBadge = ({ type, size }: { type: ElementType; size: number }) => type === 'None'
  ? <span className="block rounded-full" style={{ width: size, height: size, background: 'conic-gradient(#3fae49, #f0532d, #2f8ae6, #f5b80f, #9a4fd6, #c86a2b, #3fae49)' }} />
  : <span className="block leading-none" dangerouslySetInnerHTML={{ __html: energySvg(type as Energy, size) }} />;

const types: ElementType[] = ['None', 'Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless', 'Stellar'];

interface PlayerState {
  hp: number; // damage on the Active Pokémon
  bench: number[]; // damage on each of the 5 Bench slots
  poisoned: boolean;
  burned: boolean;
  asleep: boolean;
  paralyzed: boolean;
  confused: boolean;
  vstarUsed: boolean;
  gxUsed: boolean;
  aceSpecUsed: boolean;
  abilityUsed: boolean;
  retreatUsed: boolean;
  energyUsed: boolean;
  supporterUsed: boolean;
  prizes: boolean[]; // true = Prize card still face down
  activeType: ElementType;
}

const BENCH_SIZE = 5;
const noConditions = { poisoned: false, burned: false, asleep: false, paralyzed: false, confused: false };

const initialPlayerState = (): PlayerState => ({
  hp: 0,
  bench: Array(BENCH_SIZE).fill(0),
  ...noConditions,
  vstarUsed: false,
  gxUsed: false,
  aceSpecUsed: false,
  abilityUsed: false,
  retreatUsed: false,
  energyUsed: false,
  supporterUsed: false,
  prizes: [true, true, true, true, true, true],
  activeType: 'None',
});

type LogEntry = {
  turn: number;
  k: 'dmg' | 'ko' | 'switch' | 'cond' | 'prize' | 'coin' | 'turn' | 'checkup' | 'win' | 'undo';
  p?: PlayerId;
  target?: Target;
  n?: number;
  h?: number;
  c?: string;
  on?: boolean;
};

const DEFAULT_DURATION = 30 * 60;
const HISTORY_LIMIT = 20;
const LOG_LIMIT = 300;
const STORAGE_KEY = 'ptcg_companion_match_v1';
const NAMES_KEY = 'ptcg_companion_names';
const SERIES_KEY = 'ptcg_companion_series';

interface Game {
  p1: PlayerState;
  p2: PlayerState;
  history: Record<PlayerId, PlayerState[]>;
  log: LogEntry[];
  turn: number;
  firstPlayer: PlayerId | null;
  duration: number;
  timeLeft: number;
  winnerDismissed: boolean;
}

interface Series { p1: number; p2: number }

const newGame = (duration = DEFAULT_DURATION): Game => ({
  p1: initialPlayerState(),
  p2: initialPlayerState(),
  history: { p1: [], p2: [] },
  log: [],
  turn: 1,
  firstPlayer: null,
  duration,
  timeLeft: duration,
  winnerDismissed: false,
});

const isPristine = (g: Game) =>
  g.turn === 1 && g.timeLeft === g.duration && g.history.p1.length === 0 && g.history.p2.length === 0;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const loadGame = (): Game | null => {
  const parsed = readJson<Partial<Game>>(STORAGE_KEY);
  if (!parsed) return null;
  const fix = (p?: Partial<PlayerState>) => {
    const s = { ...initialPlayerState(), ...p };
    if (!Array.isArray(s.bench) || s.bench.length !== BENCH_SIZE) s.bench = Array(BENCH_SIZE).fill(0);
    return s;
  };
  return {
    ...newGame(parsed.duration ?? DEFAULT_DURATION),
    ...parsed,
    p1: fix(parsed.p1),
    p2: fix(parsed.p2),
    history: { p1: (parsed.history?.p1 ?? []).map(fix), p2: (parsed.history?.p2 ?? []).map(fix) },
    log: parsed.log ?? [],
  };
};

const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const randomBit = () => {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] < 128;
};

/** Append to the log, merging repeated damage taps on the same Pokémon into one line. */
const addLog = (log: LogEntry[], e: LogEntry): LogEntry[] => {
  const last = log[log.length - 1];
  if (e.k === 'dmg' && last?.k === 'dmg' && last.p === e.p && last.target === e.target && last.turn === e.turn) {
    const n = (last.n ?? 0) + (e.n ?? 0);
    return n === 0 ? log.slice(0, -1) : [...log.slice(0, -1), { ...last, n }];
  }
  return [...log, e].slice(-LOG_LIMIT);
};

// Asleep, Paralyzed and Confused are shown by turning the card, so only one can apply at a time.
const ROTATION = ['asleep', 'paralyzed', 'confused'] as const;
type Condition = 'poisoned' | 'burned' | (typeof ROTATION)[number];
const conditionKey: Record<Condition, string> = { poisoned: 'poison', burned: 'burn', asleep: 'asleep', paralyzed: 'para', confused: 'confuse' };

interface ScreenLock { release(): Promise<void> }
type WakeLockNav = { wakeLock?: { request(type: 'screen'): Promise<ScreenLock> } };

interface PlayerAreaProps {
  state: PlayerState;
  player: PlayerId;
  name: string;
  target: Target;
  historyLen: number;
  isRotated: boolean;
  isAnim: boolean;
  lang: string;
  update: (player: PlayerId, updates: Partial<PlayerState>, log?: Omit<LogEntry, 'turn'>) => void;
  setTarget: (player: PlayerId, target: Target) => void;
  adjust: (player: PlayerId, target: Target, amount: number) => void;
  knockOut: (player: PlayerId, target: Target) => void;
  switchIn: (player: PlayerId, slot: number) => void;
  toggleCondition: (player: PlayerId, c: Condition) => void;
  undo: (player: PlayerId) => void;
  onHint: (msg: string) => void;
}

const PlayerArea = ({ state, player, name, target, historyLen, isRotated, isAnim, lang, update, setTarget, adjust, knockOut, switchIn, toggleCondition, undo, onHint }: PlayerAreaProps) => {
  const [typeOpen, setTypeOpen] = useState(false);
  const togglePrize = (index: number) => {
    const prizes = [...state.prizes];
    prizes[index] = !prizes[index];
    update(player, { prizes }, { k: 'prize', p: player, n: prizes.filter(Boolean).length });
  };
  const dmg = target < 0 ? state.hp : state.bench[target];
  const targetLabel = target < 0 ? t(lang, 'active') : `${t(lang, 'bench')} ${target + 1}`;

  // A Special Condition colours the panel outline so both players can see it.
  const condBorder = state.poisoned ? 'border-green-500/70' : state.burned ? 'border-orange-500/70' : state.paralyzed ? 'border-yellow-500/70'
    : state.asleep ? 'border-blue-500/70' : state.confused ? 'border-purple-500/70' : '';
  // Frame colour: the Active Pokémon's type, else the player's colour (P1 red, P2 blue).
  const tint = typeHex(state.activeType) || (player === 'p1' ? '#ff5a47' : '#3c78f0');

  const conditions: { key: Condition; on: string; dot: string }[] = [
    { key: 'poisoned', on: 'bg-green-500 text-white', dot: 'bg-green-500' },
    { key: 'burned', on: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
    { key: 'asleep', on: 'bg-blue-500 text-white', dot: 'bg-blue-500' },
    { key: 'paralyzed', on: 'bg-yellow-400 text-neutral-900', dot: 'bg-yellow-400' },
    { key: 'confused', on: 'bg-purple-500 text-white', dot: 'bg-purple-500' },
  ];

  const perTurn: { key: 'energyUsed' | 'supporterUsed' | 'retreatUsed' | 'abilityUsed'; label: string; dot: string }[] = [
    { key: 'energyUsed', label: t(lang, 'energy'), dot: 'bg-amber-400' },
    { key: 'supporterUsed', label: t(lang, 'supporter'), dot: 'bg-sky-400' },
    { key: 'retreatUsed', label: t(lang, 'retreatUsed'), dot: 'bg-zinc-400' },
    { key: 'abilityUsed', label: t(lang, 'ability'), dot: 'bg-rose-400' },
  ];

  const slots: Target[] = [-1, 0, 1, 2, 3, 4];

  return (
    <section
      aria-label={name}
      className={`ball-pattern flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col gap-1 p-2 mx-1.5 my-1 bg-surface border-2 rounded-[22px] relative transition-colors duration-300 ${condBorder} ${isRotated ? 'rotate-180' : ''}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${tint}2e 0%, ${tint}0d 45%, transparent 75%)`,
        ...(condBorder ? {} : { borderColor: `${tint}99` }),
        boxShadow: `0 10px 30px -18px ${tint}`,
      }}
    >
      {/* Active + Bench selector */}
      <div className="flex items-center gap-1 w-full">
        <div className="flex gap-1 flex-1" role="radiogroup" aria-label={`${t(lang, 'active')} / ${t(lang, 'bench')}`}>
          {slots.map((s) => {
            const d = s < 0 ? state.hp : state.bench[s];
            const sel = target === s;
            return (
              <button
                key={s}
                role="radio"
                aria-checked={sel}
                aria-label={`${s < 0 ? t(lang, 'active') : `${t(lang, 'bench')} ${s + 1}`}: ${d}`}
                onClick={() => setTarget(player, s)}
                className={`press flex-1 h-[30px] rounded-[10px] flex flex-col items-center justify-center leading-none ${sel ? 'bg-accent text-accent-fg shadow-sm' : 'bg-surface-2 text-muted'} ${s < 0 && !sel ? 'ring-1 ring-inset ring-line-strong' : ''}`}
              >
                <span className={`text-[8px] font-semibold ${sel ? 'opacity-80' : 'opacity-60'}`}>{s < 0 ? 'A' : `B${s + 1}`}</span>
                <span className={`text-[11px] font-bold tabular ${!sel && d > 0 ? 'text-rose-500 dark:text-rose-400' : ''}`}>{d > 0 ? d : '·'}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => (target < 0 ? onHint(t(lang, 'pickBenchFirst')) : switchIn(player, target))}
          aria-label={t(lang, 'switchToActive')}
          title={t(lang, 'switchToActive')}
          className={`press w-8 h-[30px] rounded-[10px] flex items-center justify-center ${target < 0 ? 'bg-surface-2 text-faint' : 'bg-accent-soft text-accent'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4" /></svg>
        </button>
        <div className="relative">
          <button
            onClick={() => setTypeOpen((o) => !o)}
            aria-label={`${t(lang, 'type')}: ${state.activeType}`}
            aria-expanded={typeOpen}
            className="press w-[30px] h-[30px] rounded-full ring-2 ring-surface-3 flex items-center justify-center shadow-sm"
          ><EnergyBadge type={state.activeType} size={30} /></button>
          {typeOpen && (
            <div className="absolute right-0 top-9 z-30 p-2 rounded-2xl bg-surface border border-line-strong shadow-2xl grid grid-cols-4 gap-1.5 w-[152px]" style={{ animation: 'sheetIn 0.15s ease-out' }} role="group" aria-label={t(lang, 'type')}>
              {types.map((el) => (
                <button
                  key={el}
                  onClick={() => { update(player, { activeType: el }); setTypeOpen(false); }}
                  aria-label={el}
                  aria-pressed={state.activeType === el}
                  title={el === 'None' ? '—' : el}
                  className={`press w-8 h-8 rounded-full flex items-center justify-center ${state.activeType === el ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                ><EnergyBadge type={el} size={32} /></button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Damage readout + per-turn toggles */}
      <div className="flex items-stretch justify-between w-full gap-1.5 flex-[1.4] min-h-16 max-h-36">
        <div className="bg-surface-2/90 rounded-2xl w-[148px] shrink-0 flex flex-col items-center justify-center relative border border-line">
          <span className="absolute top-1.5 left-0 right-0 text-center text-[9px] font-medium text-muted truncate px-8">{name} · {targetLabel}</span>
          <span
            key={isAnim ? 'a' : 'b'}
            aria-live="polite"
            aria-label={`${targetLabel}: ${dmg}`}
            className={`font-display text-[clamp(34px,7vh,54px)] leading-none font-bold tabular mt-3 ${isAnim ? 'bump' : ''} ${dmg > 0 ? 'text-accent' : 'text-faint'}`}
          >{dmg}</span>
          <button
            onClick={() => undo(player)}
            disabled={historyLen === 0}
            aria-label={t(lang, 'undo')}
            title={t(lang, 'undo')}
            className={`press absolute left-1 bottom-1 w-7 h-7 rounded-lg flex items-center justify-center ${historyLen > 0 ? 'text-fg hover:bg-surface-3' : 'text-faint opacity-40'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
          </button>
          <button
            onClick={() => knockOut(player, target)}
            aria-label={`${t(lang, 'ko')}: ${targetLabel}`}
            title={t(lang, 'ko')}
            className="press absolute right-1 bottom-1 h-7 px-1.5 rounded-lg text-[10px] font-semibold text-muted hover:text-fg hover:bg-surface-3"
          >{t(lang, 'ko')}</button>
        </div>

        <div className="grid grid-cols-2 gap-1 flex-1 max-w-[180px]">
          {perTurn.map((p) => (
            <button
              key={p.key}
              onClick={() => update(player, { [p.key]: !state[p.key] })}
              aria-pressed={state[p.key]}
              className={`press rounded-xl text-[10px] font-medium leading-tight px-1.5 flex items-center justify-center gap-1 ${state[p.key] ? 'bg-transparent border border-dashed border-line-strong text-faint' : 'bg-surface-2 text-fg'}`}
            >
              {state[p.key]
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
                : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} aria-hidden="true" />}
              <span className={state[p.key] ? 'line-through' : ''}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prize cards */}
      <div className="grid grid-cols-6 gap-1 w-full flex-[0.6] min-h-6 max-h-9" role="group" aria-label="Prize cards">
        {state.prizes.map((isActive, idx) => (
          <button
            key={idx}
            onClick={() => togglePrize(idx)}
            aria-pressed={!isActive}
            aria-label={`Prize ${idx + 1}`}
            className={`press h-full min-h-6 rounded-md text-[11px] font-semibold tabular ${isActive ? 'prize-back text-transparent' : 'border border-dashed border-line-strong text-faint'}`}
          >{idx + 1}</button>
        ))}
      </div>

      {/* Damage keypad (applies to the selected Pokémon) */}
      <div className="grid grid-cols-4 gap-1.5 w-full flex-1 min-h-10 max-h-[88px]">
        {[-10, 10, 50, 100].map((n) => (
          <button
            key={n}
            onClick={() => adjust(player, target, n)}
            className={`press h-full rounded-2xl text-lg font-display font-semibold tabular ${n < 0 ? 'bg-surface-2 text-muted' : 'dmg-token'}`}
          >{n > 0 ? `+${n}` : `−${-n}`}</button>
        ))}
      </div>

      {/* Special Conditions (Active Pokémon only) */}
      <div className="grid grid-cols-5 gap-1 w-full" role="group" aria-label="Special Conditions">
        {conditions.map((c) => (
          <button
            key={c.key}
            onClick={() => toggleCondition(player, c.key)}
            aria-pressed={state[c.key]}
            className={`press h-[26px] rounded-full text-[10px] font-medium px-1 flex items-center justify-center gap-1 ${state[c.key] ? c.on : 'bg-surface-2 text-muted'}`}
          >
            {!state[c.key] && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} aria-hidden="true" />}
            <span className="truncate">{t(lang, conditionKey[c.key])}</span>
          </button>
        ))}
      </div>

      {/* Once-per-game markers */}
      <div className="grid grid-cols-3 gap-1 w-full">
        {([
          ['vstarUsed', 'VSTAR', 'text-amber-500 dark:text-amber-300'],
          ['gxUsed', 'GX', 'text-sky-500 dark:text-sky-300'],
          ['aceSpecUsed', 'ACE SPEC', 'text-pink-500 dark:text-pink-300'],
        ] as const).map(([key, text, color]) => (
          <button
            key={key}
            onClick={() => update(player, { [key]: !state[key] })}
            aria-pressed={state[key]}
            className={`press h-[26px] rounded-full text-[11px] font-bold tracking-wide ${state[key] ? 'border border-dashed border-line-strong text-faint line-through' : `bg-surface-2 ${color}`}`}
          >{text}</button>
        ))}
      </div>
    </section>
  );
};

interface Props {
  lang?: string;
  ad?: { client: string; slot: string } | null;
  supportUrl?: string;
}

export default function PTCGCounter({ lang = 'en', ad = null, supportUrl = '' }: Props) {
  const [game, setGame] = useState<Game>(newGame);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [names, setNames] = useState<Record<PlayerId, string>>({ p1: '', p2: '' });
  const [series, setSeries] = useState<Series>({ p1: 0, p2: 0 });
  const [targets, setTargets] = useState<Record<PlayerId, Target>>({ p1: -1, p2: -1 });
  const [anim, setAnim] = useState<Record<PlayerId, boolean>>({ p1: false, p2: false });
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinSheet, setCoinSheet] = useState(false);
  const [coinCount, setCoinCount] = useState(3);
  const [coinRun, setCoinRun] = useState<boolean[] | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [themePref, setThemePref] = useState<'system' | 'light' | 'dark'>('system');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const endsAtRef = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cl = toContentLang(lang);
  const supportHref = supportUrl || localePath(cl, 'support/');
  const nameOf = useCallback((p: PlayerId) => names[p].trim() || t(lang, p === 'p1' ? 'player1' : 'player2'), [names, lang]);
  const targetLabel = (target?: Target) => (target === undefined || target < 0 ? t(lang, 'active') : `${t(lang, 'bench')} ${target + 1}`);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Restore saved match, names and series (client only, after hydration).
  useEffect(() => {
    try {
      const saved = loadGame();
      if (saved) {
        setGame(saved);
        if (!isPristine(saved)) showToast(t(lang, 'restored'));
      }
      const n = readJson<Record<PlayerId, string>>(NAMES_KEY);
      if (n) setNames({ p1: n.p1 ?? '', p2: n.p2 ?? '' });
      const s = readJson<Series>(SERIES_KEY);
      if (s) setSeries({ p1: s.p1 ?? 0, p2: s.p2 ?? 0 });
      if (!localStorage.getItem('ptcg_companion_onboarded')) setShowOnboarding(true);
      setSoundOn(localStorage.getItem('ptcg_companion_sound') !== 'off');
    } catch {}
    setLoaded(true);
  }, [lang, showToast]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      localStorage.setItem(NAMES_KEY, JSON.stringify(names));
      localStorage.setItem(SERIES_KEY, JSON.stringify(series));
    } catch {}
  }, [game, names, series, loaded]);

  useEffect(() => {
    const w = window as unknown as { __getThemePref?: () => 'system' | 'light' | 'dark' };
    if (w.__getThemePref) setThemePref(w.__getThemePref());
  }, []);

  const chooseTheme = (v: 'system' | 'light' | 'dark') => {
    (window as unknown as { __setTheme?: (v: string) => void }).__setTheme?.(v);
    setThemePref(v);
  };

  const closeOnboarding = () => {
    try { localStorage.setItem('ptcg_companion_onboarded', 'true'); } catch {}
    setShowOnboarding(false);
  };

  const beep = useCallback((freq = 800, ms = 40, volume = 0.1) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current && Ctx) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + ms / 1000);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch {}
  }, []);

  const fireFeedback = useCallback(() => {
    if (!soundRef.current) return;
    try { navigator.vibrate?.(12); } catch {}
    beep();
  }, [beep]);

  useEffect(() => () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close().catch(() => {});
  }, []);

  // Keep the screen awake during a match.
  useEffect(() => {
    let lock: ScreenLock | null = null;
    const nav = navigator as unknown as WakeLockNav;
    const request = async () => {
      try { if (nav.wakeLock) lock = await nav.wakeLock.request('screen'); } catch {}
    };
    request();
    const onVis = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      lock?.release().catch(() => {});
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Timer based on an end timestamp so it stays accurate when the tab is throttled.
  useEffect(() => {
    if (!running) { endsAtRef.current = null; return; }
    endsAtRef.current = Date.now() + game.timeLeft * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round(((endsAtRef.current ?? 0) - Date.now()) / 1000));
      setGame((g) => (g.timeLeft === left ? g : { ...g, timeLeft: left }));
      if (left === 0) {
        setRunning(false);
        try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
        if (soundRef.current) beep(660, 600, 0.25);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const pulse = (player: PlayerId) => {
    setAnim((a) => ({ ...a, [player]: true }));
    setTimeout(() => setAnim((a) => ({ ...a, [player]: false })), 180);
  };

  /** Apply a change to one player, keep an undo snapshot and optionally log it. */
  const update = useCallback((player: PlayerId, updates: Partial<PlayerState>, log?: Omit<LogEntry, 'turn'>) => {
    fireFeedback();
    setGame((g) => ({
      ...g,
      [player]: { ...g[player], ...updates },
      history: { ...g.history, [player]: [...g.history[player], g[player]].slice(-HISTORY_LIMIT) },
      log: log ? addLog(g.log, { ...log, turn: g.turn }) : g.log,
      winnerDismissed: updates.prizes ? false : g.winnerDismissed,
    }));
  }, [fireFeedback]);

  const setTarget = useCallback((player: PlayerId, target: Target) => {
    fireFeedback();
    setTargets((tg) => ({ ...tg, [player]: target }));
  }, [fireFeedback]);

  const adjust = useCallback((player: PlayerId, target: Target, amount: number) => {
    const s = game[player];
    const current = target < 0 ? s.hp : s.bench[target];
    const next = Math.max(0, Math.min(990, current + amount));
    if (next === current) return;
    pulse(player);
    const updates: Partial<PlayerState> = target < 0
      ? { hp: next }
      : { bench: s.bench.map((v, i) => (i === target ? next : v)) };
    update(player, updates, { k: 'dmg', p: player, target, n: next - current });
  }, [game, update]);

  const knockOut = useCallback((player: PlayerId, target: Target) => {
    const s = game[player];
    const updates: Partial<PlayerState> = target < 0
      ? { hp: 0, ...noConditions }
      : { bench: s.bench.map((v, i) => (i === target ? 0 : v)) };
    update(player, updates, { k: 'ko', p: player, target });
    showToast(`${t(lang, 'ko')}! ${fmt(t(lang, 'koToast'), { p: nameOf(player === 'p1' ? 'p2' : 'p1') })}`);
  }, [game, update, showToast, lang, nameOf]);

  // Swap the Active Pokémon with a Benched one. Damage moves with each card;
  // the Pokémon going to the Bench loses its Special Conditions.
  const switchIn = useCallback((player: PlayerId, slot: number) => {
    const s = game[player];
    update(player, {
      hp: s.bench[slot],
      bench: s.bench.map((v, i) => (i === slot ? s.hp : v)),
      ...noConditions,
    }, { k: 'switch', p: player, target: slot });
    setTargets((tg) => ({ ...tg, [player]: -1 }));
    pulse(player);
  }, [game, update]);

  const toggleCondition = useCallback((player: PlayerId, c: Condition) => {
    setGame((g) => {
      const turningOn = !g[player][c];
      const updates: Partial<PlayerState> = { [c]: turningOn };
      if (turningOn && (ROTATION as readonly string[]).includes(c)) {
        for (const r of ROTATION) if (r !== c) updates[r] = false;
      }
      return {
        ...g,
        [player]: { ...g[player], ...updates },
        history: { ...g.history, [player]: [...g.history[player], g[player]].slice(-HISTORY_LIMIT) },
        log: addLog(g.log, { turn: g.turn, k: 'cond', p: player, c, on: turningOn }),
      };
    });
    fireFeedback();
  }, [fireFeedback]);

  const undo = useCallback((player: PlayerId) => {
    setGame((g) => {
      const h = g.history[player];
      if (h.length === 0) return g;
      return {
        ...g,
        [player]: h[h.length - 1],
        history: { ...g.history, [player]: h.slice(0, -1) },
        log: addLog(g.log, { turn: g.turn, k: 'undo', p: player }),
      };
    });
    fireFeedback();
  }, [fireFeedback]);

  const logEvent = (e: Omit<LogEntry, 'turn'>) => setGame((g) => ({ ...g, log: addLog(g.log, { ...e, turn: g.turn }) }));

  const flipCoin = () => {
    if (isFlipping) return;
    fireFeedback();
    setIsFlipping(true);
    setCoinResult(null);
    setTimeout(() => {
      const heads = randomBit();
      setCoinResult(heads ? 'HEADS' : 'TAILS');
      setIsFlipping(false);
      logEvent({ k: 'coin', n: 1, h: heads ? 1 : 0 });
      fireFeedback();
    }, 600);
  };

  const flipMany = (mode: 'count' | 'untilTails') => {
    fireFeedback();
    const results: boolean[] = [];
    if (mode === 'count') for (let i = 0; i < coinCount; i++) results.push(randomBit());
    else {
      // Cap the run so a very long streak still ends.
      for (let i = 0; i < 30; i++) { const h = randomBit(); results.push(h); if (!h) break; }
    }
    setCoinRun(results);
    logEvent({ k: 'coin', n: results.length, h: results.filter(Boolean).length });
  };

  const nextTurn = () => {
    fireFeedback();
    const reset = { abilityUsed: false, retreatUsed: false, energyUsed: false, supporterUsed: false };
    setGame((g) => ({
      ...g,
      turn: g.turn + 1,
      p1: { ...g.p1, ...reset },
      p2: { ...g.p2, ...reset },
      history: {
        p1: [...g.history.p1, g.p1].slice(-HISTORY_LIMIT),
        p2: [...g.history.p2, g.p2].slice(-HISTORY_LIMIT),
      },
      log: addLog(g.log, { turn: g.turn + 1, k: 'turn', n: g.turn + 1 }),
    }));
  };

  // Pokémon Checkup: Poison adds 10, Burn adds 20, for both Active Pokémon.
  const checkup = () => {
    fireFeedback();
    const parts: string[] = [];
    const needsFlip = game.p1.asleep || game.p2.asleep || game.p1.burned || game.p2.burned;
    const amounts = { p1: 0, p2: 0 };
    (['p1', 'p2'] as const).forEach((p) => {
      amounts[p] = (game[p].poisoned ? 10 : 0) + (game[p].burned ? 20 : 0);
      if (amounts[p] > 0) { parts.push(`${nameOf(p)} +${amounts[p]}`); pulse(p); }
    });
    setGame((g) => {
      let next = g;
      (['p1', 'p2'] as const).forEach((p) => {
        const dmg = (g[p].poisoned ? 10 : 0) + (g[p].burned ? 20 : 0);
        if (dmg === 0) return;
        next = {
          ...next,
          [p]: { ...next[p], hp: Math.min(990, next[p].hp + dmg) },
          history: { ...next.history, [p]: [...next.history[p], g[p]].slice(-HISTORY_LIMIT) },
          log: addLog(next.log, { turn: g.turn, k: 'checkup', p, n: dmg }),
        };
      });
      return next;
    });
    const msg = parts.length ? `${t(lang, 'checkupApplied')}: ${parts.join(' · ')}` : t(lang, 'checkupNothing');
    showToast(needsFlip ? `${msg} ${t(lang, 'checkupFlipReminder')}` : msg);
  };

  const resetBoard = () => {
    setRunning(false);
    setCoinResult(null);
    setTargets({ p1: -1, p2: -1 });
    setGame((g) => newGame(g.duration));
  };

  const startNewMatch = () => {
    if (!window.confirm(t(lang, 'newMatchConfirm'))) return;
    resetBoard();
    setShowMenu(false);
  };

  const setDuration = (minutes: number) => {
    setRunning(false);
    setGame((g) => ({ ...g, duration: minutes * 60, timeLeft: minutes * 60 }));
  };

  const toggleSound = () => {
    setSoundOn((s) => {
      try { localStorage.setItem('ptcg_companion_sound', s ? 'off' : 'on'); } catch {}
      return !s;
    });
  };

  const winner: PlayerId | null = game.p1.prizes.every((p) => !p) ? 'p1' : game.p2.prizes.every((p) => !p) ? 'p2' : null;
  const cjk = ['ja', 'zh-TW', 'zh-CN'].includes(lang);
  const winnerText = winner ? `${nameOf(winner)}${cjk ? '' : ' '}${t(lang, 'wins')}` : '';
  const timeUp = game.timeLeft === 0;
  const gameNumber = series.p1 + series.p2 + 1;

  // Player 1 is "you" in the match tracker.
  const trackerHref = winner
    ? `${localePath(cl, 'tools/match-tracker/')}?${new URLSearchParams({
        result: winner === 'p1' ? 'W' : 'L',
        turn: game.firstPlayer === 'p1' ? 'first' : game.firstPlayer === 'p2' ? 'second' : '',
        opp: names.p2.trim() ? `vs ${names.p2.trim()}` : '',
      })}`
    : '';

  const nextGame = () => {
    if (!winner) return;
    setSeries((s) => ({ ...s, [winner]: s[winner] + 1 }));
    resetBoard();
  };

  const renderLog = (e: LogEntry) => {
    const who = e.p ? nameOf(e.p) : '';
    switch (e.k) {
      case 'turn': return <span className="text-xs font-semibold text-muted">{t(lang, 'turn')} {e.n}</span>;
      case 'dmg': return `${who} · ${targetLabel(e.target)} ${(e.n ?? 0) > 0 ? '+' : ''}${e.n}`;
      case 'ko': return `${who} · ${targetLabel(e.target)} 💀 ${t(lang, 'ko')}`;
      case 'switch': return `${who} · ${targetLabel(e.target)} ⇄ ${t(lang, 'active')}`;
      case 'cond': return `${who} · ${t(lang, conditionKey[e.c as Condition] ?? '')} ${e.on ? 'ON' : 'OFF'}`;
      case 'prize': return `${who} · ${fmt(t(lang, 'prizesLeft'), { n: e.n ?? 0 })}`;
      case 'coin': return e.n === 1 ? `🪙 ${t(lang, e.h ? 'heads' : 'tails')}` : `🪙 ${fmt(t(lang, 'headsCount'), { h: e.h ?? 0, n: e.n ?? 0 })}`;
      case 'checkup': return `✚ ${t(lang, 'checkup')} · ${who} +${e.n}`;
      case 'win': return `🏆 ${who}`;
      case 'undo': return `${who} · ↩ ${t(lang, 'undo')}`;
    }
  };

  // Optional counter ad (off by default, see site.config.ts).
  const adRef = useRef<HTMLModElement | null>(null);
  useEffect(() => {
    if (!ad || !adRef.current) return;
    try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({}); } catch {}
  }, [ad]);

  const pill = 'press h-9 rounded-full text-[11px] font-semibold';
  const sheet = 'w-full max-w-sm bg-surface border border-line rounded-[28px] p-5 text-fg max-h-[85dvh] overflow-y-auto select-auto shadow-2xl';
  const overlay = 'fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3';
  const sheetAnim = { animation: 'sheetIn 0.22s cubic-bezier(.2,.8,.2,1) forwards' };
  const sectionTitle = 'text-xs font-semibold text-muted mb-2';
  const row = 'press w-full h-12 rounded-2xl bg-surface-2 hover:bg-surface-3 font-medium text-sm flex items-center justify-between px-4';
  const closeBtn = (onClose: () => void) => (
    <button onClick={onClose} aria-label={t(lang, 'close')} className="press w-9 h-9 rounded-full bg-surface-2 text-muted hover:text-fg flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  );

  const areaProps = { lang, update, setTarget, adjust, knockOut, switchIn, toggleCondition, undo, onHint: showToast };

  return (
    <div className="bg-bg flex-1 w-full flex flex-col min-h-0 overflow-hidden max-w-md mx-auto select-none relative">
      <PlayerArea {...areaProps} state={game.p2} player="p2" name={nameOf('p2')} target={targets.p2} historyLen={game.history.p2.length} isRotated isAnim={anim.p2} />

      {/* Centre console */}
      <div className="w-full shrink-0 flex flex-col gap-1.5 px-2 py-1 relative z-40">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button onClick={nextTurn} className={`${pill} bg-surface border border-line text-fg px-3 flex justify-between items-center`}>
            <span>{t(lang, 'turn')} <span className="tabular">{game.turn}</span></span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <button
            onClick={() => { fireFeedback(); if (!timeUp) setRunning((r) => !r); }}
            aria-label={`${t(lang, 'timer')} ${formatTime(game.timeLeft)}`}
            title={t(lang, 'timerHint')}
            className={`press px-3 h-9 rounded-full flex items-center gap-1.5 text-2xl font-display font-semibold tabular ${timeUp ? 'text-rose-500 animate-pulse' : running ? 'text-fg' : 'text-muted'}`}
          >
            <span className={`w-2 h-2 rounded-full ${timeUp ? 'bg-rose-500' : running ? 'bg-emerald-500 animate-pulse' : 'bg-faint'}`} aria-hidden="true" />
            {timeUp ? t(lang, 'timeUp') : formatTime(game.timeLeft)}
          </button>
          <div className="flex gap-1">
            <button
              onClick={flipCoin}
              aria-live="polite"
              className={`${pill} flex-1 border ${isFlipping ? 'border-line bg-surface text-muted animate-pulse' : coinResult === 'HEADS' ? 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300' : coinResult === 'TAILS' ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300' : 'border-line bg-surface text-fg'}`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className={`w-4 h-4 rounded-full shrink-0 bg-[radial-gradient(circle_at_35%_30%,#ffe680,#f5b80f_60%,#c98a00)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.5)] ${isFlipping ? 'animate-spin' : ''}`} aria-hidden="true" />
                {isFlipping ? t(lang, 'flipping') : coinResult === 'HEADS' ? t(lang, 'heads') : coinResult === 'TAILS' ? t(lang, 'tails') : t(lang, 'flipCoin')}
              </span>
            </button>
            <button onClick={() => { fireFeedback(); setCoinRun(null); setCoinSheet(true); }} aria-label={t(lang, 'coinMore')} className={`${pill} w-9 border border-line bg-surface text-muted`}>×N</button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <div className="flex p-0.5 rounded-full bg-surface border border-line" role="group" aria-label="First player">
            {(['p2', 'p1'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { fireFeedback(); setGame((g) => ({ ...g, firstPlayer: p })); }}
                aria-pressed={game.firstPlayer === p}
                className={`press flex-1 h-7 rounded-full text-[10px] font-semibold ${game.firstPlayer === p ? 'bg-sun text-neutral-900 shadow-sm' : 'text-muted'}`}
              >{t(lang, p === 'p1' ? 'p1First' : 'p2First')}</button>
            ))}
          </div>
          <button onClick={checkup} className={`${pill} h-8 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            {t(lang, 'checkup')}
          </button>
          <button onClick={() => { fireFeedback(); setShowMenu(true); }} aria-label={t(lang, 'menu')} className={`${pill} h-8 w-10 bg-surface border border-line text-fg flex items-center justify-center`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
        {ad && (
          <div className="mt-1 flex flex-col items-center">
            <span className="text-[9px] text-faint">{t(lang, 'adLabel')}</span>
            <ins ref={adRef} className="adsbygoogle" style={{ display: 'inline-block', width: 320, height: 50 }} data-ad-client={ad.client} data-ad-slot={ad.slot} />
          </div>
        )}
      </div>

      <PlayerArea {...areaProps} state={game.p1} player="p1" name={nameOf('p1')} target={targets.p1} historyLen={game.history.p1.length} isRotated={false} isAnim={anim.p1} />

      {toast && (
        <div role="status" className="pointer-events-none fixed left-1/2 top-1/2 -mt-6 z-[90] max-w-[88vw] px-4 py-2.5 rounded-2xl bg-fg text-bg text-[13px] font-medium shadow-2xl text-center" style={{ animation: 'toastIn 0.2s ease-out forwards' }}>
          {toast}
        </div>
      )}

      {/* Winner */}
      {winner && !game.winnerDismissed && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-out forwards' }} role="dialog" aria-modal="true" aria-label={winnerText}>
          <div className={`w-full max-w-sm bg-surface border border-line rounded-[28px] p-6 text-center shadow-2xl ${winner === 'p2' ? 'rotate-180' : ''}`} style={sheetAnim}>
            <div className="relative mx-auto mb-3 w-40 h-20 flex items-center justify-center" aria-hidden="true">
              {(['Fire', 'Water', 'Grass', 'Lightning'] as const).map((e, i) => (
                <span key={e} className="floaty absolute" style={{ left: `${[2, 18, 72, 88][i]}%`, top: `${[10, 62, 58, 6][i]}%`, animationDelay: `${-i * 0.9}s` }}><EnergyBadge type={e} size={i % 2 ? 22 : 26} /></span>
              ))}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-3xl shadow-lg rotate-3">🏆</div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">{winnerText}</h2>
            <p className="text-muted text-sm">{fmt(t(lang, 'gameN'), { n: gameNumber })} · {t(lang, 'turn')} {game.turn}{game.timeLeft < game.duration ? ` · ${formatTime(game.duration - game.timeLeft)}` : ''}</p>
            <div className="my-5 flex items-center justify-center gap-4">
              <div className="flex-1 text-right text-sm font-medium truncate">{nameOf('p1')}</div>
              <div className="px-4 py-2 rounded-2xl bg-surface-2 text-2xl font-bold tabular">{series.p1 + (winner === 'p1' ? 1 : 0)} – {series.p2 + (winner === 'p2' ? 1 : 0)}</div>
              <div className="flex-1 text-left text-sm font-medium truncate">{nameOf('p2')}</div>
            </div>
            <button onClick={nextGame} className="press w-full mb-2 h-12 rounded-2xl bg-accent text-accent-fg font-semibold">{t(lang, 'nextGame')}</button>
            <a href={trackerHref} className="press w-full mb-2 h-11 rounded-2xl bg-surface-2 text-fg font-medium flex items-center justify-center gap-2"><span aria-hidden="true">📊</span>{t(lang, 'saveToTracker')}</a>
            <button onClick={() => setGame((g) => ({ ...g, winnerDismissed: true }))} className="press w-full h-11 rounded-2xl bg-surface-2 text-fg font-medium">{t(lang, 'close')}</button>
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-sm text-muted mb-3">{t(lang, 'supportCta')}</p>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="press inline-flex items-center gap-2 px-4 h-10 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-300 text-sm font-semibold">
                <span aria-hidden="true">♥</span>{t(lang, 'supportBtn')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Coin options */}
      {coinSheet && (
        <div className={overlay} onClick={() => setCoinSheet(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'coinMore')}>
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={sheetAnim}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-tight">{t(lang, 'coinMore')}</h2>
              {closeBtn(() => setCoinSheet(false))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setCoinCount((c) => Math.max(1, c - 1))} aria-label="−" className="press w-12 h-12 rounded-2xl bg-surface-2 text-xl font-semibold">−</button>
              <button onClick={() => flipMany('count')} className="press flex-1 h-12 rounded-2xl bg-accent text-accent-fg font-semibold">{fmt(t(lang, 'flipN'), { n: coinCount })}</button>
              <button onClick={() => setCoinCount((c) => Math.min(20, c + 1))} aria-label="+" className="press w-12 h-12 rounded-2xl bg-surface-2 text-xl font-semibold">+</button>
            </div>
            <button onClick={() => flipMany('untilTails')} className="press w-full h-12 rounded-2xl bg-surface-2 hover:bg-surface-3 font-semibold mb-4">{t(lang, 'flipUntilTails')}</button>
            {coinRun && (
              <div className="rounded-2xl bg-surface-2 p-4 text-center" aria-live="polite">
                <p className="text-2xl font-bold tracking-tight mb-3">{fmt(t(lang, 'headsCount'), { h: coinRun.filter(Boolean).length, n: coinRun.length })}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {coinRun.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${h ? 'bg-sky-500 text-white' : 'bg-surface-3 text-muted'}`} style={{ animation: `sheetIn 0.25s ${i * 0.04}s both` }}>
                      {h ? t(lang, 'heads').slice(0, 1) : t(lang, 'tails').slice(0, 1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match log */}
      {showLog && (
        <div className={overlay} onClick={() => setShowLog(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'matchLog')}>
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={sheetAnim}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">{t(lang, 'matchLog')}</h2>
              {closeBtn(() => setShowLog(false))}
            </div>
            {game.log.length === 0 ? (
              <p className="text-muted text-sm">{t(lang, 'logEmpty')}</p>
            ) : (
              <ol className="divide-y divide-line text-sm">
                {[...game.log].reverse().map((e, i) => (
                  <li key={game.log.length - i} className="py-2 tabular">{renderLog(e)}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {/* Menu */}
      {showMenu && (
        <div className={overlay} onClick={() => setShowMenu(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'menu')}>
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={sheetAnim}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-tight">{t(lang, 'menu')}</h2>
              {closeBtn(() => setShowMenu(false))}
            </div>

            <h3 className={sectionTitle}>{t(lang, 'playerNames')}</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(['p1', 'p2'] as const).map((p) => (
                <input
                  key={p}
                  value={names[p]}
                  maxLength={16}
                  onChange={(e) => setNames((n) => ({ ...n, [p]: e.target.value }))}
                  placeholder={t(lang, p === 'p1' ? 'player1' : 'player2')}
                  aria-label={`${t(lang, 'playerNames')} ${p.toUpperCase()}`}
                  className="h-11 px-3.5 rounded-2xl bg-surface-2 border border-transparent text-sm text-fg placeholder:text-faint focus:outline-none focus:border-accent"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm mb-6 px-1">
              <span className="text-muted">{t(lang, 'series')} <strong className="text-fg tabular">{series.p1}–{series.p2}</strong> · {fmt(t(lang, 'gameN'), { n: gameNumber })}</span>
              <button onClick={() => setSeries({ p1: 0, p2: 0 })} className="text-xs text-accent font-medium">{t(lang, 'resetSeries')}</button>
            </div>

            <h3 className={sectionTitle}>{t(lang, 'timer')}</h3>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-surface-2 mb-2">
              {[25, 30, 50].map((m) => (
                <button key={m} onClick={() => setDuration(m)} aria-pressed={game.duration === m * 60} className={`press h-9 rounded-xl text-sm font-semibold ${game.duration === m * 60 ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>
                  {m}<span className="text-[10px] font-normal ml-0.5">{t(lang, 'minutes')}</span>
                </button>
              ))}
              <button onClick={() => setDuration(game.duration / 60)} aria-label={t(lang, 'timerReset')} className="press h-9 rounded-xl text-muted flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
              </button>
            </div>
            <p className="text-xs text-faint mb-6 px-1">{t(lang, 'timerHint')}</p>

            <h3 className={sectionTitle}>{t(lang, 'theme')}</h3>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-surface-2 mb-6">
              {(['system', 'light', 'dark'] as const).map((v) => (
                <button key={v} onClick={() => chooseTheme(v)} aria-pressed={themePref === v} className={`press h-9 rounded-xl text-sm font-medium ${themePref === v ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>
                  {t(lang, v === 'system' ? 'themeSystem' : v === 'light' ? 'themeLight' : 'themeDark')}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mb-6">
              <button onClick={() => { setShowMenu(false); setShowLog(true); }} className={row}><span>{t(lang, 'matchLog')}</span><span className="text-faint tabular">{game.log.length}</span></button>
              <button onClick={toggleSound} aria-pressed={soundOn} className={row}>
                <span>{t(lang, 'soundOn')}</span>
                <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${soundOn ? 'bg-emerald-500' : 'bg-surface-3'}`}><span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${soundOn ? 'translate-x-4' : ''}`} /></span>
              </button>
              <button onClick={() => { setShowMenu(false); setShowOnboarding(true); }} className={row}><span>{t(lang, 'help')}</span><span className="text-faint">›</span></button>
              <a href={localePath(cl, 'guides/')} className={row}><span>{t(lang, 'navGuides')}</span><span className="text-faint">›</span></a>
              <a href={localePath(cl, 'tools/')} className={row}><span>{t(lang, 'navTools')}</span><span className="text-faint">›</span></a>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className={`${row} !bg-pink-500/12 text-pink-600 dark:text-pink-300`}><span>♥ {t(lang, 'navSupport')}</span><span>›</span></a>
              <button onClick={startNewMatch} className={`${row} text-rose-600 dark:text-rose-400`}><span>{t(lang, 'newMatch')}</span></button>
            </div>

            <h3 className={sectionTitle}>{t(lang, 'onboardLangTitle')}</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {langs.map((l) => (
                <a key={l} href={localePath(l)} hrefLang={l} className={`press h-10 rounded-xl text-xs font-medium flex items-center justify-center ${lang === l ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg hover:bg-surface-3'}`}>{langLabels[l]}</a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding / help */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-out forwards' }} role="dialog" aria-modal="true" aria-label={t(lang, 'onboardTitle')}>
          <div className="w-full max-w-sm bg-surface border border-line rounded-[28px] p-6 flex flex-col text-fg max-h-[85dvh] overflow-y-auto shadow-2xl relative select-auto" style={sheetAnim}>
            <img src="/favicon.svg" alt="" width="44" height="44" className="rounded-xl mb-4" />
            <h2 className="text-2xl font-bold tracking-tight mb-4">{t(lang, 'onboardTitle')}</h2>
            <ul className="text-sm leading-relaxed text-muted space-y-3 mb-4">
              <li><strong className="text-fg font-semibold">{t(lang, 'onboardHpTitle')}</strong> {t(lang, 'onboardHpDesc')}</li>
              <li><strong className="text-fg font-semibold">A / B1–B5:</strong> {t(lang, 'active')} / {t(lang, 'bench')} · ⇅ {t(lang, 'switchToActive')}</li>
              <li><strong className="text-fg font-semibold">{t(lang, 'onboardTurnTitle')}</strong> {t(lang, 'onboardTurnDesc')}</li>
              <li><strong className="text-fg font-semibold">{t(lang, 'onboardOriTitle')}</strong> {t(lang, 'onboardOriDesc')}</li>
              <li><strong className="text-fg font-semibold">{t(lang, 'checkup')}:</strong> {t(lang, 'checkupFlipReminder')}</li>
            </ul>
            <a href={localePath(cl, 'guides/how-to-use-ptcg-companion/')} className="text-sm text-accent font-medium mb-6">{t(lang, 'navGuides')} →</a>

            <h3 className={sectionTitle}>{t(lang, 'onboardLangTitle')}</h3>
            <div className="grid grid-cols-3 gap-1.5 mb-5">
              {langs.map((l) => (
                <a key={l} href={localePath(l)} hrefLang={l} className={`press h-10 rounded-xl text-xs font-medium flex items-center justify-center ${lang === l ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg hover:bg-surface-3'}`}>{langLabels[l]}</a>
              ))}
            </div>

            <details className="group rounded-2xl bg-surface-2 mb-2">
              <summary className="px-4 h-12 flex justify-between items-center text-sm font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span>{t(lang, 'onboardPrivacy')}</span>
                <span className="text-faint transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="px-4 pb-4 text-xs text-muted leading-relaxed">
                {t(lang, 'onboardPrivacyDesc')}{' '}
                <a href={localePath(lang, 'privacy-policy/')} className="text-accent">{t(lang, 'privacyPolicy')} →</a>
              </div>
            </details>
            <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="press px-4 h-12 rounded-2xl bg-pink-500/12 text-sm font-medium text-pink-600 dark:text-pink-300 flex items-center justify-between mb-5">
              <span>♥ {t(lang, 'navSupport')}</span><span aria-hidden="true">›</span>
            </a>

            <button onClick={closeOnboarding} className="press sticky bottom-0 mt-auto w-full h-14 rounded-2xl bg-accent text-accent-fg font-semibold text-base shadow-lg">
              {t(lang, 'onboardStartBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
