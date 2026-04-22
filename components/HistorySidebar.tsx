'use client'
import { useState, useEffect } from 'react'
import { getStrings } from '@/lib/i18n'
import type { SavedAnalysis, AnalysisResult, PlacesContext, FactorKey } from '@/lib/types'
import { BarsChartDisplay, RadarChartDisplay, ScoreRingDisplay } from '@/components/Charts'
import { METRO_STATIONS } from '@/lib/metro-stations'

type Strings = ReturnType<typeof getStrings>
type SidebarTab = 'history' | 'analiz' | 'compare' | 'insights'
type ChartTab = 'bars' | 'radar' | 'ring'

interface Props {
  analyses: SavedAnalysis[]
  isOpen: boolean
  onClose: () => void
  strings: Strings
  currentResult?: AnalysisResult | null
  currentBusiness?: string
  currentContext?: PlacesContext | null
}

const ACC = '#3b82f6'
const BLUE = '#3b82f6'

const FACTOR_LABEL_KEYS: Record<FactorKey, keyof Strings> = {
  competition: 'FACTOR_COMPETITION',
  footTraffic: 'FACTOR_FOOT_TRAFFIC',
  areaType: 'FACTOR_AREA_TYPE',
  urbanTier: 'FACTOR_URBAN_TIER',
  accessibility: 'FACTOR_ACCESSIBILITY',
  nearbyServices: 'FACTOR_NEARBY_SERVICES',
  businessDensity: 'FACTOR_BUSINESS_DENSITY',
}

const FACTOR_KEYS: FactorKey[] = [
  'competition', 'footTraffic', 'areaType', 'urbanTier',
  'accessibility', 'nearbyServices', 'businessDensity',
]

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
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(203,213,225,0.88)' }}>{a.summary}</p>
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

// ─── Analiz Tab ───────────────────────────────────────────────────────────────

function AnalysisTab({ result, strings }: { result: AnalysisResult | null | undefined; strings: Strings }) {
  const [chartTab, setChartTab] = useState<ChartTab>('bars')

  if (!result?.factors?.length) {
    return (
      <div className="flex-1 flex items-center justify-center px-5 pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-center" style={{ color: 'rgba(100,116,139,0.45)' }}>
          Əvvəlcə yer təhlil edin
        </p>
      </div>
    )
  }

  const chartFactors = result.factors.map(f => ({
    label: strings[FACTOR_LABEL_KEYS[f.key]] as string,
    score: f.score,
    max: f.max,
  }))
  const chartTotal = chartFactors.reduce((s, f) => s + f.score, 0)
  const chartMax = chartFactors.reduce((s, f) => s + f.max, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[0.2em] font-medium" style={{ color: 'rgba(100,116,139,0.65)' }}>
          {strings.RESULT_FACTOR_BREAKDOWN}
        </p>
        <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['bars', 'radar', 'ring'] as ChartTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setChartTab(tab)}
              className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide transition-colors"
              style={{
                background: chartTab === tab ? BLUE : 'transparent',
                color: chartTab === tab ? '#fff' : 'rgba(100,116,139,0.6)',
              }}
            >
              {tab === 'bars' ? '≡' : tab === 'radar' ? '◈' : '○'}
            </button>
          ))}
        </div>
      </div>
      {chartTab === 'bars'  && <BarsChartDisplay  factors={chartFactors} accent={BLUE} />}
      {chartTab === 'radar' && <RadarChartDisplay factors={chartFactors} accent={BLUE} />}
      {chartTab === 'ring'  && <ScoreRingDisplay  factors={chartFactors} total={chartTotal} maxTotal={chartMax} accent={BLUE} />}
    </div>
  )
}

// ─── Compare Tab ──────────────────────────────────────────────────────────────

