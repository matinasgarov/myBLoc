'use client'
import { useState, useEffect, useRef } from 'react'
import type { AnalysisResult, PlacesContext, SavedAnalysis, FactorKey, AgentResult, AgentStatus } from '@/lib/types'
import type { Strings, Lang } from '@/lib/i18n'
import PdfDownloadButton from './PdfDownloadButton'
import { METRO_STATIONS } from '@/lib/metro-stations'
import { DualChartDisplay, BarsChartDisplay, ScoreRingDisplay } from '@/components/Charts'
import { GlowingStatCard, GlowingButton } from '@/components/ui/glowing-card'

type PanelView = 'idle' | 'result' | 'compare' | 'insights'
type ChartTab = 'dual' | 'bars' | 'ring'

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
  agentResults: Record<string, AgentResult>
  agentStatus: Record<string, AgentStatus>
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


const LOADING_MESSAGES_AZ = [
  'Məlumatları toplayıram…',
  'Şəkilləri analiz edirəm…',
  'Trafik nümunələrini araşdırıram…',
  'Məlumatları çarpaz yoxlayıram…',
  'Bazar nüanslarını qiymətləndirirəm…',
  'Nəticələri tərtib edirəm…',
]

const LOADING_MESSAGES_EN = [
  'Gathering data…',
  'Analyzing patterns…',
  'Examining traffic flows…',
  'Cross-referencing datasets…',
  'Weighing market nuances…',
  'Compiling insights…',
]

function LoadingMessages({ lang, color }: { lang: Lang; color: string }) {
  const messages = lang === 'az' ? LOADING_MESSAGES_AZ : LOADING_MESSAGES_EN
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx(i => (i + 1) % messages.length)
    }, 1600)
    return () => window.clearInterval(id)
  }, [messages.length])
  return (
    <p style={{ marginTop: 10, fontSize: 10.5, color: `${color}cc`, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.3s' }} key={idx} className="anim-fade-up">
      <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      {messages[idx]}
    </p>
  )
}

function AgentLogo({ emoji, color }: { emoji: string; color: string }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 30% 30%, ${color}33 0%, ${color}11 60%, rgba(7,9,13,0.6) 100%)`,
      border: `1.5px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20,
      boxShadow: `0 0 18px ${color}33, inset 0 0 12px ${color}22`,
    }}>
      {emoji}
    </div>
  )
}

