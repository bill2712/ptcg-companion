import React, { useState, useEffect, useRef, useCallback } from 'react';
import { langs, t, langLabels, localePath, toContentLang } from '../locales/translations';

type ElementType = 'None' | 'Grass' | 'Fire' | 'Water' | 'Lightning' | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal' | 'Dragon' | 'Colorless' | 'Stellar';
type PlayerId = 'p1' | 'p2';

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
  None: '', Grass: 'G', Fire: 'F', Water: 'W', Lightning: 'L', Psychic: 'P',
  Fighting: 'Fg', Darkness: 'D', Metal: 'M', Dragon: 'R', Colorless: 'C', Stellar: 'S',
};

const types: ElementType[] = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless', 'Stellar'];

interface PlayerState {
  hp: number;
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

const initialPlayerState = (): PlayerState => ({
  hp: 0,
  poisoned: false,
  burned: false,
  asleep: false,
  paralyzed: false,
  confused: false,
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

const DEFAULT_DURATION = 30 * 60;
const HISTORY_LIMIT = 20;
const STORAGE_KEY = 'ptcg_companion_match_v1';

interface Game {
  p1: PlayerState;
  p2: PlayerState;
  history: Record<PlayerId, PlayerState[]>;
  turn: number;
  firstPlayer: PlayerId | null;
  duration: number;
  timeLeft: number;
  winnerDismissed: boolean;
}

const newGame = (duration = DEFAULT_DURATION): Game => ({
  p1: initialPlayerState(),
  p2: initialPlayerState(),
  history: { p1: [], p2: [] },
  turn: 1,
  firstPlayer: null,
  duration,
  timeLeft: duration,
  winnerDismissed: false,
});

const isPristine = (g: Game) =>
  g.turn === 1 && g.timeLeft === g.duration && g.history.p1.length === 0 && g.history.p2.length === 0;

const loadGame = (): Game | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Game>;
    const base = newGame(parsed.duration ?? DEFAULT_DURATION);
    return {
      ...base,
      ...parsed,
      p1: { ...initialPlayerState(), ...parsed.p1 },
      p2: { ...initialPlayerState(), ...parsed.p2 },
      history: { p1: parsed.history?.p1 ?? [], p2: parsed.history?.p2 ?? [] },
    };
  } catch {
    return null;
  }
};

// Asleep, Paralyzed and Confused are shown by turning the card, so only one can apply at a time.
const ROTATION = ['asleep', 'paralyzed', 'confused'] as const;
type Condition = 'poisoned' | 'burned' | (typeof ROTATION)[number];

interface ScreenLock { release(): Promise<void> }
type WakeLockNav = { wakeLock?: { request(type: 'screen'): Promise<ScreenLock> } };

const toggleBase = 'rounded-lg font-bold uppercase tracking-wide border transition-colors active:scale-95';

interface PlayerAreaProps {
  state: PlayerState;
  player: PlayerId;
  historyLen: number;
  isRotated: boolean;
  isAnim: boolean;
  lang: string;
  update: (player: PlayerId, updates: Partial<PlayerState>) => void;
  toggleCondition: (player: PlayerId, c: Condition) => void;
  undo: (player: PlayerId) => void;
}

const PlayerArea = ({ state, player, historyLen, isRotated, isAnim, lang, update, toggleCondition, undo }: PlayerAreaProps) => {
  const adjustHp = (amount: number) => update(player, { hp: Math.max(0, Math.min(990, state.hp + amount)) });
  const togglePrize = (index: number) => {
    const prizes = [...state.prizes];
    prizes[index] = !prizes[index];
    update(player, { prizes });
  };
  const label = t(lang, player === 'p1' ? 'player1' : 'player2');

  let statusRing = '';
  if (state.poisoned) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-green-500 shadow-[0_0_25px_rgba(34,197,94,0.6)]';
  else if (state.burned) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.6)]';
  else if (state.paralyzed) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.6)]';
  else if (state.asleep) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)]';
  else if (state.confused) statusRing = 'ring-4 ring-offset-2 ring-offset-black ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.6)]';

  const conditions: { key: Condition; label: string; on: string }[] = [
    { key: 'poisoned', label: t(lang, 'poison'), on: 'shadow-[0_0_15px_rgba(34,197,94,0.6)] border-green-400 bg-green-600 text-white' },
    { key: 'burned', label: t(lang, 'burn'), on: 'shadow-[0_0_15px_rgba(249,115,22,0.6)] border-orange-400 bg-orange-600 text-white' },
    { key: 'asleep', label: t(lang, 'asleep'), on: 'shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-400 bg-blue-600 text-white' },
    { key: 'paralyzed', label: t(lang, 'para'), on: 'shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-400 bg-yellow-500 text-neutral-950' },
    { key: 'confused', label: t(lang, 'confuse'), on: 'shadow-[0_0_15px_rgba(168,85,247,0.6)] border-purple-400 bg-purple-600 text-white' },
  ];

  const perTurn: { key: 'energyUsed' | 'supporterUsed' | 'retreatUsed' | 'abilityUsed'; label: string; idle: string }[] = [
    { key: 'energyUsed', label: t(lang, 'energy'), idle: 'bg-amber-950 border-amber-800 text-amber-300' },
    { key: 'supporterUsed', label: t(lang, 'supporter'), idle: 'bg-sky-950 border-sky-800 text-sky-300' },
    { key: 'retreatUsed', label: t(lang, 'retreatUsed'), idle: 'bg-neutral-900 border-neutral-600 text-neutral-300' },
    { key: 'abilityUsed', label: t(lang, 'ability'), idle: 'bg-rose-950 border-rose-800 text-rose-300' },
  ];

  return (
    <section
      aria-label={label}
      className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col justify-between gap-1 p-2 m-1 bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 rounded-2xl relative transition-all duration-300 ${elementThemeMap[state.activeType]} ${statusRing} ${isRotated ? 'rotate-180' : ''}`}
    >
      {/* Type dock */}
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-[3px]" role="group" aria-label="Type">
          <button
            onClick={() => update(player, { activeType: 'None' })}
            aria-label="No type"
            className="w-[22px] h-[22px] rounded-full border border-neutral-700 bg-neutral-800 text-[9px] flex items-center justify-center text-neutral-400 font-bold hover:bg-neutral-700"
          >×</button>
          {types.map((el) => (
            <button
              key={el}
              onClick={() => update(player, { activeType: el })}
              aria-label={el}
              aria-pressed={state.activeType === el}
              className={`w-[22px] h-[22px] rounded-full border border-neutral-900 flex items-center justify-center text-[8px] font-black text-white/90 transition-all ${typeColors[el]} ${state.activeType === el ? 'scale-110 ring-2 ring-white' : 'opacity-50'}`}
            >{typeInitials[el]}</button>
          ))}
        </div>
        <span className="text-[10px] font-black text-neutral-500 pl-1">{label}</span>
      </div>

      {/* Damage + per-turn toggles */}
      <div className="flex items-stretch justify-between w-full gap-2">
        <div
          className={`bg-red-950 border-4 rounded-xl w-36 h-16 shrink-0 flex items-center justify-center relative transition-all duration-200 ${state.hp > 0 ? 'border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'border-red-800 shadow-inner'} ${isAnim ? 'scale-105' : 'scale-100'}`}
        >
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-widest text-red-300/60 whitespace-nowrap">{t(lang, 'damageCounters')}</span>
          <span aria-live="polite" aria-label={`${t(lang, 'damageCounters')}: ${state.hp}`} className="text-4xl font-black font-mono tracking-tighter text-red-500 mt-1.5" style={{ textShadow: '0 0 15px rgba(239,68,68,0.5)' }}>
            {state.hp}
          </span>
          <button
            onClick={() => undo(player)}
            disabled={historyLen === 0}
            aria-label={t(lang, 'undo')}
            title={t(lang, 'undo')}
            className={`absolute left-0.5 bottom-0.5 w-7 h-7 rounded-md text-sm font-bold flex items-center justify-center ${historyLen > 0 ? 'text-blue-300 bg-blue-950/70 active:scale-90' : 'text-neutral-700 opacity-40'}`}
          >↩</button>
          <button
            onClick={() => update(player, { hp: 0 })}
            aria-label={t(lang, 'reset')}
            title={t(lang, 'reset')}
            className="absolute right-0.5 bottom-0.5 w-7 h-7 rounded-md text-sm font-bold flex items-center justify-center text-neutral-400 bg-black/40 active:scale-90 hover:text-white"
          >⟲</button>
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

      {/* Damage keypad */}
      <div className="grid grid-cols-4 gap-2 w-full">
        <button onClick={() => adjustHp(-10)} className="h-10 rounded-xl font-black text-lg bg-neutral-800 text-neutral-300 active:scale-95 border border-neutral-700">-10</button>
        <button onClick={() => adjustHp(10)} className="h-10 rounded-xl font-black text-lg bg-emerald-950 text-emerald-400 border border-emerald-800 active:scale-95">+10</button>
        <button onClick={() => adjustHp(50)} className="h-10 rounded-xl font-black text-lg bg-emerald-950 text-emerald-400 border border-emerald-800 active:scale-95">+50</button>
        <button onClick={() => adjustHp(100)} className="h-10 rounded-xl font-black text-lg bg-emerald-950 text-emerald-400 border border-emerald-800 active:scale-95">+100</button>
      </div>

      {/* Special Conditions */}
      <div className="grid grid-cols-5 gap-1 w-full" role="group" aria-label="Special Conditions">
        {conditions.map((c) => (
          <button
            key={c.key}
            onClick={() => toggleCondition(player, c.key)}
            aria-pressed={state[c.key]}
            className={`${toggleBase} h-7 text-[9px] px-0.5 ${state[c.key] ? c.on : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
          >{c.label}</button>
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
  const [anim, setAnim] = useState<Record<PlayerId, boolean>>({ p1: false, p2: false });
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const endsAtRef = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cl = toContentLang(lang);
  const supportHref = supportUrl || localePath(cl, 'support/');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Restore saved match and first-visit onboarding (client only, after hydration).
  useEffect(() => {
    try {
      const saved = loadGame();
      if (saved) {
        setGame(saved);
        if (!isPristine(saved)) showToast(t(lang, 'restored'));
      }
      if (!localStorage.getItem('ptcg_companion_onboarded')) setShowOnboarding(true);
      setSoundOn(localStorage.getItem('ptcg_companion_sound') !== 'off');
    } catch {}
    setLoaded(true);
  }, [lang, showToast]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch {}
  }, [game, loaded]);

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

  const update = useCallback((player: PlayerId, updates: Partial<PlayerState>) => {
    fireFeedback();
    if (updates.hp !== undefined) pulse(player);
    setGame((g) => ({
      ...g,
      [player]: { ...g[player], ...updates },
      history: { ...g.history, [player]: [...g.history[player], g[player]].slice(-HISTORY_LIMIT) },
      winnerDismissed: updates.prizes ? false : g.winnerDismissed,
    }));
  }, [fireFeedback]);

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
      };
    });
    fireFeedback();
  }, [fireFeedback]);

  const undo = useCallback((player: PlayerId) => {
    setGame((g) => {
      const h = g.history[player];
      if (h.length === 0) return g;
      return { ...g, [player]: h[h.length - 1], history: { ...g.history, [player]: h.slice(0, -1) } };
    });
    fireFeedback();
  }, [fireFeedback]);

  const flipCoin = () => {
    if (isFlipping) return;
    fireFeedback();
    setIsFlipping(true);
    setCoinResult(null);
    setTimeout(() => {
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      setCoinResult(buf[0] < 128 ? 'HEADS' : 'TAILS');
      setIsFlipping(false);
      fireFeedback();
    }, 600);
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
    }));
  };

  // Pokémon Checkup: Poison adds 10, Burn adds 20, for both Active Pokémon.
  const checkup = () => {
    fireFeedback();
    const parts: string[] = [];
    const needsFlip = game.p1.asleep || game.p2.asleep || game.p1.burned || game.p2.burned;
    (['p1', 'p2'] as const).forEach((p) => {
      const dmg = (game[p].poisoned ? 10 : 0) + (game[p].burned ? 20 : 0);
      if (dmg > 0) parts.push(`${t(lang, p === 'p1' ? 'player1' : 'player2')} +${dmg}`);
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
        };
      });
      return next;
    });
    parts.forEach((part) => pulse(part.startsWith(t(lang, 'player1')) ? 'p1' : 'p2'));
    const msg = parts.length ? `${t(lang, 'checkupApplied')}: ${parts.join(' · ')}` : t(lang, 'checkupNothing');
    showToast(needsFlip ? `${msg} ${t(lang, 'checkupFlipReminder')}` : msg);
  };

  const startNewMatch = (ask = true) => {
    if (ask && !window.confirm(t(lang, 'newMatchConfirm'))) return;
    setRunning(false);
    setCoinResult(null);
    setGame((g) => newGame(g.duration));
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
  const winnerText = winner ? `${t(lang, winner === 'p1' ? 'player1' : 'player2')}${['ja', 'zh-TW', 'zh-CN'].includes(lang) ? '' : ' '}${t(lang, 'wins')}` : '';
  const timeUp = game.timeLeft === 0;

  // Optional counter ad (off by default, see site.config.ts).
  const adRef = useRef<HTMLModElement | null>(null);
  useEffect(() => {
    if (!ad || !adRef.current) return;
    try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({}); } catch {}
  }, [ad]);

  const consoleBtn = 'h-9 rounded-lg border text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-colors';

  return (
    <div className="bg-black flex-1 w-full flex flex-col min-h-0 overflow-hidden max-w-md mx-auto font-sans select-none relative">
      <PlayerArea state={game.p2} player="p2" historyLen={game.history.p2.length} isRotated isAnim={anim.p2} lang={lang} update={update} toggleCondition={toggleCondition} undo={undo} />

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
          <button
            onClick={flipCoin}
            aria-live="polite"
            className={`${consoleBtn} border-2 font-black ${isFlipping ? 'border-neutral-600 bg-neutral-800 animate-pulse text-neutral-400' : coinResult === 'HEADS' ? 'border-cyan-500 bg-cyan-950 text-cyan-300' : coinResult === 'TAILS' ? 'border-fuchsia-500 bg-fuchsia-950 text-fuchsia-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}
          >
            {isFlipping ? t(lang, 'flipping') : coinResult === 'HEADS' ? t(lang, 'heads') : coinResult === 'TAILS' ? t(lang, 'tails') : t(lang, 'flipCoin')}
          </button>
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

      <PlayerArea state={game.p1} player="p1" historyLen={game.history.p1.length} isRotated={false} isAnim={anim.p1} lang={lang} update={update} toggleCondition={toggleCondition} undo={undo} />

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
            <p className="text-neutral-400 text-sm mb-5">{t(lang, 'turn')} {game.turn}{game.timeLeft < game.duration ? ` · ${formatTime(game.duration - game.timeLeft)}` : ''}</p>
            <button onClick={() => startNewMatch(false)} className="w-full mb-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-white uppercase tracking-wider">{t(lang, 'newMatch')}</button>
            <button onClick={() => setGame((g) => ({ ...g, winnerDismissed: true }))} className="w-full mb-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold">{t(lang, 'close')}</button>
            <div className="border-t border-neutral-800 pt-4">
              <p className="text-sm text-neutral-300 mb-2">♥ {t(lang, 'supportCta')}</p>
              <a href={supportHref} target={supportUrl ? '_blank' : undefined} rel="noopener" className="inline-block px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold">{t(lang, 'supportBtn')}</a>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3" onClick={() => setShowMenu(false)} role="dialog" aria-modal="true" aria-label={t(lang, 'menu')}>
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-white max-h-[85dvh] overflow-y-auto select-auto" onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">{t(lang, 'menu')}</h2>
              <button onClick={() => setShowMenu(false)} aria-label={t(lang, 'close')} className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700">✕</button>
            </div>

            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t(lang, 'timer')}</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[25, 30, 50].map((m) => (
                <button key={m} onClick={() => setDuration(m)} aria-pressed={game.duration === m * 60} className={`py-2 rounded-lg border text-sm font-bold ${game.duration === m * 60 ? 'bg-amber-600 border-amber-400' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'}`}>
                  {m} <span className="text-[10px] font-normal">{t(lang, 'minutes')}</span>
                </button>
              ))}
              <button onClick={() => setDuration(game.duration / 60)} className="py-2 rounded-lg border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-xs font-bold">↺</button>
            </div>
            <p className="text-xs text-neutral-500 mb-5">{t(lang, 'timerHint')}</p>

            <div className="flex flex-col gap-2 mb-5">
              <button onClick={() => startNewMatch()} className="w-full py-3 rounded-xl bg-red-950 border border-red-800 text-red-200 font-bold hover:bg-red-900">{t(lang, 'newMatch')}</button>
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