function CompareTab({ analyses, strings }: { analyses: SavedAnalysis[]; strings: Strings }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const compared = analyses.filter(a => selected.has(a.id))

  if (analyses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center pb-16 px-5">
        <p className="text-xs uppercase tracking-[0.2em] text-center" style={{ color: 'rgba(100,116,139,0.45)' }}>
          {strings.HISTORY_EMPTY}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {compared.length >= 2 && (
        <div className="mb-5">
          <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: ACC, opacity: 0.8 }}>
            {strings.DASHBOARD_COMPARE_TITLE}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `90px repeat(${compared.length}, 1fr)`,
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="px-2 py-2.5">
                <span className="text-[8px] uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.5)' }}>Faktor</span>
              </div>
              {compared.map(a => (
                <div key={a.id} className="px-2 py-2.5 text-center border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-semibold leading-tight" style={{ color: 'rgba(226,232,240,0.85)' }}>
                    {a.business.length > 10 ? a.business.slice(0, 9) + '…' : a.business}
                  </p>
                </div>
              ))}
            </div>

            {(() => {
              const maxScore = Math.max(...compared.map(a => a.score))
              return (
                <div className="grid" style={{ gridTemplateColumns: `90px repeat(${compared.length}, 1fr)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-2 py-2.5 flex items-center">
                    <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.65)' }}>Ümumi Bal</span>
                  </div>
                  {compared.map(a => (
                    <div key={a.id} className="px-2 py-2.5 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <span className="text-sm font-bold tabular-nums" style={{ color: a.score === maxScore ? ACC : scoreColor(a.score), fontFamily: 'monospace' }}>
                        {a.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}

            {FACTOR_KEYS.map((fk, rowIdx) => {
              const label = strings[FACTOR_LABEL_KEYS[fk]] as string
              const scores = compared.map(a => {
                const f = a.factors?.find(f => f.key === fk)
                return f ? { score: f.score, max: f.max, pct: Math.round((f.score / f.max) * 100) } : null
              })
              const maxPct = Math.max(...scores.map(s => s?.pct ?? 0))
              const isLast = rowIdx === FACTOR_KEYS.length - 1
              return (
                <div
                  key={fk}
                  className="grid"
                  style={{
                    gridTemplateColumns: `90px repeat(${compared.length}, 1fr)`,
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="px-2 py-2.5 flex items-center">
                    <span className="text-[9px] leading-snug" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
                  </div>
                  {scores.map((s, idx) => {
                    const isWinner = s !== null && s.pct === maxPct && maxPct > 0
                    return (
                      <div key={idx} className="px-2 py-2.5 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        {s ? (
                          <span className="text-[10px] font-semibold tabular-nums" style={{ color: isWinner ? ACC : 'rgba(100,116,139,0.7)', fontFamily: 'monospace' }}>
                            {s.score}/{s.max}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(100,116,139,0.3)', fontSize: '10px' }}>—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        {strings.DASHBOARD_COMPARE_HINT}
      </p>
      <ul className="space-y-2">
        {analyses.map(a => {
          const isOn = selected.has(a.id)
          return (
            <li key={a.id}>
              <button
                onClick={() => toggle(a.id)}
                className="w-full text-left rounded-xl px-3 py-3 flex items-center gap-3 transition-all duration-150"
                style={{
                  background: isOn ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isOn ? 'rgba(59,130,246,0.28)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div
                  className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                  style={{
                    background: isOn ? ACC : 'transparent',
                    border: `1.5px solid ${isOn ? ACC : 'rgba(100,116,139,0.4)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {isOn && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#07090D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5l2.5 2.5 4-4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'rgba(226,232,240,0.85)' }}>{a.business}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{a.date}</p>
                </div>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: scoreColor(a.score), fontFamily: 'monospace' }}>
                  {a.score}%
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

function InsightsTab({ strings }: { strings: Strings }) {
  const topStations = [...METRO_STATIONS]
    .sort((a, b) => b.dailyRidership - a.dailyRidership)
    .slice(0, 8)
  const maxRidership = topStations[0]?.dailyRidership ?? 1
  const totalRidership = METRO_STATIONS.reduce((sum, s) => sum + s.dailyRidership, 0)

  const urbanTiers = [
    { label: 'Bakı / Sumqayıt', sub: 'metro-city', pts: '10', color: ACC },
    { label: 'Şəhər', sub: 'city', pts: '7', color: '#60a5fa' },
    { label: 'Qəsəbə', sub: 'town', pts: '4', color: '#fbbf24' },
    { label: 'Kənd', sub: 'rural', pts: '1', color: '#f87171' },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="rounded-xl py-3.5 text-center" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p className="text-xl font-bold tabular-nums" style={{ color: ACC, fontFamily: 'monospace' }}>{Math.round(totalRidership / 1000)}K</p>
          <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>Gündəlik Sərniş</p>
        </div>
        <div className="rounded-xl py-3.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'rgba(241,245,249,0.9)', fontFamily: 'monospace' }}>{METRO_STATIONS.length}</p>
          <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>Stansiya</p>
        </div>
      </div>

      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        {strings.DASHBOARD_METRO_RIDERSHIP}
      </p>
      <div className="space-y-2.5 mb-6">
        {topStations.map((s, idx) => {
          const pct = Math.round((s.dailyRidership / maxRidership) * 100)
          return (
            <div key={s.nameAz} className="flex items-center gap-2.5">
              <span className="text-[9px] w-3 tabular-nums shrink-0 text-right" style={{ color: 'rgba(100,116,139,0.4)', fontFamily: 'monospace' }}>{idx + 1}</span>
              <span className="text-[11px] w-24 shrink-0 truncate" style={{ color: 'rgba(203,213,225,0.88)' }}>{s.nameAz}</span>
              <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3b82f6', opacity: 0.5 + (pct / 100) * 0.5 }} />
              </div>
              <span className="text-[9px] shrink-0 tabular-nums" style={{ color: 'rgba(100,116,139,0.7)', fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>
                {Math.round(s.dailyRidership / 1000)}K
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        Şəhər Tipi (Bal)
      </p>
      <div className="space-y-1.5">
        {urbanTiers.map(t => (
          <div key={t.sub} className="flex items-center justify-between rounded-xl px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(226,232,240,0.85)' }}>{t.label}</p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'rgba(100,116,139,0.5)' }}>{t.sub}</p>
            </div>
            <span className="text-sm font-bold" style={{ color: t.color, fontFamily: 'monospace' }}>{t.pts} bal</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HistorySidebar({
  analyses,
  isOpen,
  onClose,
  strings,
  currentResult,
}: Props) {
  const [selected, setSelected] = useState<SavedAnalysis | null>(null)
  const [tab, setTab] = useState<SidebarTab>('history')

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab('history')
    }
  }, [isOpen])

  const TABS: { key: SidebarTab; label: string }[] = [
    { key: 'history',  label: 'Tarixçə' },
    { key: 'analiz',   label: 'Analiz' },
    { key: 'compare',  label: 'Müqayisə' },
    { key: 'insights', label: 'Bazar' },
  ]

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 z-[1300] flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: '#080C11', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      {selected ? (
        <DetailView a={selected} onBack={() => setSelected(null)} strings={strings} />
      ) : (
        <>
          {/* Header */}
          <div
            className="py-4 px-5 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
              <h2 className="font-bold text-sm tracking-tight" style={{ color: 'rgba(241,245,249,0.9)' }}>
                myblocate
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

          {/* Tab bar */}
          <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 py-3 text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors"
                style={{
                  color: tab === t.key ? BLUE : 'rgba(100,116,139,0.5)',
                  borderBottom: tab === t.key ? `2px solid ${BLUE}` : '2px solid transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'history' && (
            <div className="flex-1 overflow-y-auto p-4">
              {analyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full pb-16 gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
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
                  {analyses.map(a => (
                    <li
                      key={a.id}
                      className="rounded-xl p-4 cursor-pointer transition-all duration-150"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onClick={() => setSelected(a)}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-sm tracking-tight truncate" style={{ color: 'rgba(241,245,249,0.9)' }}>
                          {a.business}
                        </span>
                        <ScoreBadge score={a.score} />
                      </div>
                      <p className="text-[11px] mb-2" style={{ color: 'rgba(100,116,139,0.55)' }}>{a.date}</p>
                      <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${a.score}%`, background: scoreColor(a.score), opacity: 0.7 }} />
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
          )}

          {tab === 'analiz' && (
            <AnalysisTab result={currentResult} strings={strings} />
          )}

          {tab === 'compare' && (
            <CompareTab analyses={analyses} strings={strings} />
          )}

          {tab === 'insights' && (
            <InsightsTab strings={strings} />
          )}
        </>
      )}
    </div>
  )
}
