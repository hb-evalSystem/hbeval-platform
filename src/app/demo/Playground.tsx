'use client'
// src/app/demo/Playground.tsx
//
// The controls that turn the demo into a small laboratory.
//
// WHAT A VISITOR CAN CHANGE, AND WHAT THEY CANNOT
// They can change the conditions — how many faults the agent meets, how many
// times it blindly retries — and they can change the policy: which metric
// guards the run, how far it may fall, for how long, and where each floor sits.
//
// They cannot change the agent. It retries blindly, then re-plans once, every
// time. That constraint is deliberate: a playground where you can also script
// the recovery lets somebody build an agent that always behaves well, which
// teaches nothing about measurement and everything about writing a flattering
// script.
//
// THE LESSON THE CONTROLS MUST NOT DESTROY
// Lowering a floor makes the run "pass". It does not make the agent better —
// the metrics come out identical, only the breach count falls. That is the
// single most misunderstood thing about reliability thresholds, and it is
// visible here in one click, so the page names it rather than letting somebody
// discover a green result and draw the wrong conclusion.
import { SlidersHorizontal, RotateCcw, AlertTriangle } from 'lucide-react'

export interface Settings {
  faults: number
  retries: number
  metric: 'pei' | 'frr' | 'irs' | 'ti'
  below: number
  forSteps: number
  floors: { pei: number; frr: number; irs: number; ti: number }
}

export const DEFAULT_SETTINGS: Settings = {
  faults: 3,
  retries: 2,
  metric: 'frr',
  below: 0.5,
  forSteps: 3,
  floors: { pei: 0.7, frr: 0.65, irs: 0.6, ti: 3.0 },
}

const METRIC_LABEL: Record<string, string> = {
  pei: 'PEI · Planning', frr: 'FRR · Resilience',
  irs: 'IRS · Recovery', ti: 'TI · Traceability',
}

function Slider({ label, hint, value, min, max, step, onChange, format }: {
  label: string; hint?: string; value: number; min: number; max: number
  step: number; onChange: (v: number) => void; format?: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[11px] text-slate-300">{label}</label>
        <span className="text-[11px] font-mono text-slate-200">
          {format ? format(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={e => onChange(Number(e.target.value))}
             className="w-full" />
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  )
}

export default function Playground({
  settings, onChange, onRun, busy, loweredFloors,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onRun: () => void
  busy: boolean
  loweredFloors: string[]
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })

  const setFloor = (key: keyof Settings['floors'], value: number) =>
    onChange({ ...settings, floors: { ...settings.floors, [key]: value } })

  const isDefault =
    JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-purple-400" />
          Playground
        </p>
        {!isDefault && (
          <button onClick={() => onChange(DEFAULT_SETTINGS)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Conditions */}
        <div className="space-y-4">
          <p className="text-[10px] tracking-wider text-slate-500 uppercase">
            Conditions the agent meets
          </p>
          <Slider label="Faults" value={settings.faults} min={0} max={8} step={1}
                  hint="How many times a dependency fails."
                  onChange={v => set('faults', v)} />
          <Slider label="Blind retries per fault" value={settings.retries}
                  min={0} max={5} step={1}
                  hint="Identical retries with no reasoning between them."
                  onChange={v => set('retries', v)} />
        </div>

        {/* Policy */}
        <div className="space-y-4">
          <p className="text-[10px] tracking-wider text-slate-500 uppercase">
            The halt policy
          </p>
          <div>
            <label className="text-[11px] text-slate-300 block mb-1">
              Metric to watch
            </label>
            <select value={settings.metric}
                    onChange={e => set('metric', e.target.value as Settings['metric'])}
                    className="w-full text-xs rounded-lg px-2.5 py-1.5"
                    style={{ background: 'rgba(0,0,0,0.25)',
                             border: '1px solid rgba(255,255,255,0.12)',
                             color: '#e2e8f0' }}>
              {Object.entries(METRIC_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Slider label="Halt below" value={settings.below} min={0.05} max={0.95}
                  step={0.05} format={v => v.toFixed(2)}
                  hint="How far it may fall before the policy acts."
                  onChange={v => set('below', v)} />
          <Slider label="Sustained for" value={settings.forSteps} min={1} max={10}
                  step={1} format={v => `${v} steps`}
                  hint="One bad step is noise. A guard firing on noise gets switched off."
                  onChange={v => set('forSteps', v)} />
        </div>

        {/* Floors */}
        <div className="sm:col-span-2 space-y-4 pt-2"
             style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] tracking-wider text-slate-500 uppercase">
            Thresholds — what counts as a breach
          </p>
          <div className="grid sm:grid-cols-4 gap-4">
            <Slider label="PEI floor" value={settings.floors.pei} min={0} max={1}
                    step={0.05} format={v => v.toFixed(2)}
                    onChange={v => setFloor('pei', v)} />
            <Slider label="FRR floor" value={settings.floors.frr} min={0} max={1}
                    step={0.05} format={v => v.toFixed(2)}
                    onChange={v => setFloor('frr', v)} />
            <Slider label="IRS floor" value={settings.floors.irs} min={0} max={1}
                    step={0.05} format={v => v.toFixed(2)}
                    onChange={v => setFloor('irs', v)} />
            <Slider label="TI floor" value={settings.floors.ti} min={0} max={5}
                    step={0.25} format={v => v.toFixed(2)}
                    onChange={v => setFloor('ti', v)} />
          </div>
        </div>
      </div>

      {/* The correction, delivered the moment it becomes relevant. */}
      {loweredFloors.length > 0 && (
        <div className="rounded-lg p-3 mt-4"
             style={{ background: 'rgba(251,191,36,0.10)',
                      border: '1px solid rgba(251,191,36,0.3)' }}>
          <p className="text-xs text-amber-200 flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} />
            You lowered {loweredFloors.map(f => f.toUpperCase()).join(', ')} below
            the default
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Compare the metrics before and after: they are identical. The agent
            behaves exactly as badly as it did — only the breach count fell,
            because the threshold stopped noticing. Lowering a floor makes a run
            pass; it does not make an agent reliable, and a team that tunes
            floors until CI turns green has bought silence rather than safety.
          </p>
        </div>
      )}

      <button onClick={onRun} disabled={busy}
              className="btn-primary text-xs px-4 py-2 mt-4 disabled:opacity-60">
        {busy ? 'Running…' : 'Run with these settings'}
      </button>
    </div>
  )
}
