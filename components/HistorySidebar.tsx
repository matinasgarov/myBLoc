'use client'
import { useState } from 'react'
import { getStrings } from '@/lib/i18n'
import type { SavedAnalysis } from '@/lib/types'

type Strings = ReturnType<typeof getStrings>

interface Props {
  analyses: SavedAnalysis[]
  isOpen: boolean
  onClose: () => void
  strings: Strings
}

function scoreColor(score: number) {
  if (score >= 70) return '#34d399'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score)
  const R = 10
  const circ = 2 * Math.PI * R
  const filled = (score / 100) * circ

  return (
    <div className="relative shrink-0" style={{ width: 30, height: 30 }}>
      <svg width="30" height="30" viewBox="0 0 30 30" className="absolute inset-0">
        <circle cx={15} cy={15} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <circle
          cx={15} cy={15} r={R}
          fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          transform="rotate(-90 15 15)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold tabular-nums leading-none" style={{ color, fontFamily: 'monospace' }}>
          {score}
        </span>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] mb-2 font-medium" style={{ color: 'rgba(100,116,139,0.7)' }}>
      {children}
    </p>
  )
}

function DetailView({ a, onBack, strings }: { a: SavedAnalysis; onBack: () => void; strings: Strings }) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="px-5 py-4 flex items-center gap-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'rgba(100,116,139,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.7)')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          {strings.HISTORY_DETAIL_BACK}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-base tracking-tight" style={{ color: 'rgba(241,245,249,0.95)' }}>
            {a.business}
          </h3>
          <ScoreBadge score={a.score} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
          {a.date} · {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
        </p>

        {a.summary && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(203,213,225,0.75)' }}>{a.summary}</p>
        )}

        {(a.detail || a.verdict) && (
          <div>
            <Label>{strings.RESULT_ANALYSIS}</Label>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {[a.detail, a.verdict].filter(Boolean).join(' ')}
            </p>
          </div>
        )}

        {a.pros.length > 0 && (
          <div>
            <Label>{strings.RESULT_PROS}</Label>
            <ul className="space-y-2">
              {a.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(203,213,225,0.8)' }}>
                  <span className="shrink-0 font-bold mt-px" style={{ color: '#34d399' }}>+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.cons.length > 0 && (
          <div>
            <Label>{strings.RESULT_CONS}</Label>
            <ul className="space-y-2">
              {a.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(203,213,225,0.8)' }}>
                  <span className="shrink-0 font-bold mt-px" style={{ color: '#f87171' }}>—</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.context && (
          <div>
            <Label>{strings.RESULT_OSM_TITLE}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: a.context.competitors,     lbl: strings.RESULT_OSM_COMPETITORS },
                { val: a.context.totalBusinesses, lbl: strings.RESULT_OSM_BUSINESSES },
              ].map(({ val, lbl }) => (
                <div
                  key={lbl}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'rgba(241,245,249,0.9)' }}>{val}</p>
                  <p className="text-[10px] uppercase tracking-wide mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HistorySidebar({ analyses, isOpen, onClose, strings }: Props) {
  const [selected, setSelected] = useState<SavedAnalysis | null>(null)

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 z-[1300] flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{
        background: '#080C11',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {selected ? (
        <DetailView a={selected} onBack={() => setSelected(null)} strings={strings} />
      ) : (
        <>
          {/* Header */}
          <div
            className="py-5 px-5 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C98A' }} />
              <h2 className="font-bold text-sm tracking-tight" style={{ color: 'rgba(241,245,249,0.9)' }}>
                {strings.HISTORY_TITLE}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ color: 'rgba(100,116,139,0.6)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.6)')}
              aria-label="Close"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4">
            {analyses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-16 gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,0.5)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2a9 9 0 1 0 0 18A9 9 0 0 0 12 2z"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(100,116,139,0.45)' }}>
                  {strings.HISTORY_EMPTY}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {analyses.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl p-4 cursor-pointer transition-all duration-150"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    onClick={() => setSelected(a)}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.background = 'rgba(255,255,255,0.05)'
                      el.style.borderColor = 'rgba(255,255,255,0.1)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.background = 'rgba(255,255,255,0.03)'
                      el.style.borderColor = 'rgba(255,255,255,0.06)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-sm tracking-tight truncate" style={{ color: 'rgba(241,245,249,0.9)' }}>
                        {a.business}
                      </span>
                      <ScoreBadge score={a.score} />
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: 'rgba(100,116,139,0.55)' }}>{a.date}</p>

                    {/* Mini score bar */}
                    <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${a.score}%`,
                          background: scoreColor(a.score),
                          opacity: 0.7,
                        }}
                      />
                    </div>

                    {a.summary && (
                      <p className="text-xs leading-relaxed mt-2 line-clamp-2" style={{ color: 'rgba(148,163,184,0.55)' }}>
                        {a.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
