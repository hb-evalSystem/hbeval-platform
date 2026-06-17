'use client'
// components/ui/BatteryReport.tsx
// Renders a comprehensive HB-Eval battery report: five aggregate metrics, the
// reliability gap, the per-scenario detail table, and the verification badge.
import {
  Shield, CheckCircle, XCircle, TrendingDown, Activity,
  Zap, Brain, BarChart2, AlertTriangle, Info, Download,
} from 'lucide-react'

interface AggregateMetrics {
  pei: number | null; frr: number | null; irs: number | null
  ti: number | null; csi: number | null
}
interface ReliabilityGap { c_nom: number | null; r_op: number | null; gap: number | null }
interface CsiInfo {
  value: number | null; status: 'final' | 'provisional'
  runs_used: number; runs_required_for_final: number; note: string
}
interface ScenarioRow {
  scenario_index: number; domain: string; fault_type: string; is_nominal: boolean
  metrics: { frr: number | null; pei: number | null; irs: number | null; ti: number | null }
  constraint_violation?: boolean
}
export interface BatteryReportData {
  verdict: string; tier: number | null
  aggregate_metrics: AggregateMetrics
  reliability_gap: ReliabilityGap
  csi_info?: CsiInfo
  summary: string
  scenario_count: number
  scenarios: ScenarioRow[]
  verification?: 'verified' | 'unverified'
}

const METRICS: { key: keyof AggregateMetrics; label: string; full: string; icon: any; decimals: number }[] = [
  { key: 'pei', label: 'PEI', full: 'Planning Efficiency', icon: BarChart2, decimals: 3 },
  { key: 'frr', label: 'FRR', full: 'Failure Resilience', icon: Shield, decimals: 3 },
  { key: 'irs', label: 'IRS', full: 'Intentional Recovery', icon: Zap, decimals: 3 },
  { key: 'ti',  label: 'TI',  full: 'Traceability', icon: Brain, decimals: 1 },
  { key: 'csi', label: 'CSI', full: 'Consistency Stability', icon: Activity, decimals: 3 },
]

function fmt(v: number | null | undefined, d: number): string {
  return v === null || v === undefined ? '—' : v.toFixed(d)
}

export default function BatteryReport({ report }: { report: BatteryReportData }) {
  const safe = report.verdict === 'SAFE'
  const verified = report.verification === 'verified'
  const gap = report.reliability_gap?.gap

  // Download the full report as a JSON file. For the verified (path A) flow the
  // platform ran everything server-side, so this button is how the user obtains
  // their data file — the local (path B) flow already produces a file via the SDK.
  function downloadReport() {
    try {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `hbeval-report-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { /* no-op: download is best-effort */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {safe
          ? <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>
              <CheckCircle size={14}/> SAFE{report.tier ? ` · Meets Tier ${report.tier}` : ''}
            </span>
          : <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
              <XCircle size={14}/> UNSAFE
            </span>}

        {verified
          ? <span title="The platform ran the agent end-to-end — tamper-proof."
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>
              <Shield size={12}/> Verified
            </span>
          : <span title="Locally-run battery. Scored server-side, but not executed by the platform."
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(148,163,184,0.12)', color: '#cbd5e1' }}>
              <Info size={12}/> Unverified
            </span>}

        <span className="text-xs text-slate-500">
          {report.scenario_count} fault-injected scenarios
        </span>

        {/* Download the full JSON report — primary way to get data on path A */}
        <button onClick={downloadReport}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>
          <Download size={12}/> Download JSON
        </button>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {METRICS.map(m => {
          const Icon = m.icon
          const val = report.aggregate_metrics?.[m.key]
          return (
            <div key={m.key} className="rounded-xl p-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Icon size={12}/> {m.label}
              </div>
              <div className="font-mono text-lg text-slate-100">{fmt(val, m.decimals)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{m.full}</div>
            </div>
          )
        })}
      </div>

      {report.csi_info && report.csi_info.status === 'provisional' && (
        <div className="flex items-start gap-2 rounded-lg p-3 text-xs"
             style={{ background: 'rgba(234,179,8,0.08)', color: '#fde68a' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
          <span>{report.csi_info.note} CSI becomes a final value once
            {' '}{report.csi_info.runs_required_for_final} runs accumulate
            (currently {report.csi_info.runs_used}).</span>
        </div>
      )}

      <div className="rounded-xl p-4"
           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1.5 text-slate-300 text-sm mb-3">
          <TrendingDown size={14}/> Reliability Gap
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[11px] text-slate-500">Nominal (C_nom)</div>
            <div className="font-mono text-base text-slate-100">{fmt(report.reliability_gap?.c_nom, 3)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Under fault (R_op)</div>
            <div className="font-mono text-base text-slate-100">{fmt(report.reliability_gap?.r_op, 3)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Gap</div>
            <div className="font-mono text-base"
                 style={{ color: gap !== null && gap !== undefined && gap > 0.15 ? '#fca5a5' : '#cbd5e1' }}>
              {fmt(gap, 3)}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          The gap is the drop in failure-resilience between fault-free and under-fault
          conditions. A large positive gap means the agent degrades under stress.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-4 py-2.5 text-xs text-slate-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
          Per-scenario detail
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-slate-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 font-medium">Fault</th>
                <th className="px-3 py-2 font-medium">PEI</th>
                <th className="px-3 py-2 font-medium">FRR</th>
                <th className="px-3 py-2 font-medium">IRS</th>
                <th className="px-3 py-2 font-medium">TI</th>
              </tr>
            </thead>
            <tbody>
              {report.scenarios?.map(s => (
                <tr key={s.scenario_index} className="text-xs"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-3 py-2 text-slate-500">{s.scenario_index}</td>
                  <td className="px-3 py-2 text-slate-300">{s.domain}</td>
                  <td className="px-3 py-2">
                    {s.is_nominal
                      ? <span className="text-slate-500">nominal</span>
                      : <span className="text-amber-300/80">{s.fault_type}</span>}
                    {s.constraint_violation && (
                      <span className="ml-1.5 text-red-400" title="Constraint violation">⚠</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">{fmt(s.metrics.pei, 2)}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{fmt(s.metrics.frr, 2)}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">
                    {s.metrics.irs === null ? '—' : fmt(s.metrics.irs, 2)}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">{fmt(s.metrics.ti, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
