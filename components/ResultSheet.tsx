'use client'
import { useState } from 'react'
import { getStrings } from '@/lib/i18n'
import type { AnalysisResult, PlacesContext, FactorKey } from '@/lib/types'
import PdfDownloadButton from './PdfDownloadButton'

type Strings = ReturnType<typeof getStrings>

interface Props {
  business: string
  result: AnalysisResult
  context: PlacesContext | null
  onReset: () => void
  strings: Strings
}

function scoreColor(score: number) {
  if (score >= 70) return { text: '#34d399', ring: '#34d399', track: 'rgba(52,211,153,0.1)' }
  if (score >= 40) return { text: '#fbbf24', ring: '#fbbf24', track: 'rgba(251,191,36,0.1)' }
  return { text: '#f87171', ring: '#f87171', track: 'rgba(248,113,113,0.1)' }
}

function ScoreRing({ score }: { score: number }) {
  const sc = scoreColor(score)
  const R = 26
  const circ = 2 * Math.PI * R
  const filled = (score / 100) * circ

  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
        {/* Track */}
        <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        {/* Progress arc */}
        <circle
          cx={32} cy={32} r={R}
          fill="none"
          stroke={sc.ring}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25,0,0,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-sm font-bold tabular-nums leading-none"
          style={{ color: sc.text, fontFamily: 'monospace' }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] mb-3 font-medium" style={{ color: 'rgba(100,116,139,0.8)' }}>
      {children}
    </p>
  )
}

