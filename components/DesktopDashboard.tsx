'use client'
import { useState, useEffect } from 'react'
import type { AnalysisResult, PlacesContext, SavedAnalysis, FactorKey } from '@/lib/types'
import type { Strings, Lang } from '@/lib/i18n'
import PdfDownloadButton from './PdfDownloadButton'
import { METRO_STATIONS } from '@/lib/metro-stations'
import { DualChartDisplay, BarsChartDisplay, ScoreRingDisplay } from '@/components/Charts'
import { GlowingStatCard, GlowingButton } from '@/components/ui/glowing-card'

type PanelView = 'idle' | 'result' | 'compare' | 'insights'
type ChartTab = 'dual' | 'bars' | 'ring'
type AgentStatus = 'idle' | 'loading' | 'done' | 'error'

const LAYER_DEFS = [
  { key: 'bus',         emoji: '🚌', labelEn: 'Bus Stops',   labelAz: 'Avtobus',   color: '#f59e0b' },
  { key: 'metro',       emoji: '🚇', labelEn: 'Metro',       labelAz: 'Metro',     color: '#a855f7' },
  { key: 'transport',   emoji: '🚉', labelEn: 'Transport',   labelAz: 'Nəqliyyat', color: '#10b981' },
  { key: 'competitors', emoji: '🏪', labelEn: 'Competitors', labelAz: 'Rəqiblər',  color: '#ef4444' },
] as const

const AGENT_TOOLBAR_DEFS = [
  { key: 'market-analyst',         emoji: '📊', labelEn: 'Market Analyst',         labelAz: 'Bazar Analitiki',              descEn: 'Evaluates competitive landscape and market saturation.',         descAz: 'Rəqabət mühiti və bazar doyumunu qiymətləndirir.',               color: '#f59e0b' },
  { key: 'risk-advisor',           emoji: '⚠️', labelEn: 'Risk Advisor',            labelAz: 'Risk Məsləhətçisi',            descEn: 'Identifies land use, rent, and area suitability risks.',          descAz: 'Torpaq istifadəsi, kirayə və ərazi uyğunluğu risklərini müəyyən edir.', color: '#ef4444' },
  { key: 'location-strategist',    emoji: '🗺️', labelEn: 'Location Strategist',    labelAz: 'Məkan Strateqi',               descEn: 'Analyzes metro access, roads, and population catchment.',          descAz: 'Metro əlçatanlığı, yollar və əhali həcmini təhlil edir.',         color: '#3b82f6' },
  { key: 'customer-flow',          emoji: '🚶', labelEn: 'Customer Flow',           labelAz: 'Müştəri Axını',                descEn: 'Assesses transport, parking, and foot traffic generators.',        descAz: 'Nəqliyyat, parkinq və piyada trafik generatorlarını qiymətləndirir.', color: '#10b981' },
  { key: 'urban-forecaster',       emoji: '🏙️', labelEn: 'Urban Forecaster',       labelAz: 'Şəhər İnkişafı',               descEn: 'Projects urban growth trends and zoning trajectory.',             descAz: 'Şəhər inkişafı tendensiyaları və zonalanma yolunu proqnozlaşdırır.', color: '#8b5cf6' },
  { key: 'infrastructure-auditor', emoji: '🔧', labelEn: 'Infrastructure Auditor', labelAz: 'İnfrastruktur Auditor',        descEn: 'Audits utility coverage and infrastructure quality.',              descAz: 'Kommunal əhatə və infrastruktur keyfiyyətini yoxlayır.',          color: '#06b6d4' },
] as const

const ACC = '#ffffff'
const BLUE = '#3b82f6'

interface Props {
  analyses: SavedAnalysis[]
  currentResult: AnalysisResult | null
  currentBusiness: string
  currentContext: PlacesContext | null
  currentLat: number | null
  currentLng: number | null
  onReset: () => void
  onOpenHistory: () => void
  strings: Strings
  lang: Lang
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return '#34d399'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

function verdictFor(score: number, strings: Strings): { label: string; color: string; bg: string; border: string } {
  if (score >= 70) return {
    label: strings.VERDICT_RECOMMENDED,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.45)',
  }
  if (score >= 40) return {
    label: strings.VERDICT_FAIR,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.45)',
  }
  return {
    label: strings.VERDICT_RISKY,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.45)',
  }
}