function ConfidenceDiagram({ confidence, color }: { confidence: number; color: string }) {
  const pct = Math.max(0, Math.min(10, confidence)) / 10
  const R = 24
  const circ = 2 * Math.PI * R
  return (
    <div style={{
      width: 88, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6,
    }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx={30} cy={30} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
          <circle
            cx={30} cy={30} r={R}
            fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - pct * circ}
            transform="rotate(-90 30 30)"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.25,0,0,1)', filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace' }}>
            {confidence}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
        {[0.45, 0.7, 0.55, 0.85, 0.6].map((h, i) => {
          const active = i < Math.round(pct * 5)
          return (
            <span key={i} style={{
              width: 4, height: `${h * 100}%`, borderRadius: 1.5,
              background: active ? color : `${color}22`,
              boxShadow: active ? `0 0 4px ${color}88` : 'none',
              transition: 'background 0.3s',
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ─── Diagnostic chart primitives ──────────────────────────────────────────────

function ChartCard({ label, value, color, children }: {
  label: string
  value: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: '8px 10px 9px',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <p style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(100,116,139,0.7)', margin: 0, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
      <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      <p style={{ fontSize: 10.5, color, fontFamily: 'monospace', fontWeight: 700, margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value}</p>
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100, h = 36
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  })
  const area = `0,${h} ${points.join(' ')} ${w},${h}`
  const last = points[points.length - 1].split(',')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={1.8} fill={color} />
    </svg>
  )
}

function Gauge({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(1, pct))
  const R = 22
  const halfCirc = Math.PI * R
  const startX = 30 - R, startY = 30
  const endX = 30 + R, endY = 30
  const path = `M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${endY}`
  const angle = Math.PI - clamped * Math.PI
  const tipX = 30 + R * Math.cos(angle)
  const tipY = 30 - R * Math.sin(angle)
  return (
    <svg viewBox="0 0 60 36" style={{ width: '100%', height: '100%' }}>
      <path d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} strokeLinecap="round" />
      <path d={path} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={halfCirc} strokeDashoffset={halfCirc * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25,0,0,1)' }} />
      <circle cx={tipX} cy={tipY} r={2.5} fill={color} />
    </svg>
  )
}

function StackedHBar({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: 'width 0.5s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, fontSize: 8.5 }}>
        {segments.map((s, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(148,163,184,0.65)', whiteSpace: 'nowrap' }}>
            <span style={{ width: 5, height: 5, borderRadius: 1, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function BarSeries({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: '100%' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: `linear-gradient(180deg, ${color} 0%, ${color}66 100%)`,
          borderRadius: '2px 2px 0 0',
          minHeight: 2,
          transition: 'height 0.5s',
        }} />
      ))}
    </div>
  )
}

// ─── Diagnostic charts per agent ──────────────────────────────────────────────

function getDiagnosticCharts(
  agentKey: string,
  color: string,
  result: AnalysisResult,
  context: PlacesContext | null,
  lang: Lang,
): React.ReactNode {
  const ctx = context
  const az = lang === 'az'
  const competitors = ctx?.competitors ?? 0
  const totalBiz = ctx?.totalBusinesses ?? 0
  const busStops = ctx?.busStops ?? 0
  const parking = ctx?.parking ?? 0
  const grocery = ctx?.groceryStores ?? 0
  const metroDist = ctx?.metroDistance
  const metroRide = ctx?.metroRidership ?? 0
  const majorRoads = ctx?.majorRoads ?? 0
  const tier = ctx?.urbanTier ?? 'rural'
  const rentTier = result.rentTier ?? 'Medium'
  const tierMul = tier === 'metro-city' ? 1 : tier === 'city' ? 0.7 : tier === 'town' ? 0.4 : 0.15
  const rentMul = rentTier === 'Very High' ? 1 : rentTier === 'High' ? 0.75 : rentTier === 'Medium' ? 0.5 : 0.25

  switch (agentKey) {
    case 'market-analyst': {
      const saturationPct = Math.min(1, competitors / 12)
      const trend = [3, 4, 6, 5, 7, 8, competitors || 6, Math.min(12, (competitors || 6) + 1)]
      return (
        <>
          <ChartCard label={az ? 'Bazar Doyumu' : 'Saturation'} value={`${Math.round(saturationPct * 100)}%`} color={color}>
            <Gauge pct={saturationPct} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Rəqabət Trendi' : 'Volatility Trend'} value={`${competitors} ${az ? 'rəqib' : 'comp'}`} color={color}>
            <Sparkline data={trend} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Kateqoriya Payı' : 'Category Mix'} value={`${totalBiz} ${az ? 'biznes' : 'biz'}`} color={color}>
            <StackedHBar segments={[
              { value: competitors,                       color: color,         label: az ? 'Rəqib' : 'Direct' },
              { value: Math.max(0, totalBiz - competitors), color: `${color}55`, label: az ? 'Digər' : 'Other' },
            ]} />
          </ChartCard>
        </>
      )
    }
    case 'risk-advisor': {
      const legalRisk = result.luxuryMismatch ? 7 : 2
      const financialRisk = Math.round(rentMul * 10)
      const operationalRisk = ctx?.landUse ? 6 : Math.max(2, 10 - Math.round(tierMul * 8))
      const totalRisk = (legalRisk + financialRisk + operationalRisk) / 30
      const volatility = [4, 6, 5, 7, 6, 8, financialRisk + 1, Math.max(legalRisk, operationalRisk)]
      return (
        <>
          <ChartCard label={az ? 'Risk Bölgüsü' : 'Risk Exposure'} value={`${legalRisk + financialRisk + operationalRisk}/30`} color={color}>
            <StackedHBar segments={[
              { value: legalRisk,       color: '#ef4444', label: az ? 'Hüquqi'   : 'Legal' },
              { value: financialRisk,   color: '#f59e0b', label: az ? 'Maliyyə'  : 'Fiscal' },
              { value: operationalRisk, color: '#a855f7', label: az ? 'Əməliyyat': 'Ops' },
            ]} />
          </ChartCard>
          <ChartCard label={az ? 'Dəyişkənlik' : 'Volatility'} value={`σ ${(volatility.reduce((a, b) => a + b, 0) / volatility.length).toFixed(1)}`} color={color}>
            <Sparkline data={volatility} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Şiddət İndeksi' : 'Severity Index'} value={`${Math.round(totalRisk * 100)}%`} color={color}>
            <Gauge pct={totalRisk} color={color} />
          </ChartCard>
        </>
      )
    }
    case 'location-strategist': {
      const metroPct = metroDist === null || metroDist === undefined ? 0 : Math.max(0, 1 - metroDist / 1500)
      const ridershipBars = [0.4, 0.6, 0.55, 0.85, 0.7, 0.5, 0.35].map(v => Math.round(v * Math.max(1, metroRide / 1000)))
      return (
        <>
          <ChartCard label={az ? 'Metro Yaxınlığı' : 'Metro Proximity'} value={metroDist != null ? `${metroDist}m` : '—'} color={color}>
            <Gauge pct={metroPct} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Sərnişin Axını' : 'Catchment Pull'} value={`${Math.round(metroRide / 1000)}K`} color={color}>
            <BarSeries data={ridershipBars} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Yol Şəbəkəsi' : 'Road Network'} value={`${majorRoads} ${az ? 'yol' : 'rd'}`} color={color}>
            <StackedHBar segments={[
              { value: majorRoads,                          color: color,         label: az ? 'Əsas'  : 'Major' },
              { value: Math.max(0, 6 - majorRoads),         color: `${color}40`,  label: az ? 'Yerli' : 'Local' },
            ]} />
          </ChartCard>
        </>
      )
    }
    case 'customer-flow': {
      const hours = [0.3, 0.45, 0.6, 0.85, 0.75, 0.55, 0.7, 0.95, 0.8, 0.5].map(v => Math.round(v * 100))
      const transitPct = Math.min(1, (busStops + (metroDist != null && metroDist < 600 ? 5 : 0)) / 10)
      return (
        <>
          <ChartCard label={az ? 'Saatlıq Trafik' : 'Hourly Footfall'} value={`${Math.max(...hours)} ${az ? 'pik' : 'peak'}`} color={color}>
            <BarSeries data={hours} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Tranzit Əlçatanlıq' : 'Transit Score'} value={`${Math.round(transitPct * 100)}%`} color={color}>
            <Gauge pct={transitPct} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Parkinq Tutumu' : 'Parking Mix'} value={`${parking}`} color={color}>
            <StackedHBar segments={[
              { value: Math.max(1, parking),              color: color,        label: az ? 'Mövcud' : 'On-site' },
              { value: Math.max(1, busStops),             color: `${color}77`, label: az ? 'Tranzit': 'Transit' },
            ]} />
          </ChartCard>
        </>
      )
    }
    case 'urban-forecaster': {
      const trajectory = (() => {
        const base = tierMul * 60 + 20
        return [base - 8, base - 4, base - 2, base + 1, base + 5, base + 9, base + 14, base + 20].map(v => Math.round(v))
      })()
      const popK = result.districtPopulationK ?? 0
      const zoningPct = Math.min(1, totalBiz / 50)
      return (
        <>
          <ChartCard label={az ? 'İnkişaf Trayektoriyası' : 'Growth Trajectory'} value={`+${Math.round((trajectory[trajectory.length - 1] - trajectory[0]) / trajectory[0] * 100)}%`} color={color}>
            <Sparkline data={trajectory} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Zonalanma Təzyiqi' : 'Zoning Pressure'} value={`${Math.round(zoningPct * 100)}%`} color={color}>
            <Gauge pct={zoningPct} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Əhali Tərkibi' : 'Population Mix'} value={popK ? `${popK.toFixed(1)}K` : '—'} color={color}>
            <StackedHBar segments={[
              { value: Math.max(1, Math.round(tierMul * 10)),         color: color,         label: az ? 'Şəhər'  : 'Urban' },
              { value: Math.max(1, Math.round((1 - tierMul) * 10)),   color: `${color}55`,  label: az ? 'Periferiya' : 'Periph' },
            ]} />
          </ChartCard>
        </>
      )
    }
    case 'infrastructure-auditor': {
      const utilities = [
        { value: Math.max(2, busStops),     color: '#10b981', label: az ? 'Tranzit' : 'Transit' },
        { value: Math.max(2, grocery),      color: '#f59e0b', label: az ? 'Ərzaq'   : 'Retail' },
        { value: Math.max(2, parking),      color: '#3b82f6', label: az ? 'Park'    : 'Parking' },
        { value: Math.max(2, majorRoads),   color: '#a855f7', label: az ? 'Yollar'  : 'Roads' },
      ]
      const roadPct = Math.min(1, majorRoads / 6)
      const density = [grocery, busStops, parking, majorRoads, totalBiz / 5].map(v => Math.max(1, Math.round(v)))
      return (
        <>
          <ChartCard label={az ? 'Kommunal Əhatə' : 'Utility Coverage'} value={`${utilities.length}× ${az ? 'xidmət' : 'svc'}`} color={color}>
            <StackedHBar segments={utilities} />
          </ChartCard>
          <ChartCard label={az ? 'Yol Keyfiyyəti' : 'Road Quality'} value={`${Math.round(roadPct * 100)}%`} color={color}>
            <Gauge pct={roadPct} color={color} />
          </ChartCard>
          <ChartCard label={az ? 'Xidmət Sıxlığı' : 'Service Density'} value={`${density.reduce((a, b) => a + b, 0)} pts`} color={color}>
            <BarSeries data={density} color={color} />
          </ChartCard>
        </>
      )
    }
    default:
      return null
  }
}

function splitOpinionPoints(text: string): string[] {
  const pieces = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  if (pieces.length <= 1) return [text.trim()]
  return pieces.slice(0, 4)
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

function ResultView({ business, result, context, lat, lng, onReset, strings, lang, agentResults, agentStatus }: {
  business: string
  result: AnalysisResult
  context: PlacesContext | null
  lat: number | null
  lng: number | null
  onReset: () => void
  strings: Strings
  lang: Lang
  agentResults: Record<string, AgentResult>
  agentStatus: Record<string, AgentStatus>
}) {
  const [chartTab, setChartTab] = useState<ChartTab>('dual')
  const agentResultsRef = useRef<HTMLDivElement>(null)
  const prevAgentCountRef = useRef(0)
  const color = scoreColor(result.score)

  const chartFactors = (result.factors ?? []).map(f => ({
    label: strings[FACTOR_LABEL_KEYS[f.key]] as string,
    score: f.score,
    max: f.max,
  }))
  const chartTotal = chartFactors.reduce((s, f) => s + f.score, 0)
  const chartMax = chartFactors.reduce((s, f) => s + f.max, 0)

  const completedAgents = AGENT_TOOLBAR_DEFS.filter(a => agentResults[a.key])
  const loadingAgents = AGENT_TOOLBAR_DEFS.filter(a => agentStatus[a.key] === 'loading')
  const hasAgentSection = completedAgents.length > 0 || loadingAgents.length > 0

  useEffect(() => {
    const prevCount = prevAgentCountRef.current
    const nowCount = Object.keys(agentResults).length + loadingAgents.length
    if (nowCount > prevCount) {
      setTimeout(() => {
        agentResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
    prevAgentCountRef.current = nowCount
  }, [agentResults, loadingAgents.length])

  return (
    <div className="anim-scale-in flex flex-col h-full overflow-hidden">
      {/* Score header */}
      <div
        className="shrink-0 px-5 py-4 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,13,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
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
          <div className="flex items-center shrink-0">
            <span className="text-3xl font-bold tabular-nums" style={{ color, fontFamily: 'monospace' }}>
              {result.score}%
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Warnings */}
        {result.luxuryMismatch && (
          <div className="px-5 py-2.5" style={{ background: 'rgba(180,130,0,0.12)', borderBottom: '1px solid rgba(180,130,0,0.2)' }}>
            <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>⚠ {strings.WARN_LUXURY_MISMATCH}</p>
          </div>
        )}
        {(context?.dominantCompetitors ?? []).map((dc, i) => (
          <div key={i} className="px-5 py-2.5" style={{ background: 'rgba(160,0,0,0.12)', borderBottom: '1px solid rgba(160,0,0,0.2)' }}>
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
              background: 'rgba(7,9,13,0.82)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(203,213,225,0.92)' }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Pros */}
        {result.pros.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-2.5 font-medium" style={{ color: 'rgba(100,116,139,0.75)' }}>
              {strings.RESULT_PROS}
            </p>
            <ul className="space-y-1.5">
              {result.pros.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] leading-snug rounded-lg px-3 py-2"
                  style={{
                    background: 'rgba(52,211,153,0.07)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    borderLeft: '2px solid rgba(52,211,153,0.5)',
                    animationName: 'fade-up', animationDuration: '0.4s',
                    animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                    animationFillMode: 'both', animationDelay: `${i * 55}ms`,
                  }}
                >
                  <ProIcon color="#34d399" />
                  <span style={{ color: 'rgba(220,230,240,0.92)' }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {result.cons.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-2.5 font-medium" style={{ color: 'rgba(100,116,139,0.75)' }}>
              {strings.RESULT_CONS}
            </p>
            <ul className="space-y-1.5">
              {result.cons.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] leading-snug rounded-lg px-3 py-2"
                  style={{
                    background: 'rgba(248,113,113,0.07)',
                    border: '1px solid rgba(248,113,113,0.15)',
                    borderLeft: '2px solid rgba(248,113,113,0.5)',
                    animationName: 'fade-up', animationDuration: '0.4s',
                    animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                    animationFillMode: 'both', animationDelay: `${i * 55}ms`,
                  }}
                >
                  <ConIcon color="#f87171" />
                  <span style={{ color: 'rgba(220,230,240,0.92)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Factor breakdown — chart tabs */}
        {chartFactors.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <div className="px-6 pt-5 pb-0 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] font-medium" style={{ color: 'rgba(100,116,139,0.75)' }}>
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
            {chartTab === 'dual' && <DualChartDisplay factors={chartFactors} total={chartTotal} maxTotal={chartMax} />}
            {chartTab === 'bars' && <BarsChartDisplay factors={chartFactors} accent={BLUE} />}
            {chartTab === 'ring' && <ScoreRingDisplay factors={chartFactors} total={chartTotal} maxTotal={chartMax} accent={BLUE} />}
          </div>
        )}

        {/* OSM data grid */}
        {context && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,9,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <p className="text-[11px] uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.75)' }}>
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

        {/* Agent cards — loading skeletons + completed results */}
        {hasAgentSection && (
          <div ref={agentResultsRef}>
            <p style={{ padding: '10px 16px 4px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(100,116,139,0.5)', fontWeight: 600, background: 'rgba(7,9,13,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', margin: 0 }}>
              {strings.EXPERT_PANEL_TITLE}
            </p>

            {/* Loading skeletons (new grid layout) */}
            {loadingAgents.map((agent) => {
              const purpose = lang === 'az' ? agent.descAz : agent.descEn
              return (
                <div key={`loading-${agent.key}`} style={{
                  background: 'rgba(7,9,13,0.82)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${agent.color}55`,
                }}>
                  {/* Header row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <AgentLogo emoji={agent.emoji} color={agent.color} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: agent.color, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.25 }}>
                        {lang === 'az' ? agent.labelAz : agent.labelEn}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'rgba(148,163,184,0.65)', margin: '2px 0 0', lineHeight: 1.3 }}>
                        {purpose}
                      </p>
                    </div>
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: `2px solid ${agent.color}33`, borderTopColor: agent.color, animation: 'spin-arc 0.8s linear infinite' }} />
                  </div>

                  {/* Body: shimmer text + diagram */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[94, 84, 72, 58].map((w, i) => (
                        <div key={i} style={{
                          height: 8, borderRadius: 4,
                          width: `${w}%`,
                          background: `linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.04) 100%)`,
                          backgroundSize: '200% 100%',
                          animation: `shimmer 1.6s ease-in-out ${i * 0.18}s infinite`,
                        }} />
                      ))}
                      <LoadingMessages lang={lang} color={agent.color} />
                    </div>
                    {/* Diagram skeleton */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        border: `2px solid ${agent.color}22`,
                        borderTopColor: `${agent.color}99`,
                        animation: 'spin-arc 1.4s linear infinite',
                      }} />
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
                        {[0.45, 0.7, 0.55, 0.85, 0.6].map((h, i) => (
                          <span key={i} style={{
                            width: 4, height: `${h * 100}%`, borderRadius: 1.5,
                            background: `${agent.color}22`,
                            animation: `shimmer 1.4s ease-in-out ${i * 0.15}s infinite`,
                            backgroundImage: `linear-gradient(90deg, ${agent.color}22 0%, ${agent.color}66 50%, ${agent.color}22 100%)`,
                            backgroundSize: '200% 100%',
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Completed cards (new grid layout) */}
            {completedAgents.map((agent) => {
              const r = agentResults[agent.key]!
              const purpose = lang === 'az' ? agent.descAz : agent.descEn
              const points = splitOpinionPoints(r.opinion)
              const confidence = r.confidence ?? 0
              return (
                <div key={agent.key} style={{
                  background: 'rgba(7,9,13,0.82)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${agent.color}`,
                }} className="anim-fade-up">
                  {/* Header row: logo | purpose | score */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <AgentLogo emoji={agent.emoji} color={agent.color} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: agent.color, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.25 }}>
                        {r.role}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'rgba(148,163,184,0.65)', margin: '2px 0 0', lineHeight: 1.3 }}>
                        {purpose}
                      </p>
                    </div>
                    {r.confidence !== undefined && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: `${agent.color}22`,
                        border: `1px solid ${agent.color}66`,
                        color: agent.color,
                        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}>
                        {confidence}/10
                      </div>
                    )}
                  </div>

                  {/* Body: bullet text */}
                  <div style={{ padding: '12px 14px' }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {points.map((p, i) => (
                        <li key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          fontSize: 13.5, lineHeight: 1.6,
                          color: 'rgba(220,228,238,0.94)',
                        }}>
                          <span style={{
                            display: 'inline-block', flexShrink: 0, marginTop: 7,
                            width: 5, height: 5, borderRadius: '50%',
                            background: agent.color, boxShadow: `0 0 6px ${agent.color}aa`,
                          }} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Diagnostic charts strip */}
                  <div style={{
                    display: 'flex', gap: 8,
                    padding: '4px 14px 14px',
                  }}>
                    {getDiagnosticCharts(agent.key, agent.color, result, context, lang)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-2.5" style={{ background: 'rgba(7,9,13,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
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
  agentResults,
  agentStatus,
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
          agentResults={agentResults}
          agentStatus={agentStatus}
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
