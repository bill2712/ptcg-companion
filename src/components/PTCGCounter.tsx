import React, { useState, useEffect, useRef, useCallback } from 'react';
import { langs, t, langLabels, localePath, toContentLang } from '../locales/translations';

type ElementType = 'None' | 'Grass' | 'Fire' | 'Water' | 'Lightning' | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal' | 'Dragon' | 'Colorless' | 'Stellar';
type PlayerId = 'p1' | 'p2';
/** -1 = Active Pokémon, 0-4 = Bench slot. */
type Target = number;

const elementThemeMap: Record<ElementType, string> = {
  None: 'border-neutral-800 shadow-none',
  Grass: 'shadow-[inset_0_0_30px_rgba(34,197,94,0.15)] border-green-500',
  Fire: 'shadow-[inset_0_0_30px_rgba(239,68,68,0.15)] border-red-500',
  Water: 'shadow-[inset_0_0_30px_rgba(59,130,246,0.15)] border-blue-500',
  Lightning: 'shadow-[inset_0_0_30px_rgba(234,179,8,0.15)] border-yellow-400',
  Psychic: 'shadow-[inset_0_0_30px_rgba(168,85,247,0.15)] border-purple-500',
  Fighting: 'shadow-[inset_0_0_30px_rgba(217,119,6,0.15)] border-amber-600',
  Darkness: 'shadow-[inset_0_0_30px_rgba(31,41,55,0.4)] border-gray-600',
  Metal: 'shadow-[inset_0_0_30px_rgba(156,163,175,0.15)] border-gray-400',
  Dragon: 'shadow-[inset_0_0_30px_rgba(202,138,4,0.15)] border-yellow-600',
  Colorless: 'shadow-[inset_0_0_30px_rgba(226,232,240,0.15)] border-slate-300',
  Stellar: 'shadow-[inset_0_0_30px_rgba(99,102,241,0.15)] border-indigo-400',
};

const typeColors: Record<ElementType, string> = {
  None: 'bg-neutral-800', Grass: 'bg-green-600', Fire: 'bg-red-600', Water: 'bg-blue-600',
  Lightning: 'bg-yellow-400', Psychic: 'bg-purple-600', Fighting: 'bg-amber-700', Darkness: 'bg-gray-800',
  Metal: 'bg-gray-400', Dragon: 'bg-yellow-700', Colorless: 'bg-slate-300', Stellar: 'bg-indigo-500',
};

const typeInitials: Record<ElementType, string> = {
  None: '×', Grass: 'G', Fire: 'F', Water: 'W', Lightning: 'L', Psychic: 'P',
  Fighting: 'Fg', Darkness: 'D', Metal: 'M', Dragon: 'R', Colorless: 'C', Stellar: 'S',
};

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