function VerdictBadge({ score, strings }: { score: number; strings: Strings }) {
  const v = verdictFor(score, strings)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: v.color,
        boxShadow: `0 0 6px ${v.color}cc`,
      }} />
      {v.label}
    </span>
  )
}

function ProIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7" cy="7" r="6" stroke={`${color}55`} fill={`${color}18`} />
      <path d="M4 7l2.2 2.2L10 5.4" />
    </svg>
  )
}

function ConIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7" cy="7" r="6" stroke={`${color}55`} fill={`${color}18`} />
      <path d="M7 4v3.5" />
      <circle cx="7" cy="10" r="0.4" fill={color} stroke="none" />
    </svg>
  )
}

function ScoreRingMini({ score }: { score: number }) {
  const R = 28
  const circ = 2 * Math.PI * R
  const color = scoreColor(score)
  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
        <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={R}
          fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.25,0,0,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums" style={{ color, fontFamily: 'monospace' }}>
          {score}
        </span>
      </div>
    </div>
  )
}


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

// ─── Idle View ────────────────────────────────────────────────────────────────

function IdleView({ analyses, onOpenHistory, onCompare, onInsights, strings }: {
  analyses: SavedAnalysis[]
  onOpenHistory: () => void
  onCompare: () => void
  onInsights: () => void
  strings: Strings
}) {
  const actions = [
    {
      icon: (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: strings.HISTORY_TITLE,
      sub: analyses.length > 0
        ? `${analyses.length} ${strings.DASHBOARD_ANALYSES_COUNT}`
        : strings.HISTORY_EMPTY,
      onClick: onOpenHistory,
      accent: false,
    },
    {
      icon: (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="8" height="18" rx="2"/>
          <rect x="13" y="3" width="8" height="18" rx="2"/>
        </svg>
      ),
      label: strings.DASHBOARD_COMPARE,
      sub: strings.DASHBOARD_COMPARE_HINT,
      onClick: onCompare,
      accent: false,
    },
    {
      icon: (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
          <line x1="2" y1="20" x2="22" y2="20"/>
        </svg>
      ),
      label: strings.DASHBOARD_INSIGHTS,
      sub: strings.DASHBOARD_INSIGHTS_HINT,
      onClick: onInsights,
      accent: true,
    },
  ]

  return (
    <div className="flex flex-col h-full px-5 py-6">
      {/* Welcome block */}
      <div className="mb-6">
        <span
          className="text-[15px] uppercase tracking-[0.22em] font-bold"
          style={{ color: ACC }}
        >
          myblocate
        </span>
        <h2
          className="text-base font-bold tracking-tight mt-1"
          style={{ color: 'rgba(241,245,249,0.9)' }}
        >
          {strings.DASHBOARD_IDLE_TITLE}
        </h2>
        <p
          className="text-[13px] mt-1 leading-relaxed"
          style={{ color: 'rgba(100,116,139,0.6)' }}
        >
          {strings.DASHBOARD_IDLE_HINT}
        </p>
      </div>

      {/* Map pin illustration */}
      <div
        className="rounded-xl mb-6 flex items-center justify-center relative overflow-hidden"
        style={{
          height: '100px',
          background: 'rgba(37,99,235,0.04)',
          border: '1px solid rgba(37,99,235,0.12)',
        }}
      >
        {/* Pulsing glow behind pin */}
        <div style={{
          position: 'absolute', width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(59,130,246,0.25)', filter: 'blur(16px)',
          animationName: 'glow-breathe', animationDuration: '2.5s',
          animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
        }} />
        <svg className="relative z-10" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {actions.map((a) => (
          <GlowingButton key={a.label} onClick={a.onClick} fullWidth>
            <span style={{ color: a.accent ? '#60a5fa' : 'rgba(100,116,139,0.65)', flexShrink: 0 }}>
              {a.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(226,232,240,0.9)', margin: 0, letterSpacing: '-0.01em' }}>
                {a.label}
              </p>
              <p style={{ fontSize: 12, marginTop: 2, color: 'rgba(100,116,139,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.sub}
              </p>
            </div>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </GlowingButton>
        ))}
      </div>
    </div>
  )
}

// ─── Result View ──────────────────────────────────────────────────────────────

interface AgentResult {
  role: string
  emoji: string
  opinion: string
  confidence?: number
}

function LayerButtonsSection({ lang }: { lang: Lang }) {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set())
  const toggle = (key: string) => setActiveLayers(prev => {
    const n = new Set(prev)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })
  return (
    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(100,116,139,0.45)', marginBottom: 6, fontWeight: 600 }}>
        {lang === 'az' ? 'Xəritə Layları' : 'Map Layers'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {LAYER_DEFS.map(layer => {
          const isActive = activeLayers.has(layer.key)
          const label = lang === 'az' ? layer.labelAz : layer.labelEn
          return (
            <button key={layer.key} onClick={() => toggle(layer.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 8px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
              background: isActive ? `${layer.color}18` : 'rgba(255,255,255,0.025)',
              border: `1px solid ${isActive ? layer.color + '45' : 'rgba(255,255,255,0.055)'}`,
              color: isActive ? layer.color : 'rgba(148,163,184,0.55)',
              fontSize: 10.5, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 11 }}>{layer.emoji}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: layer.color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AgentPanelProps {
  business: string
  result: AnalysisResult
  context: PlacesContext | null
  lat: number | null
  lng: number | null
  lang: Lang
  strings: Strings
}

function AgentButtonsSection({ business, result, context, lat, lng, lang, strings }: AgentPanelProps) {
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})
  const [agentResults, setAgentResults] = useState<Record<string, AgentResult>>({})

  const handleAgentClick = async (agentKey: string) => {
    const current = agentStatus[agentKey] ?? 'idle'
    if (current === 'loading') return
    if (current === 'done') {
      setAgentStatus(prev => ({ ...prev, [agentKey]: 'idle' }))
      setAgentResults(prev => { const n = { ...prev }; delete n[agentKey]; return n })
      return
    }
    setAgentStatus(prev => ({ ...prev, [agentKey]: 'loading' }))
    try {
      const res = await fetch('/api/expert-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lng, businessType: business, score: result.score,
          placesContext: context, luxuryMismatch: result.luxuryMismatch,
          rentTierAz: result.rentTierAz, districtPopulationK: result.districtPopulationK,
          lang, selectedAgents: [agentKey],
        }),
      })
      const data = await res.json()
      const agent = data.agents?.[0] as AgentResult | undefined
      if (agent) {
        setAgentResults(prev => ({ ...prev, [agentKey]: agent }))
        setAgentStatus(prev => ({ ...prev, [agentKey]: 'done' }))
      } else {
        setAgentStatus(prev => ({ ...prev, [agentKey]: 'error' }))
      }
    } catch {
      setAgentStatus(prev => ({ ...prev, [agentKey]: 'error' }))
    }
  }

  const completedAgents = AGENT_TOOLBAR_DEFS.filter(a => agentResults[a.key])

  return (
    <>
      {/* Agent buttons */}
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(100,116,139,0.45)', marginBottom: 6, fontWeight: 600 }}>
          {strings.EXPERT_PANEL_TITLE}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {AGENT_TOOLBAR_DEFS.map(agent => {
            const status = agentStatus[agent.key] ?? 'idle'
            const label = lang === 'az' ? agent.labelAz : agent.labelEn
            const desc = lang === 'az' ? agent.descAz : agent.descEn
            const isDone = status === 'done'
            const isLoading = status === 'loading'
            const isErr = status === 'error'
            return (
              <button
                key={agent.key}
                onClick={() => handleAgentClick(agent.key)}
                title={desc}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 7,
                  cursor: isLoading ? 'wait' : 'pointer', width: '100%', textAlign: 'left',
                  background: isDone ? `${agent.color}18` : isLoading ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${isDone ? agent.color + '45' : isErr ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.055)'}`,
                  color: isDone ? agent.color : isErr ? '#f87171' : isLoading ? 'rgba(203,213,225,0.7)' : 'rgba(148,163,184,0.6)',
                  fontSize: 11, fontWeight: isDone ? 600 : 400, transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12 }}>{agent.emoji}</span>
                <span style={{ flex: 1, letterSpacing: '-0.01em' }}>{label}</span>
                <span style={{ fontSize: 10, width: 14, textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', opacity: 0.8 }}>
                  {isLoading ? '…' : isDone ? '✓' : isErr ? '!' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Agent result cards — appear inline as each completes */}
      {completedAgents.map((agent) => {
        const r = agentResults[agent.key]!
        return (
          <div key={agent.key} style={{
            margin: '0', padding: '14px 16px',
            background: 'rgba(7,9,13,0.3)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            borderLeft: `3px solid ${agent.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{agent.emoji}</span>
              <span style={{ color: agent.color, fontSize: 11.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {r.role}
              </span>
              {r.confidence !== undefined && (
                <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'rgba(100,116,139,0.55)', fontFamily: 'monospace' }}>
                  {r.confidence}/10
                </span>
              )}
            </div>
            <p style={{ color: 'rgba(203,213,225,0.88)', fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
              {r.opinion}
            </p>
            {r.confidence !== undefined && (
              <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < r.confidence! ? `${agent.color}cc` : 'rgba(255,255,255,0.07)' }} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function ResultView({ business, result, context, lat, lng, onReset, strings, lang }: {
  business: string
  result: AnalysisResult
  context: PlacesContext | null
  lat: number | null
  lng: number | null
  onReset: () => void
  strings: Strings
  lang: Lang
}) {
  const [chartTab, setChartTab] = useState<ChartTab>('dual')
  const color = scoreColor(result.score)

  const chartFactors = (result.factors ?? []).map(f => ({
    label: strings[FACTOR_LABEL_KEYS[f.key]] as string,
    score: f.score,
    max: f.max,
  }))
  const chartTotal = chartFactors.reduce((s, f) => s + f.score, 0)
  const chartMax = chartFactors.reduce((s, f) => s + f.max, 0)

  return (
    <div className="anim-scale-in flex flex-col h-full overflow-hidden">
      {/* Score header */}
      <div
        className="shrink-0 px-5 py-4 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Ambient score glow */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translate(0,-50%)',
          width: 90, height: 90, borderRadius: '50%',
          background: color, filter: 'blur(28px)',
          animationName: 'glow-breathe', animationDuration: '3s',
          animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          pointerEvents: 'none', opacity: 0.15,
        }} />
        <p
          className="text-[11px] uppercase tracking-[0.2em] mb-1 relative z-10"
          style={{ color: 'rgba(100,116,139,0.65)' }}
        >
          {strings.RESULT_BUSINESS_TYPE}
        </p>
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <h2
              className="font-bold text-base tracking-tight truncate"
              style={{ color: 'rgba(241,245,249,0.95)' }}
            >
              {business}
            </h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <VerdictBadge score={result.score} strings={strings} />
              {result.rentTierAz && (
                <span className="text-[11px]" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  Kirayə: <span style={{ color: 'rgba(203,213,225,0.7)' }}>{result.rentTierAz}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-3xl font-bold tabular-nums" style={{ color, fontFamily: 'monospace' }}>
              {result.score}%
            </span>
            <ScoreRingMini score={result.score} />
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Map layer toggles */}
        <LayerButtonsSection lang={lang} />

        {/* Per-agent analysis buttons + inline results */}
        <AgentButtonsSection
          business={business}
          result={result}
          context={context}
          lat={lat}
          lng={lng}
          lang={lang}
          strings={strings}
        />

        {/* Warnings */}
        {result.luxuryMismatch && (
          <div className="px-5 py-2.5" style={{ background: 'rgba(180,130,0,0.08)', borderBottom: '1px solid rgba(180,130,0,0.15)' }}>
            <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>⚠ {strings.WARN_LUXURY_MISMATCH}</p>
          </div>
        )}
        {(context?.dominantCompetitors ?? []).map((dc, i) => (
          <div key={i} className="px-5 py-2.5" style={{ background: 'rgba(160,0,0,0.08)', borderBottom: '1px solid rgba(160,0,0,0.15)' }}>
            <p className="text-[11px] font-medium" style={{ color: '#f87171' }}>
              {strings.WARN_DOMINANT_COMPETITOR.replace('{name}', dc.name).replace('{dist}', String(dc.distance))}
            </p>
          </div>
        ))}

        {/* Summary */}
        {result.summary && (
          <div
            className="px-5 py-4"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(7,9,13,0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(203,213,225,0.90)' }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Pros */}
        {result.pros.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-2.5 font-medium" style={{ color: 'rgba(100,116,139,0.65)' }}>
              {strings.RESULT_PROS}
            </p>
            <ul className="space-y-1.5">
              {result.pros.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] leading-snug rounded-lg px-3 py-2"
                  style={{
                    background: 'rgba(52,211,153,0.05)',
                    border: '1px solid rgba(52,211,153,0.1)',
                    borderLeft: '2px solid rgba(52,211,153,0.45)',
                    animationName: 'fade-up', animationDuration: '0.4s',
                    animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                    animationFillMode: 'both', animationDelay: `${i * 55}ms`,
                  }}
                >
                  <ProIcon color="#34d399" />
                  <span style={{ color: 'rgba(203,213,225,0.85)' }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {result.cons.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-2.5 font-medium" style={{ color: 'rgba(100,116,139,0.65)' }}>
              {strings.RESULT_CONS}
            </p>
            <ul className="space-y-1.5">
              {result.cons.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] leading-snug rounded-lg px-3 py-2"
                  style={{
                    background: 'rgba(248,113,113,0.05)',
                    border: '1px solid rgba(248,113,113,0.1)',
                    borderLeft: '2px solid rgba(248,113,113,0.45)',
                    animationName: 'fade-up', animationDuration: '0.4s',
                    animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                    animationFillMode: 'both', animationDelay: `${i * 55}ms`,
                  }}
                >
                  <ConIcon color="#f87171" />
                  <span style={{ color: 'rgba(203,213,225,0.85)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Factor breakdown — chart tabs */}
        {chartFactors.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            {/* Tab strip */}
            <div
              className="px-6 pt-5 pb-0 flex items-center justify-between"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] font-medium" style={{ color: 'rgba(100,116,139,0.65)' }}>
                {strings.RESULT_FACTOR_BREAKDOWN}
              </p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['dual', 'bars', 'ring'] as ChartTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide transition-colors"
                    style={{
                      background: chartTab === tab ? BLUE : 'transparent',
                      color: chartTab === tab ? '#fff' : 'rgba(100,116,139,0.6)',
                    }}
                  >
                    {tab === 'dual' ? '◐' : tab === 'bars' ? '≡' : '○'}
                  </button>
                ))}
              </div>
            </div>
            {/* Chart */}
            {chartTab === 'dual' && <DualChartDisplay factors={chartFactors} total={chartTotal} maxTotal={chartMax} />}
            {chartTab === 'bars' && <BarsChartDisplay factors={chartFactors} accent={BLUE} />}
            {chartTab === 'ring' && <ScoreRingDisplay factors={chartFactors} total={chartTotal} maxTotal={chartMax} accent={BLUE} />}
          </div>
        )}

        {/* OSM data grid */}
        {context && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.3)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.65)' }}>
              {strings.RESULT_OSM_TITLE}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: String(context.competitors),     lbl: strings.RESULT_OSM_COMPETITORS },
                { val: String(context.totalBusinesses), lbl: strings.RESULT_OSM_BUSINESSES },
                { val: String(context.busStops),        lbl: strings.RESULT_OSM_BUS_STOPS },
                { val: String(context.groceryStores),   lbl: strings.RESULT_OSM_GROCERY },
                { val: String(context.parking),         lbl: strings.RESULT_OSM_PARKING },
                { val: context.metroDistance !== null ? `${context.metroDistance}m` : '—', lbl: strings.RESULT_OSM_METRO },
              ].map(({ val, lbl }, i) => (
                <GlowingStatCard
                  key={lbl}
                  value={val}
                  label={lbl}
                  animationDelay={`${i * 50}ms`}
                />
              ))}
            </div>
            {context.landUse && (
              <p className="text-[11px] mt-2.5" style={{ color: '#fbbf24' }}>⚠ {context.landUse}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-2.5">
          <GlowingButton onClick={onReset} style={{ flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4.5"/>
                <polyline points="10 2 10 4.5 7.5 4.5"/>
              </svg>
              {strings.RESULT_RESET}
            </span>
          </GlowingButton>
          <PdfDownloadButton business={business} result={result} context={context} label={strings.RESULT_PDF_DOWNLOAD} lat={lat ?? undefined} lng={lng ?? undefined} />
        </div>
      </div>
    </div>
  )
}

// ─── Compare View ─────────────────────────────────────────────────────────────

function CompareView({ analyses, strings }: {
  analyses: SavedAnalysis[]
  strings: Strings
}) {
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
        <p className="text-[14px] text-center" style={{ color: 'rgba(100,116,139,0.55)' }}>{strings.HISTORY_EMPTY}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Comparison table — pinned at top when 2+ selected */}
      {compared.length >= 2 && (
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: ACC, opacity: 0.8 }}>
            {strings.DASHBOARD_COMPARE_TITLE}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `108px repeat(${compared.length}, 1fr)`,
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="px-3 py-2.5">
                <span className="text-[8px] uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.5)' }}>Faktor</span>
              </div>
              {compared.map(a => (
                <div key={a.id} className="px-2 py-2.5 text-center border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-semibold leading-tight" style={{ color: 'rgba(226,232,240,0.85)' }}>
                    {a.business.length > 12 ? a.business.slice(0, 11) + '…' : a.business}
                  </p>
                </div>
              ))}
            </div>

            {/* Score row */}
            {(() => {
              const maxScore = Math.max(...compared.map(a => a.score))
              return (
                <div className="grid" style={{ gridTemplateColumns: `108px repeat(${compared.length}, 1fr)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-3 py-2.5 flex items-center">
                    <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.65)' }}>Ümumi Bal</span>
                  </div>
                  {compared.map(a => (
                    <div key={a.id} className="px-2 py-2.5 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: a.score === maxScore ? ACC : scoreColor(a.score), fontFamily: 'monospace' }}
                      >
                        {a.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Rent tier row */}
            <div className="grid" style={{ gridTemplateColumns: `108px repeat(${compared.length}, 1fr)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-3 py-2.5 flex items-center">
                <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.65)' }}>Kirayə</span>
              </div>
              {compared.map(a => (
                <div key={a.id} className="px-2 py-2.5 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px]" style={{ color: 'rgba(203,213,225,0.7)' }}>
                    {a.rentTierAz ?? '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Factor rows */}
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
                    gridTemplateColumns: `108px repeat(${compared.length}, 1fr)`,
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="px-3 py-2.5 flex items-center">
                    <span className="text-[11px] leading-snug" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
                  </div>
                  {scores.map((s, idx) => {
                    const isWinner = s !== null && s.pct === maxPct && maxPct > 0
                    return (
                      <div key={idx} className="px-2 py-2.5 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        {s ? (
                          <span
                            className="text-[10px] font-semibold tabular-nums"
                            style={{ color: isWinner ? ACC : 'rgba(100,116,139,0.7)', fontFamily: 'monospace' }}
                          >
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

      {/* Selection list */}
      <p className="text-[10px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        {strings.DASHBOARD_COMPARE_HINT}
      </p>
      <ul className="space-y-2">
        {analyses.map((a) => {
          const isOn = selected.has(a.id)
          return (
            <li key={a.id}>
              <button
                onClick={() => toggle(a.id)}
                className="w-full text-left rounded-xl px-3.5 py-3 flex items-center gap-3 transition-all duration-150"
                style={{
                  background: isOn ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isOn ? 'rgba(59,130,246,0.28)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div
                  className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                  style={{
                    background: isOn ? '#3b82f6' : 'transparent',
                    border: `1.5px solid ${isOn ? '#3b82f6' : 'rgba(100,116,139,0.4)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {isOn && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#07090D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5l2.5 2.5 4-4"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'rgba(226,232,240,0.85)' }}>{a.business}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{a.date}</p>
                </div>
                <span className="text-base font-bold tabular-nums shrink-0" style={{ color: scoreColor(a.score), fontFamily: 'monospace' }}>
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

// ─── Insights View ────────────────────────────────────────────────────────────

function InsightsView({ strings }: { strings: Strings }) {
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
      {/* Metro overview stats */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div
          className="rounded-xl py-3.5 text-center"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <p className="text-xl font-bold tabular-nums" style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
            {Math.round(totalRidership / 1000)}K
          </p>
          <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>
            Gündəlik Sərniş
          </p>
        </div>
        <div
          className="rounded-xl py-3.5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xl font-bold tabular-nums" style={{ color: 'rgba(241,245,249,0.9)', fontFamily: 'monospace' }}>
            {METRO_STATIONS.length}
          </p>
          <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>
            Stansiya
          </p>
        </div>
      </div>

      {/* Station ridership chart */}
      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        {strings.DASHBOARD_METRO_RIDERSHIP}
      </p>
      <div className="space-y-2.5 mb-6">
        {topStations.map((s, idx) => {
          const pct = Math.round((s.dailyRidership / maxRidership) * 100)
          return (
            <div key={s.nameAz} className="flex items-center gap-2.5">
              <span
                className="text-[9px] w-3 tabular-nums shrink-0 text-right"
                style={{ color: 'rgba(100,116,139,0.4)', fontFamily: 'monospace' }}
              >
                {idx + 1}
              </span>
              <span
                className="text-[12px] w-24 shrink-0 truncate"
                style={{ color: 'rgba(203,213,225,0.88)' }}
              >
                {s.nameAz}
              </span>
              <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: '#3b82f6', opacity: 0.5 + (pct / 100) * 0.5 }}
                />
              </div>
              <span
                className="text-[9px] shrink-0 tabular-nums"
                style={{ color: 'rgba(100,116,139,0.7)', fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}
              >
                {Math.round(s.dailyRidership / 1000)}K
              </span>
            </div>
          )
        })}
      </div>

      {/* Urban tier scoring */}
      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.6)' }}>
        Şəhər Tipi (Bal)
      </p>
      <div className="space-y-1.5">
        {urbanTiers.map(t => (
          <div
            key={t.sub}
            className="flex items-center justify-between rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'rgba(226,232,240,0.85)' }}>{t.label}</p>
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'rgba(100,116,139,0.5)' }}>{t.sub}</p>
            </div>
            <span className="text-sm font-bold" style={{ color: t.color, fontFamily: 'monospace' }}>
              {t.pts} bal
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesktopDashboard({
  analyses,
  currentResult,
  currentBusiness,
  currentContext,
  currentLat,
  currentLng,
  onReset,
  onOpenHistory,
  strings,
  lang,
}: Props) {
  const [view, setView] = useState<PanelView>('idle')

  // Auto-switch to result view when a new result arrives
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentResult) setView('result')
  }, [currentResult])

  const handleReset = () => {
    setView('idle')
    onReset()
  }

  const handleBack = () => setView('idle')

  const subHeaderViews: PanelView[] = ['compare', 'insights']
  const viewTitle: Record<PanelView, string> = {
    idle: '',
    result: '',
    compare: strings.DASHBOARD_COMPARE_TITLE,
    insights: strings.DASHBOARD_INSIGHTS_TITLE,
  }

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundImage: `linear-gradient(var(--dashboard-bg), var(--dashboard-bg)), url(/dashboard-image.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backdropFilter: 'var(--dashboard-blur)',
        WebkitBackdropFilter: 'var(--dashboard-blur)',
        borderLeft: '1px solid var(--dashboard-border)',
      }}
    >
      {/* Sub-header for compare / insights */}
      {subHeaderViews.includes(view) && (
        <div
          className="shrink-0 px-4 py-3 flex items-center gap-2.5"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: 'rgba(100,116,139,0.7)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.7)')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2L4 6l4 4"/>
            </svg>
            {strings.DASHBOARD_BACK}
          </button>
          <span className="w-px h-3.5 bg-slate-700 shrink-0" />
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(226,232,240,0.8)' }}>
            {viewTitle[view]}
          </span>
        </div>
      )}

      {/* View content */}
      {view === 'idle' && (
        <IdleView
          analyses={analyses}
          onOpenHistory={onOpenHistory}
          onCompare={() => setView('compare')}
          onInsights={() => setView('insights')}
          strings={strings}
        />
      )}

      {view === 'result' && currentResult && (
        <ResultView
          business={currentBusiness}
          result={currentResult}
          context={currentContext}
          lat={currentLat}
          lng={currentLng}
          onReset={handleReset}
          strings={strings}
          lang={lang}
        />
      )}

      {view === 'compare' && (
        <CompareView analyses={analyses} strings={strings} />
      )}

      {view === 'insights' && (
        <InsightsView strings={strings} />
      )}
    </div>
  )
}