interface BarProps { label: string; value: number; max: number; note?: string }
function ScoreBar({ label, value, max, note }: BarProps) {
  const pct = Math.round((value / max) * 100)
  const barColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-36 shrink-0" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</span>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {pct > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: barColor, transition: 'width 0.6s ease' }}
          />
        )}
      </div>
      <span className="text-xs text-right shrink-0 tabular-nums font-medium" style={{ color: 'rgba(148,163,184,0.8)' }}>
        {value}/{max}{note ? <span className="ml-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.6)' }}>· {note}</span> : null}
      </span>
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

export default function ResultSheet({ business, result, context, onReset, strings }: Props) {
  const [expanded, setExpanded] = useState(false)
  const sc = scoreColor(result.score)

  const analysisBullets = [result.detail, result.verdict]
    .filter(Boolean)
    .join(' ')
    .split(/[•\n]+/)
    .flatMap(chunk => chunk.split(/(?<=\.)\s+(?=[A-ZÁƏÖÜĞŞÇI])/))
    .map(s => s.trim().replace(/^[•\-–—]\s*/, ''))
    .filter(s => s.length > 10)

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-300"
      style={{
        height: expanded ? '72vh' : '58vh',
        background: '#080C11',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Business name */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1"
            style={{ color: 'rgba(100,116,139,0.7)' }}
          >
            {strings.RESULT_BUSINESS_TYPE}
          </p>
          <h2
            className="font-bold text-lg tracking-tight truncate"
            style={{ color: 'rgba(241,245,249,0.95)' }}
          >
            {business}
          </h2>
        </div>

        {/* Score ring */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p
              className="text-[10px] uppercase tracking-[0.14em] mb-0.5"
              style={{ color: 'rgba(100,116,139,0.7)' }}
            >
              {strings.RESULT_PROBABILITY}
            </p>
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: sc.text, fontFamily: 'monospace' }}
            >
              {result.score}%
            </span>
          </div>
          <ScoreRing score={result.score} />
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(100,116,139,0.8)',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,201,138,0.4)'
            e.currentTarget.style.background = 'rgba(0,201,138,0.06)'
            e.currentTarget.style.color = '#00C98A'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(100,116,139,0.8)'
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4.5"/>
            <polyline points="10 2 10 4.5 7.5 4.5"/>
          </svg>
          {strings.RESULT_RESET}
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Luxury mismatch warning */}
        {result.luxuryMismatch && (
          <div
            className="px-6 py-3 shrink-0"
            style={{
              background: 'rgba(180,130,0,0.08)',
              borderBottom: '1px solid rgba(180,130,0,0.15)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>
              ⚠ {strings.WARN_LUXURY_MISMATCH}
            </p>
          </div>
        )}

        {/* Dominant competitor warnings */}
        {(context?.dominantCompetitors ?? []).map((dc, i) => (
          <div
            key={i}
            className="px-6 py-3 shrink-0"
            style={{
              background: 'rgba(160,0,0,0.08)',
              borderBottom: '1px solid rgba(160,0,0,0.15)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#f87171' }}>
              {strings.WARN_DOMINANT_COMPETITOR
                .replace('{name}', dc.name)
                .replace('{dist}', String(dc.distance))}
            </p>
          </div>
        ))}

        {/* Summary */}
        {result.summary && (
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(203,213,225,0.75)' }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Pros / Cons */}
        <div
          className="grid grid-cols-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Pros */}
          <div
            className="px-6 py-5"
            style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Label>{strings.RESULT_PROS}</Label>
            <ul className="space-y-3">
              {result.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
                  <span
                    className="shrink-0 font-bold mt-px text-xs"
                    style={{ color: '#34d399' }}
                  >
                    +
                  </span>
                  <span style={{ color: 'rgba(203,213,225,0.8)' }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Cons */}
          <div className="px-6 py-5">
            <Label>{strings.RESULT_CONS}</Label>
            <ul className="space-y-3">
              {result.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
                  <span
                    className="shrink-0 font-bold mt-px"
                    style={{ color: '#f87171' }}
                  >
                    —
                  </span>
                  <span style={{ color: 'rgba(203,213,225,0.8)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Expandable detail ─────────────────────────── */}
        {expanded && (
          <div className="px-6 py-6 space-y-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

            {analysisBullets.length > 0 && (
              <div>
                <Label>{strings.RESULT_ANALYSIS}</Label>
                <ul className="space-y-2.5">
                  {analysisBullets.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <span className="shrink-0 mt-px font-bold" style={{ color: 'rgba(0,201,138,0.6)' }}>•</span>
                      <span style={{ color: 'rgba(148,163,184,0.75)' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.factors && result.factors.length > 0 && (
              <div>
                <Label>{strings.RESULT_FACTOR_BREAKDOWN}</Label>
                <div className="space-y-4">
                  {result.factors.map((f) => (
                    <ScoreBar
                      key={f.key}
                      label={strings[FACTOR_LABEL_KEYS[f.key]] as string}
                      value={f.score}
                      max={f.max}
                      note={f.key === 'competition' && context
                        ? strings.RESULT_COMPETITORS_NOTE.replace('{n}', String(context.competitors))
                        : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {context && (
              <div>
                <Label>{strings.RESULT_OSM_TITLE}</Label>
                {result.score < 45 && (
                  <p className="text-xs mb-3 leading-snug" style={{ color: '#f87171' }}>
                    ⚠ {strings.RESULT_LOW_SCORE_WARNING}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { val: String(context.competitors),    lbl: strings.RESULT_OSM_COMPETITORS },
                    { val: String(context.totalBusinesses), lbl: strings.RESULT_OSM_BUSINESSES },
                    { val: String(context.busStops),       lbl: strings.RESULT_OSM_BUS_STOPS },
                    { val: String(context.groceryStores),  lbl: strings.RESULT_OSM_GROCERY },
                    { val: String(context.parking),        lbl: strings.RESULT_OSM_PARKING },
                    {
                      val: context.metroDistance !== null ? `${context.metroDistance}m` : '—',
                      lbl: strings.RESULT_OSM_METRO,
                    },
                  ].map(({ val, lbl }) => (
                    <div
                      key={lbl}
                      className="h-24 flex flex-col items-center justify-center px-2 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: 'rgba(241,245,249,0.9)' }}
                      >
                        {val}
                      </p>
                      <p
                        className="text-[10px] uppercase tracking-wide mt-1 text-center leading-tight"
                        style={{ color: 'rgba(100,116,139,0.7)' }}
                      >
                        {lbl}
                      </p>
                    </div>
                  ))}
                </div>
                {context.landUse && (
                  <p className="text-sm mt-3" style={{ color: '#fbbf24' }}>⚠ {context.landUse}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-3.5 text-xs uppercase tracking-[0.16em] font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            color: expanded ? 'rgba(0,201,138,0.7)' : 'rgba(0,201,138,0.55)',
            background: 'rgba(0,201,138,0.04)',
            borderTop: '1px solid rgba(0,201,138,0.1)',
            borderBottom: '1px solid rgba(0,201,138,0.1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00C98A')}
          onMouseLeave={e => (e.currentTarget.style.color = expanded ? 'rgba(0,201,138,0.7)' : 'rgba(0,201,138,0.55)')}
        >
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
          {expanded ? strings.RESULT_TOGGLE_COLLAPSE : strings.RESULT_TOGGLE_EXPAND}
        </button>

        {/* PDF Download */}
        <PdfDownloadButton
          business={business}
          result={result}
          context={context}
          label={strings.RESULT_PDF_DOWNLOAD}
        />
      </div>
    </div>
  )
}
