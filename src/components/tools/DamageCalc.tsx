import { useState } from 'react';
import { toolUi, type ToolUi } from '../../locales/toolsContent';
import { fmt } from './util';

interface Props { lang: 'en' | 'zh-TW' }

type Weak = 'none' | 'x2' | '+10' | '+20' | '+30';
type Res = 0 | 20 | 30;

const initial = { base: 120, bonus: 0, weak: 'none' as Weak, res: 0 as Res, reduce: 0, hp: 220, existing: 0 };

export default function DamageCalc({ lang }: Props) {
  const ui: ToolUi = toolUi[lang];
  const [v, setV] = useState(initial);
  const set = <K extends keyof typeof initial>(k: K, val: (typeof initial)[K]) => setV((x) => ({ ...x, [k]: val }));

  // Official order: base, attacker effects, Weakness, Resistance, defender effects.
  const n = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);
  const s1 = n(v.base);
  const s2 = s1 + n(v.bonus);
  const s3 = v.weak === 'x2' ? s2 * 2 : v.weak === 'none' ? s2 : s2 + Number(v.weak.slice(1));
  const s4 = s3 - v.res;
  const final = Math.max(0, s4 - n(v.reduce));
  const remaining = n(v.hp) - n(v.existing);
  const ko = final > 0 && final >= remaining;
  const left = Math.max(0, remaining - final);
  const more = final > 0 && !ko ? Math.ceil(left / final) : 0;

  const field = 'h-11 w-full px-3 rounded-xl bg-surface-2 border border-line text-fg tabular text-lg font-semibold focus:outline-none focus:border-accent';
  const num = (k: 'base' | 'bonus' | 'reduce' | 'hp' | 'existing', label: string) => (
    <label className="block">
      <span className="block text-sm font-medium text-muted mb-1.5">{label}</span>
      <input type="number" inputMode="numeric" min={0} step={10} value={v[k]} onChange={(e) => set(k, Number(e.target.value))} className={field} />
    </label>
  );
  const chips = <T extends string | number>(label: string, value: T, options: [T, string][], onPick: (t: T) => void) => (
    <fieldset>
      <legend className="block text-sm font-medium text-muted mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([o, text]) => (
          <button key={String(o)} type="button" aria-pressed={value === o} onClick={() => onPick(o)}
            className={`press h-11 px-4 rounded-xl border text-sm font-semibold ${value === o ? 'bg-accent text-accent-fg border-accent' : 'bg-surface-2 border-line text-fg'}`}>
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );

  const steps: [string, number][] = [
    [ui.stepBase, s1],
    [`${ui.stepAttacker} (+${n(v.bonus)})`, s2],
    [`${ui.stepWeak} (${v.weak === 'none' ? ui.none : v.weak === 'x2' ? '×2' : v.weak})`, s3],
    [`${ui.stepRes} (${v.res ? `−${v.res}` : ui.none})`, s4],
    [`${ui.stepDef} (−${n(v.reduce)})`, final],
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line">
      <div className="grid sm:grid-cols-2 gap-5">
        {num('base', ui.baseDamage)}
        {num('bonus', ui.attackerBonus)}
        {chips(ui.weakness, v.weak, [['none', ui.none], ['x2', '×2'], ['+10', '+10'], ['+20', '+20'], ['+30', '+30']], (o) => set('weak', o))}
        {chips(ui.resistance, v.res, [[0, ui.none], [30, '−30'], [20, '−20']], (o) => set('res', o))}
        {num('reduce', ui.defenderReduction)}
        {num('hp', ui.hp)}
        {num('existing', ui.existing)}
      </div>

      <div className={`mt-8 p-6 rounded-2xl border text-center ${ko ? 'bg-rose-500/12 border-rose-500/30' : 'bg-surface-2 border-line'}`} aria-live="polite">
        <p className="text-sm text-muted mb-1">{ui.result}</p>
        <p className="text-5xl font-bold tracking-tight text-fg tabular">{final}</p>
        <p className="text-sm text-muted mt-1">{fmt(ui.counters, { n: Math.floor(final / 10) })}</p>
        <p className={`mt-4 text-lg font-semibold ${ko ? 'text-rose-600 dark:text-rose-300' : 'text-fg'}`}>
          {ko ? ui.ko : fmt(ui.noKo, { n: left })}
        </p>
        {more > 0 && <p className="text-sm text-muted mt-1">{fmt(ui.hitsToKo, { n: more })}</p>}
      </div>

      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm font-semibold text-fg">{ui.steps}</summary>
        <ol className="mt-3 space-y-1.5 text-sm">
          {steps.map(([label, val], i) => (
            <li key={i} className="flex justify-between gap-4 px-3 py-2 rounded-xl bg-surface-2">
              <span className="text-muted">{i + 1}. {label}</span>
              <span className="text-fg font-semibold tabular">{val}</span>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-4 text-right">
        <button type="button" onClick={() => setV(initial)} className="text-sm text-accent font-medium">{ui.reset}</button>
      </div>
    </div>
  );
}