const toggleBase = 'rounded-lg font-bold uppercase tracking-wide border transition-colors active:scale-95';

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

  let statusRing = '';
  if (state.poisoned) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-green-500 shadow-[0_0_25px_rgba(34,197,94,0.6)]';
  else if (state.burned) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.6)]';
  else if (state.paralyzed) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.6)]';
  else if (state.asleep) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)]';
  else if (state.confused) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.6)]';

  const conditions: { key: Condition; on: string }[] = [
    { key: 'poisoned', on: 'shadow-[0_0_15px_rgba(34,197,94,0.6)] border-green-400 bg-green-600 text-white' },
    { key: 'burned', on: 'shadow-[0_0_15px_rgba(249,115,22,0.6)] border-orange-400 bg-orange-600 text-white' },
    { key: 'asleep', on: 'shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-400 bg-blue-600 text-white' },
    { key: 'paralyzed', on: 'shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-400 bg-yellow-500 text-neutral-950' },
    { key: 'confused', on: 'shadow-[0_0_15px_rgba(168,85,247,0.6)] border-purple-400 bg-purple-600 text-white' },
  ];

  const perTurn: { key: 'energyUsed' | 'supporterUsed' | 'retreatUsed' | 'abilityUsed'; label: string; idle: string }[] = [
    { key: 'energyUsed', label: t(lang, 'energy'), idle: 'bg-amber-950 border-amber-800 text-amber-300' },
    { key: 'supporterUsed', label: t(lang, 'supporter'), idle: 'bg-sky-950 border-sky-800 text-sky-300' },
    { key: 'retreatUsed', label: t(lang, 'retreatUsed'), idle: 'bg-neutral-900 border-neutral-600 text-neutral-300' },
    { key: 'abilityUsed', label: t(lang, 'ability'), idle: 'bg-rose-950 border-rose-800 text-rose-300' },
  ];

  const slots: Target[] = [-1, 0, 1, 2, 3, 4];

  return (
    <section
      aria-label={name}
      className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col justify-between gap-1 p-2 m-1 bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 rounded-2xl relative transition-all duration-300 ${elementThemeMap[state.activeType]} ${statusRing} ${isRotated ? 'rotate-180' : ''}`}
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
                className={`flex-1 h-[30px] rounded-md border flex flex-col items-center justify-center leading-none transition-all ${sel ? 'ring-2 ring-white border-white' : 'border-neutral-700'} ${s < 0 ? (d > 0 ? 'bg-red-900 text-red-100' : 'bg-red-950/70 text-red-300') : d > 0 ? 'bg-orange-900 text-orange-100' : 'bg-neutral-900 text-neutral-500'}`}
              >
                <span className="text-[7px] font-bold uppercase opacity-70">{s < 0 ? 'A' : `B${s + 1}`}</span>
                <span className="text-[11px] font-black font-mono">{d > 0 ? d : '–'}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => (target < 0 ? onHint(t(lang, 'pickBenchFirst')) : switchIn(player, target))}
          aria-label={t(lang, 'switchToActive')}
          title={t(lang, 'switchToActive')}
          className={`w-8 h-[30px] rounded-md border text-base font-black flex items-center justify-center active:scale-90 ${target < 0 ? 'border-neutral-800 text-neutral-600' : 'border-indigo-400 bg-indigo-900 text-white'}`}
        >⇄</button>
        <div className="relative">
          <button
            onClick={() => setTypeOpen((o) => !o)}
            aria-label={`${t(lang, 'type')}: ${state.activeType}`}
            aria-expanded={typeOpen}
            className={`w-[30px] h-[30px] rounded-full border-2 border-neutral-600 text-[10px] font-black text-white flex items-center justify-center ${typeColors[state.activeType]}`}
            style={state.activeType === 'None' ? { background: 'conic-gradient(#16a34a, #dc2626, #2563eb, #facc15, #9333ea, #b45309, #16a34a)' } : undefined}
          >{state.activeType === 'None' ? '' : typeInitials[state.activeType]}</button>
          {typeOpen && (
            <div className="absolute right-0 top-9 z-30 p-2 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl grid grid-cols-4 gap-1.5 w-[148px]" role="group" aria-label={t(lang, 'type')}>
              {types.map((el) => (
                <button
                  key={el}
                  onClick={() => { update(player, { activeType: el }); setTypeOpen(false); }}
                  aria-label={el}
                  aria-pressed={state.activeType === el}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black text-white ${typeColors[el]} ${state.activeType === el ? 'ring-2 ring-white border-white' : 'border-neutral-900'}`}
                >{typeInitials[el]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Damage + per-turn toggles */}
      <div className="flex items-stretch justify-between w-full gap-2">
        <div
          className={`${target < 0 ? 'bg-red-950' : 'bg-orange-950'} border-4 rounded-xl w-36 h-16 shrink-0 flex items-center justify-center relative transition-all duration-200 ${dmg > 0 ? (target < 0 ? 'border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'border-orange-400') : 'border-red-800 shadow-inner'} ${isAnim ? 'scale-105' : 'scale-100'}`}
        >
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider text-red-200/70 whitespace-nowrap max-w-[130px] truncate">{name} · {targetLabel}</span>
          <span aria-live="polite" aria-label={`${targetLabel}: ${dmg}`} className={`text-4xl font-black font-mono tracking-tighter mt-1.5 ${target < 0 ? 'text-red-500' : 'text-orange-400'}`} style={{ textShadow: '0 0 15px rgba(239,68,68,0.5)' }}>
            {dmg}
          </span>
          <button
            onClick={() => undo(player)}
            disabled={historyLen === 0}
            aria-label={t(lang, 'undo')}
            title={t(lang, 'undo')}
            className={`absolute left-0.5 bottom-0.5 w-7 h-7 rounded-md text-sm font-bold flex items-center justify-center ${historyLen > 0 ? 'text-blue-300 bg-blue-950/70 active:scale-90' : 'text-neutral-700 opacity-40'}`}
          >↩</button>
          <button
            onClick={() => knockOut(player, target)}
            aria-label={`${t(lang, 'ko')}: ${targetLabel}`}
            title={t(lang, 'ko')}
            className="absolute right-0.5 bottom-0.5 h-7 px-1 rounded-md text-[9px] font-black flex items-center justify-center text-neutral-200 bg-black/50 active:scale-90 hover:text-white"
          >{t(lang, 'ko')}</button>
        </div>

        <div className="grid grid-cols-2 gap-1 flex-1 max-w-[170px]">
          {perTurn.map((p) => (
            <button
              key={p.key}
              onClick={() => update(player, { [p.key]: !state[p.key] })}
              aria-pressed={state[p.key]}
              className={`${toggleBase} text-[9px] leading-tight px-0.5 ${state[p.key] ? 'bg-neutral-800 border-neutral-700 text-neutral-500 line-through' : p.idle}`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Prize cards */}
      <div className="grid grid-cols-6 gap-1 w-full" role="group" aria-label="Prize cards">
        {state.prizes.map((isActive, idx) => (
          <button
            key={idx}
            onClick={() => togglePrize(idx)}
            aria-pressed={!isActive}
            aria-label={`Prize ${idx + 1}`}
            className={`h-6 rounded font-black text-xs transition-all border ${isActive ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-neutral-900 border-neutral-800 text-neutral-600 opacity-40 line-through'}`}
          >{idx + 1}</button>
        ))}
      </div>

      {/* Damage keypad (applies to the selected Pokémon) */}
      <div className="grid grid-cols-4 gap-2 w-full">
        {[-10, 10, 50, 100].map((n) => (
          <button
            key={n}
            onClick={() => adjust(player, target, n)}
            className={`h-10 rounded-xl font-black text-lg active:scale-95 border ${n < 0 ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-emerald-950 text-emerald-400 border-emerald-800'}`}
          >{n > 0 ? `+${n}` : n}</button>
        ))}
      </div>

      {/* Special Conditions (Active Pokémon only) */}
      <div className="grid grid-cols-5 gap-1 w-full" role="group" aria-label="Special Conditions">
        {conditions.map((c) => (
          <button
            key={c.key}
            onClick={() => toggleCondition(player, c.key)}
            aria-pressed={state[c.key]}
            className={`${toggleBase} h-7 text-[9px] px-0.5 ${state[c.key] ? c.on : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
          >{t(lang, conditionKey[c.key])}</button>
        ))}
      </div>

      {/* Once-per-game markers */}
      <div className="flex items-center gap-2 w-full">
        {([
          ['vstarUsed', 'VSTAR', 'bg-gradient-to-br from-yellow-200 to-yellow-600 text-neutral-950 border-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.5)]'],
          ['gxUsed', 'GX', 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]'],
          ['aceSpecUsed', 'ACE SPEC', 'bg-gradient-to-br from-pink-400 to-fuchsia-600 text-white border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.5)]'],
        ] as const).map(([key, text, on]) => (
          <button
            key={key}
            onClick={() => update(player, { [key]: !state[key] })}
            aria-pressed={state[key]}
            className={`flex-1 h-7 rounded-lg font-black italic tracking-widest text-xs border-2 transition-all ${state[key] ? 'grayscale opacity-30 border-neutral-700 bg-neutral-800 text-neutral-500 line-through' : on}`}
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
  const seriesText = `${nameOf('p1')} ${series.p1} – ${series.p2} ${nameOf('p2')}`;

  const nextGame = () => {
    if (!winner) return;
    setSeries((s) => ({ ...s, [winner]: s[winner] + 1 }));
    resetBoard();
  };

  const renderLog = (e: LogEntry) => {
    const who = e.p ? nameOf(e.p) : '';
    switch (e.k) {
      case 'turn': return <span className="text-neutral-500">— {t(lang, 'turn')} {e.n} —</span>;
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

  const consoleBtn = 'h-9 rounded-lg border text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-colors';
  const sheet = 'w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-white max-h-[85dvh] overflow-y-auto select-auto';
  const overlay = 'fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3';

  const areaProps = { lang, update, setTarget, adjust, knockOut, switchIn, toggleCondition, undo, onHint: showToast };

  return (
    <div className="bg-black flex-1 w-full flex flex-col min-h-0 overflow-hidden max-w-md mx-auto font-sans select-none relative">
      <PlayerArea {...areaProps} state={game.p2} player="p2" name={nameOf('p2')} target={targets.p2} historyLen={game.history.p2.length} isRotated isAnim={anim.p2} />

      {/* Centre console */}
      <div className="w-full shrink-0 flex flex-col gap-1.5 px-2 py-1.5 bg-neutral-950/90 backdrop-blur border-y border-neutral-900 relative z-40">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button onClick={nextTurn} className={`${consoleBtn} bg-neutral-800 border-neutral-600 text-white px-3 flex justify-between items-center hover:bg-neutral-700`}>
            <span>{t(lang, 'turn')} {game.turn}</span><span aria-hidden="true">➔</span>
          </button>
          <button
            onClick={() => { fireFeedback(); if (!timeUp) setRunning((r) => !r); }}
            aria-label={`${t(lang, 'timer')} ${formatTime(game.timeLeft)}`}
            title={t(lang, 'timerHint')}
            className={`px-2 text-2xl font-mono tracking-widest font-extrabold active:scale-95 transition-colors ${timeUp ? 'text-red-500 animate-pulse' : running ? 'text-amber-400' : 'text-amber-400/60'}`}
            style={{ textShadow: running ? '0 0 10px rgba(251,191,36,0.35)' : undefined }}
          >
            {timeUp ? t(lang, 'timeUp') : formatTime(game.timeLeft)}
            {!running && !timeUp && <span className="ml-1 text-xs align-middle" aria-hidden="true">▶</span>}
          </button>
          <div className="flex gap-1">
            <button
              onClick={flipCoin}
              aria-live="polite"
              className={`${consoleBtn} flex-1 border-2 font-black ${isFlipping ? 'border-neutral-600 bg-neutral-800 animate-pulse text-neutral-400' : coinResult === 'HEADS' ? 'border-cyan-500 bg-cyan-950 text-cyan-300' : coinResult === 'TAILS' ? 'border-fuchsia-500 bg-fuchsia-950 text-fuchsia-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}
            >
              {isFlipping ? t(lang, 'flipping') : coinResult === 'HEADS' ? t(lang, 'heads') : coinResult === 'TAILS' ? t(lang, 'tails') : t(lang, 'flipCoin')}
            </button>
            <button onClick={() => { fireFeedback(); setCoinRun(null); setCoinSheet(true); }} aria-label={t(lang, 'coinMore')} className={`${consoleBtn} w-7 border-neutral-700 bg-neutral-900 text-neutral-300`}>×N</button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="First player">
            {(['p2', 'p1'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { fireFeedback(); setGame((g) => ({ ...g, firstPlayer: p })); }}
                aria-pressed={game.firstPlayer === p}
                className={`flex-1 h-8 rounded text-[9px] font-bold border transition-colors ${game.firstPlayer === p ? 'bg-amber-600 border-amber-400 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}
              >{t(lang, p === 'p1' ? 'p1First' : 'p2First')}</button>
            ))}
          </div>
          <button onClick={checkup} className={`${consoleBtn} h-8 bg-emerald-950 border-emerald-700 text-emerald-300 hover:bg-emerald-900`}>
            ✚ {t(lang, 'checkup')}
          </button>
          <button onClick={() => { fireFeedback(); setShowMenu(true); }} aria-label={t(lang, 'menu')} className={`${consoleBtn} h-8 px-3 bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800`}>☰</button>
        </div>
        {ad && (
          <div className="mt-1 flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-neutral-600">{t(lang, 'adLabel')}</span>
            <ins ref={adRef} className="adsbygoogle" style={{ display: 'inline-block', width: 320, height: 50 }} data-ad-client={ad.client} data-ad-slot={ad.slot} />
          </div>
        )}
      </div>

      <PlayerArea {...areaProps} state={game.p1} player="p1" name={nameOf('p1')} target={targets.p1} historyLen={game.history.p1.length} isRotated={false} isAnim={anim.p1} />

      {toast && (
        <div role="status" className="pointer-events-none fixed left-1/2 top-1/2 -mt-6 z-[90] max-w-[90vw] px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold shadow-2xl text-center" style={{ animation: 'toastIn 0.2s ease-out forwards' }}>
          {toast}
        </div>
      )}

      {/* Winner */}
      {winner && !game.winnerDismissed && (
        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-out forwards' }} role="dialog" aria-modal="true" aria-label={winnerText}>
          <div className={`w-full max-w-sm bg-neutral-900 border border-amber-500/60 rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.3)] ${winner === 'p2' ? 'rotate-180' : ''}`}>
            <div className="text-5xl mb-2" aria-hidden="true">🏆</div>
            <h2 className="text-3xl font-black text-amber-400 mb-1">{winnerText}</h2>
            <p className="text-neutral-400 text-sm mb-1">{fmt(t(lang, 'gameN'), { n: gameNumber })} · {t(lang, 'turn')} {game.turn}{game.timeLeft < game.duration ? ` · ${formatTime(game.duration - game.timeLeft)}` : ''}</p>
            <p className="text-neutral-300 text-sm font-bold mb-5">{t(lang, 'series')}: {nameOf('p1')} {series.p1 + (winner === 'p1' ? 1 : 0)} – {series.p2 + (winner === 'p2' ? 1 : 0)} {nameOf('p2')}</p>
            <button onClick={nextGame} className="w-full mb-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-white uppercase tracking-wider">{t(lang, 'nextGame')}</button>
            <button onClick={() => setGame((g) => ({ ...g, winnerDismissed: true }))} className="w-full mb-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold">{t(lang, 'close')}</button>
            <div className="border-t border-neutral-800 pt-4">
              <p className="text-sm text-neutral-300 mb-2">♥ {t(lang, 'supportCta')}</p>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="inline-block px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold">{t(lang, 'supportBtn')}</a>
            </div>
          </div>
        </div>
      )}

      {/* Coin options */}
      {coinSheet && (
        <div className={overlay} onClick={() => setCoinSheet(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'coinMore')}>
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">🪙 {t(lang, 'coinMore')}</h2>
              <button onClick={() => setCoinSheet(false)} aria-label={t(lang, 'close')} className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700">✕</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setCoinCount((c) => Math.max(1, c - 1))} aria-label="−" className="w-10 h-11 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-black">−</button>
              <button onClick={() => flipMany('count')} className="flex-1 h-11 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-black">{fmt(t(lang, 'flipN'), { n: coinCount })}</button>
              <button onClick={() => setCoinCount((c) => Math.min(20, c + 1))} aria-label="+" className="w-10 h-11 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-black">+</button>
            </div>
            <button onClick={() => flipMany('untilTails')} className="w-full h-11 rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 font-black mb-4">{t(lang, 'flipUntilTails')}</button>
            {coinRun && (
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-center" aria-live="polite">
                <p className="text-2xl font-black text-white mb-3">{fmt(t(lang, 'headsCount'), { h: coinRun.filter(Boolean).length, n: coinRun.length })}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {coinRun.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${h ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-300'}`}>
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
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">📜 {t(lang, 'matchLog')}</h2>
              <button onClick={() => setShowLog(false)} aria-label={t(lang, 'close')} className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700">✕</button>
            </div>
            {game.log.length === 0 ? (
              <p className="text-neutral-500 text-sm">{t(lang, 'logEmpty')}</p>
            ) : (
              <ol className="space-y-1.5 text-sm font-mono">
                {[...game.log].reverse().map((e, i) => (
                  <li key={game.log.length - i} className="text-neutral-200">{renderLog(e)}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {/* Menu */}
      {showMenu && (
        <div className={overlay} onClick={() => setShowMenu(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'menu')}>
          <div className={sheet} onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">{t(lang, 'menu')}</h2>
              <button onClick={() => setShowMenu(false)} aria-label={t(lang, 'close')} className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700">✕</button>
            </div>

            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t(lang, 'playerNames')}</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(['p1', 'p2'] as const).map((p) => (
                <input
                  key={p}
                  value={names[p]}
                  maxLength={16}
                  onChange={(e) => setNames((n) => ({ ...n, [p]: e.target.value }))}
                  placeholder={t(lang, p === 'p1' ? 'player1' : 'player2')}
                  aria-label={`${t(lang, 'playerNames')} ${p.toUpperCase()}`}
                  className="h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm mb-5">
              <span className="text-neutral-300">{t(lang, 'series')}: <strong>{seriesText}</strong> · {fmt(t(lang, 'gameN'), { n: gameNumber })}</span>
              <button onClick={() => setSeries({ p1: 0, p2: 0 })} className="text-xs text-neutral-400 underline">{t(lang, 'resetSeries')}</button>
            </div>

            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t(lang, 'timer')}</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[25, 30, 50].map((m) => (
                <button key={m} onClick={() => setDuration(m)} aria-pressed={game.duration === m * 60} className={`py-2 rounded-lg border text-sm font-bold ${game.duration === m * 60 ? 'bg-amber-600 border-amber-400' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'}`}>
                  {m} <span className="text-[10px] font-normal">{t(lang, 'minutes')}</span>
                </button>
              ))}
              <button onClick={() => setDuration(game.duration / 60)} aria-label={t(lang, 'timerReset')} className="py-2 rounded-lg border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-xs font-bold">↺</button>
            </div>
            <p className="text-xs text-neutral-500 mb-5">{t(lang, 'timerHint')}</p>

            <div className="flex flex-col gap-2 mb-5">
              <button onClick={() => { setShowMenu(false); setShowLog(true); }} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-bold">📜 {t(lang, 'matchLog')}</button>
              <button onClick={startNewMatch} className="w-full py-3 rounded-xl bg-red-950 border border-red-800 text-red-200 font-bold hover:bg-red-900">{t(lang, 'newMatch')}</button>
              <button onClick={toggleSound} aria-pressed={soundOn} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-bold flex justify-between px-4">
                <span>{t(lang, 'soundOn')}</span><span>{soundOn ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={() => { setShowMenu(false); setShowOnboarding(true); }} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-bold">❓ {t(lang, 'help')}</button>
              <a href={localePath(cl, 'guides/')} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-bold text-center">📖 {t(lang, 'navGuides')}</a>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="w-full py-3 rounded-xl bg-pink-700 hover:bg-pink-600 font-bold text-center">♥ {t(lang, 'navSupport')}</a>
            </div>

            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t(lang, 'onboardLangTitle')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {langs.map((l) => (
                <a key={l} href={localePath(l)} hrefLang={l} className={`px-2 py-2 border rounded-lg text-xs text-center font-bold ${lang === l ? 'bg-indigo-600 border-indigo-500' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}>{langLabels[l]}</a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding / help */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] backdrop-blur-md bg-black/80 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-out forwards' }} role="dialog" aria-modal="true" aria-label={t(lang, 'onboardTitle')}>
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col text-white max-h-[85dvh] overflow-y-auto shadow-2xl relative select-auto">
            <h2 className="text-xl font-black mb-3 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{t(lang, 'onboardTitle')}</h2>
            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50 mb-4">
              <ul className="text-sm leading-relaxed text-neutral-200 list-disc pl-4 space-y-2">
                <li><strong>{t(lang, 'onboardHpTitle')}</strong> {t(lang, 'onboardHpDesc')}</li>
                <li><strong>A / B1–B5:</strong> {t(lang, 'active')} / {t(lang, 'bench')} · ⇄ {t(lang, 'switchToActive')}</li>
                <li><strong>{t(lang, 'onboardTurnTitle')}</strong> {t(lang, 'onboardTurnDesc')}</li>
                <li><strong>{t(lang, 'onboardOriTitle')}</strong> {t(lang, 'onboardOriDesc')}</li>
                <li><strong>✚ {t(lang, 'checkup')}:</strong> {t(lang, 'checkupFlipReminder')}</li>
              </ul>
              <a href={localePath(cl, 'guides/how-to-use-ptcg-companion/')} className="inline-block mt-3 text-sm text-indigo-300 hover:underline">📖 {t(lang, 'navGuides')} →</a>
            </div>

            <div className="mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t(lang, 'onboardLangTitle')}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {langs.map((l) => (
                  <a key={l} href={localePath(l)} hrefLang={l} className={`px-2 py-2 border rounded-lg text-[11px] sm:text-xs text-center font-bold transition-all ${lang === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}>{langLabels[l]}</a>
                ))}
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-2">
              <details className="group border border-neutral-800 rounded-lg overflow-hidden">
                <summary className="w-full px-4 py-3 bg-neutral-800/30 flex justify-between items-center text-sm font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span>{t(lang, 'onboardPrivacy')}</span>
                  <span className="text-neutral-500 group-open:hidden">+</span>
                  <span className="text-neutral-500 hidden group-open:block">−</span>
                </summary>
                <div className="p-4 text-xs text-neutral-400 bg-neutral-900/50 leading-relaxed border-t border-neutral-800">
                  {t(lang, 'onboardPrivacyDesc')}{' '}
                  <a href={localePath(lang, 'privacy-policy/')} className="text-blue-400 hover:underline">{t(lang, 'privacyPolicy')} →</a>
                </div>
              </details>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="px-4 py-3 rounded-lg border border-pink-900 bg-pink-950/40 text-sm font-bold text-pink-200 flex justify-between">
                <span>♥ {t(lang, 'navSupport')}</span><span aria-hidden="true">→</span>
              </a>
            </div>

            <button onClick={closeOnboarding} className="sticky bottom-0 mt-auto w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black tracking-widest uppercase py-4 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              {t(lang, 'onboardStartBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
