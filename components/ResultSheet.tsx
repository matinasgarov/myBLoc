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
  if (score >= 70) return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/30' }
  if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-400/10', ring: 'ring-amber-500/30' }
  return { text: 'text-red-400', bg: 'bg-red-400/10', ring: 'ring-red-500/30' }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-slate-500 text-xs uppercase tracking-widest mb-3 font-medium">{children}</p>
  )
}

interface BarProps { label: string; value: number; max: number; note?: string }
function ScoreBar({ label, value, max, note }: BarProps) {
  const pct = Math.round((value / max) * 100)
  const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const trackColor = pct < 40 ? 'bg-red-950' : 'bg-slate-800'
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-36 shrink-0">{label}</span>
      <div className={`flex-1 h-1 ${trackColor} rounded-full overflow-hidden`}>
        {pct > 0 && <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />}
      </div>
      <span className="text-slate-400 text-sm text-right shrink-0 tabular-nums font-medium">
        {value}/{max}{note ? <span className="text-slate-600 text-xs ml-1">· {note}</span> : null}
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
  const score = scoreColor(result.score)

  const analysisBullets = [result.detail, result.verdict]
    .filter(Boolean)
    .join(' ')
    .split(/[•\n]+/)
    .flatMap(chunk => chunk.split(/(?<=\.)\s+(?=[A-ZÁƏÖÜĞŞÇI])/))
    .map(s => s.trim().replace(/^[•\-–—]\s*/, ''))
    .filter(s => s.length > 10)

  return (
    <div
      style={{ height: expanded ? '72vh' : '58vh' }}
      className="flex flex-col bg-slate-950 border-t border-slate-800 overflow-hidden transition-all duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-8 py-5 border-b border-slate-800 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">{strings.RESULT_BUSINESS_TYPE}</p>
          <h2 className="text-white font-bold text-lg tracking-tight truncate">{business}</h2>
        </div>

        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl ring-1 ${score.bg} ${score.ring}`}>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">{strings.RESULT_PROBABILITY}</p>
            <span className={`text-3xl font-bold tabular-nums ${score.text}`}>{result.score}%</span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="text-slate-600 hover:text-white transition-colors text-lg ml-1 shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Reset strip — always visible without scrolling */}
      <button
        onClick={onReset}
        className="shrink-0 w-full py-2.5 text-xs text-slate-400 hover:text-emerald-400 bg-slate-900/40 hover:bg-slate-900 border-b border-slate-800/60 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest font-medium"
      >
        ↩ {strings.RESULT_RESET}
      </button>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Luxury mismatch warning */}
        {result.luxuryMismatch && (
          <div className="px-8 py-3 bg-amber-950/70 border-b border-amber-900/50 shrink-0">
            <p className="text-amber-400 text-sm font-medium">
              ⚠ {strings.WARN_LUXURY_MISMATCH}
            </p>
          </div>
        )}

        {/* Dominant competitor warning */}
        {context?.dominantCompetitor && (
          <div className="px-8 py-3 bg-red-950/70 border-b border-red-900/50 shrink-0">
            <p className="text-red-400 text-sm font-medium">
              {strings.WARN_DOMINANT_COMPETITOR
                .replace('{name}', context.dominantCompetitor.name)
                .replace('{dist}', String(context.dominantCompetitor.distance))}
            </p>
          </div>
        )}

        {/* Summary */}
        {result.summary && (
          <div className="px-8 py-5 border-b border-slate-800/60">
            <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
          </div>
        )}

        {/* Pros / Cons */}
        <div className="grid grid-cols-2 border-b border-slate-800/60">
          <div className="px-8 py-6 border-r border-slate-800/60">
            <Label>{strings.RESULT_PROS}</Label>
            <ul className="space-y-3">
              {result.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 leading-snug">
                  <span className="text-emerald-400 shrink-0 font-bold mt-px">+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-8 py-6">
            <Label>{strings.RESULT_CONS}</Label>
            <ul className="space-y-3">
              {result.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 leading-snug">
                  <span className="text-red-400 shrink-0 font-bold mt-px">—</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Expandable ───────────────────────────────── */}
        {expanded && (
          <div className="px-8 py-6 space-y-8 border-b border-slate-800/60">

            {analysisBullets.length > 0 && (
              <div>
                <Label>{strings.RESULT_ANALYSIS}</Label>
                <ul className="space-y-2.5">
                  {analysisBullets.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400 leading-relaxed">
                      <span className="text-emerald-600 shrink-0 mt-px font-bold">•</span>
                      <span>{point}</span>
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
                      note={f.key === 'competition' && context ? strings.RESULT_COMPETITORS_NOTE.replace('{n}', String(context.competitors)) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {context && (
              <div>
                <Label>{strings.RESULT_OSM_TITLE}</Label>
                {result.score < 45 && (
                  <p className="text-red-400 text-xs mb-3 leading-snug">
                    ⚠ {strings.RESULT_LOW_SCORE_WARNING}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: String(context.competitors), lbl: strings.RESULT_OSM_COMPETITORS },
                    { val: String(context.totalBusinesses), lbl: strings.RESULT_OSM_BUSINESSES },
                    { val: String(context.busStops), lbl: strings.RESULT_OSM_BUS_STOPS },
                    { val: String(context.groceryStores), lbl: strings.RESULT_OSM_GROCERY },
                    { val: String(context.parking), lbl: strings.RESULT_OSM_PARKING },
                    {
                      val: context.metroDistance !== null ? `${context.metroDistance}m` : '—',
                      lbl: strings.RESULT_OSM_METRO,
                    },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="bg-slate-900 border border-slate-800 rounded-xl h-24 flex flex-col items-center justify-center px-2">
                      <p className="text-white text-2xl font-bold tabular-nums">{val}</p>
                      <p className="text-slate-500 text-xs uppercase tracking-wide mt-1 text-center leading-tight">{lbl}</p>
                    </div>
                  ))}
                </div>
                {context.landUse && (
                  <p className="text-amber-400/80 text-sm mt-3">⚠ {context.landUse}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-4 text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-950 border-y border-emerald-900/50 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest font-semibold"
        >
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
