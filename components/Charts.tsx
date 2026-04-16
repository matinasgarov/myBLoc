'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const MONO = 'var(--font-space-mono)'

export interface ChartFactor {
  label: string
  score: number
  max: number
}

// ─── Counter hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(eased * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return val
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
export function RadarChartDisplay({ factors, accent }: { factors: ChartFactor[]; accent: string }) {
  const N = factors.length
  const CX = 90, CY = 92, R = 68

  const getXY = (i: number, ratio: number): [number, number] => {
    const angle = ((i / N) * 2 * Math.PI) - Math.PI / 2
    return [
      CX + ratio * R * Math.cos(angle),
      CY + ratio * R * Math.sin(angle),
    ]
  }

  const toPoints = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

  const rings = [0.33, 0.67, 1.0]
  const scorePts = factors.map((f, i) => getXY(i, f.score / f.max))

  return (
    <div className="flex items-center justify-center py-1">
      <svg width="186" height="190" viewBox="0 0 186 190">
        {rings.map((r, ri) => (
          <polygon
            key={ri}
            points={toPoints(factors.map((_, i) => getXY(i, r)))}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}
        {factors.map((_, i) => {
          const [x, y] = getXY(i, 1.0)
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        })}
        <motion.polygon
          points={toPoints(scorePts)}
          fill={`${accent}28`}
          stroke={accent}
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, ease: [0.25, 0, 0, 1] }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
        {scorePts.map(([x, y], i) => (
          <motion.circle
            key={i} cx={x} cy={y} r="3.5" fill={accent}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
        {factors.map((f, i) => {
          const [lx, ly] = getXY(i, 1.32)
          const short = f.label.length > 9 ? f.label.slice(0, 8) + '…' : f.label
          return (
            <text key={i} x={lx} y={ly}
              textAnchor="middle" dominantBaseline="middle"
              fill="rgba(148,163,184,0.55)"
              fontSize="7.5"
              fontFamily="monospace"
            >
              {short}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Bars Chart ───────────────────────────────────────────────────────────────
export function BarsChartDisplay({ factors, accent }: { factors: ChartFactor[]; accent: string }) {
  return (
    <div className="px-3 py-4 space-y-3">
      {factors.map((f, i) => {
        const pct = (f.score / f.max) * 100
        const label = f.label.length > 11 ? f.label.slice(0, 10) + '…' : f.label
        return (
          <div key={f.label} className="flex items-center gap-2.5">
            <span className="text-[9.5px] shrink-0 w-[76px] truncate"
              style={{ color: 'rgba(148,163,184,0.6)', fontFamily: 'monospace' }}>
              {label}
            </span>
            <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, delay: 0.08 + i * 0.07, ease: [0.25, 0, 0, 1] }}
              />
            </div>
            <motion.span
              className="text-[9px] tabular-nums shrink-0"
              style={{ color: accent, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.07 }}
            >
              {f.score}/{f.max}
            </motion.span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
export function ScoreRingDisplay({ factors, total, maxTotal, accent }: {
  factors: ChartFactor[]
  total: number
  maxTotal: number
  accent: string
}) {
  const count = useCountUp(total, 1400, 150)
  const R = 50
  const circ = 2 * Math.PI * R

  return (
    <div className="flex flex-col items-center justify-center py-3 gap-3">
      <div className="relative">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx={66} cy={66} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
          <motion.circle
            cx={66} cy={66} r={R}
            fill="none" stroke={accent} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={circ}
            style={{ rotate: -90, transformOrigin: '66px 66px' }}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (total / maxTotal) * circ }}
            transition={{ duration: 1.5, delay: 0.2, ease: [0.25, 0, 0, 1] }}
          />
          {[0.33, 0.66, 1.0].map((ratio, idx) => {
            const angle = -Math.PI / 2 + ratio * 2 * Math.PI
            const r1 = R - 5, r2 = R + 5
            return (
              <line key={idx}
                x1={66 + r1 * Math.cos(angle)} y1={66 + r1 * Math.sin(angle)}
                x2={66 + r2 * Math.cos(angle)} y2={66 + r2 * Math.sin(angle)}
                stroke="rgba(255,255,255,0.12)" strokeWidth="1"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold tabular-nums leading-none" style={{ color: accent, fontFamily: MONO }}>
            {count}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>/{maxTotal}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 w-full px-1">
        {factors.map((f, i) => (
          <motion.div
            key={f.label}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.05)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.06 }}
          >
            <span className="text-[8.5px] truncate" style={{ color: 'rgba(148,163,184,0.55)', fontFamily: 'monospace' }}>
              {f.label}
            </span>
            <span className="text-[9px] tabular-nums ml-1 shrink-0" style={{ color: accent, fontFamily: 'monospace' }}>
              {f.score}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
