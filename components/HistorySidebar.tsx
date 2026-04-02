'use client'
import { useState } from 'react'
import { AZ } from '@/lib/az'
import type { SavedAnalysis } from '@/lib/types'

interface Props {
  analyses: SavedAnalysis[]
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`text-sm font-bold tabular-nums ${scoreColor(score)}`}>
      {score}%
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-slate-500 text-xs uppercase tracking-widest mb-2 font-medium">{children}</p>
  )
}

function DetailView({ a, onBack }: { a: SavedAnalysis; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2 shrink-0">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← {AZ.HISTORY_DETAIL_BACK}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-white text-base tracking-tight">{a.business}</h3>
          <ScoreBadge score={a.score} />
        </div>
        <p className="text-xs text-slate-500">{a.date} · {a.lat.toFixed(4)}, {a.lng.toFixed(4)}</p>

        {a.summary && (
          <p className="text-sm text-slate-300 leading-relaxed">{a.summary}</p>
        )}

        {(a.detail || a.verdict) && (
          <div>
            <Label>Analiz</Label>
            <p className="text-sm text-slate-400 leading-relaxed">
              {[a.detail, a.verdict].filter(Boolean).join(' ')}
            </p>
          </div>
        )}

        {a.pros.length > 0 && (
          <div>
            <Label>{AZ.RESULT_PROS}</Label>
            <ul className="space-y-2">
              {a.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 shrink-0 font-bold mt-px">+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.cons.length > 0 && (
          <div>
            <Label>{AZ.RESULT_CONS}</Label>
            <ul className="space-y-2">
              {a.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-red-400 shrink-0 font-bold mt-px">—</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.context && (
          <div>
            <Label>{AZ.RESULT_OSM_TITLE}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-white text-xl font-bold tabular-nums">{a.context.competitors}</p>
                <p className="text-slate-500 text-xs uppercase tracking-wide mt-1">{AZ.RESULT_OSM_COMPETITORS}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-white text-xl font-bold tabular-nums">{a.context.totalBusinesses}</p>
                <p className="text-slate-500 text-xs uppercase tracking-wide mt-1">Müəssisə</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HistorySidebar({ analyses }: Props) {
  const [selected, setSelected] = useState<SavedAnalysis | null>(null)

  if (selected) {
    return (
      <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
        <DetailView a={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-800">
        <h2 className="text-white font-bold text-base tracking-tight">{AZ.HISTORY_TITLE}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {analyses.length === 0 ? (
          <p className="text-sm text-slate-600 text-center mt-12 uppercase tracking-widest">{AZ.HISTORY_EMPTY}</p>
        ) : (
          <ul className="space-y-3">
            {analyses.map((a) => (
              <li
                key={a.id}
                className="bg-slate-900 rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-slate-600 hover:bg-slate-800/60 transition-colors"
                onClick={() => setSelected(a)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-white text-sm tracking-tight truncate">{a.business}</span>
                  <ScoreBadge score={a.score} />
                </div>
                <p className="text-xs text-slate-500 mb-2">{a.date}</p>
                {a.summary && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{a.summary}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
