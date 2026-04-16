'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect, useMemo } from 'react'
import type { Strings } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { RadarChartDisplay, BarsChartDisplay, ScoreRingDisplay } from '@/components/Charts'
import { Monofett } from 'next/font/google'

interface Props {
  onStart: () => void
  strings: Strings
  lang: Lang
  onLangChange: (lang: Lang) => void
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG   = '#07090D'
const SURF = '#0D1218'
const ACC  = '#0051ff'
const MONO  = 'var(--font-space-mono)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

// ─── Terminal factor data ─────────────────────────────────────────────────────
const TERMINAL_FACTORS = [
  { label: 'Rəqabət',        score: 18, max: 22 },
  { label: 'Metro Trafiki',  score: 16, max: 20 },
  { label: 'Ərazi Tipi',     score: 13, max: 13 },
  { label: 'Şəhər Tipi',     score: 10, max: 10 },
  { label: 'Əlçatanlıq',     score:  9, max: 12 },
  { label: 'Yaxın Xidm.',    score:  7, max:  8 },
  { label: 'Bizn. Sıxlığı',  score:  7, max: 10 },
]
const TERMINAL_TOTAL = TERMINAL_FACTORS.reduce((s, f) => s + f.score, 0)

function RadarChart() { return <RadarChartDisplay factors={TERMINAL_FACTORS} accent={ACC} /> }
function BarsChart()  { return <BarsChartDisplay  factors={TERMINAL_FACTORS} accent={ACC} /> }
function ScoreRing()  { return <ScoreRingDisplay  factors={TERMINAL_FACTORS} total={TERMINAL_TOTAL} maxTotal={95} accent={ACC} /> }

// ─── Hero Cards (3 same-size cards: 1 left + 2 right stacked) ────────────────
function HeroCard({
  label,
  delay,
  prominent,
  children,
}: {
  label: string
  delay: number
  prominent?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0, 0, 1] }}
      style={{
        fontFamily: MONO,
        background: SURF,
        border: `1px solid rgba(0,201,138,${prominent ? 0.2 : 0.1})`,
        boxShadow: prominent
          ? '0 0 60px rgba(0,201,138,0.07), inset 0 0 40px rgba(0,0,0,0.3)'
          : '0 0 30px rgba(0,201,138,0.03)',
        borderRadius: '12px',
        overflow: 'hidden',
        width: '220px',
      }}
    >
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid rgba(0,201,138,0.12)', background: 'rgba(0,201,138,0.04)' }}
        className="px-4 py-2.5 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACC }} />
          <span className="text-[9px] tracking-[0.18em] uppercase" style={{ color: ACC }}>
            MYBLOCATE · ANALİZ
          </span>
        </div>
        <span className="text-[8px] tracking-[0.14em] uppercase" style={{ color: 'rgba(84, 119, 246, 0.4)' }}>
          {label}
        </span>
      </div>

      {/* Location */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="px-4 py-1.5">
        <p className="text-[10px] text-slate-300">Bakı, Nizami küçəsi 28</p>
        <p className="text-[9px] text-slate-600">40.3777°N · 49.8533°E</p>
      </div>

      {children}

      {/* Footer */}
      <div
        style={{ borderTop: '1px solid rgba(0,201,138,0.1)', background: 'rgba(0,201,138,0.025)' }}
        className="px-4 py-2.5 flex items-center justify-between"
      >
        <span className="text-[9px] tracking-[0.12em] uppercase text-slate-500">Ümumi Bal</span>
        <span className="text-base font-bold tabular-nums" style={{ color: ACC }}>
          {TERMINAL_TOTAL}
          <span className="text-xs text-slate-600 font-normal">/95</span>
        </span>
      </div>
    </motion.div>
  )
}

// Positions: [top-center (prominent), bottom-left, right]
const CARD_POSITIONS = [
  { top: 0,   left: 110, zIndex: 20 },
  { top: 155, left: 0,   zIndex: 10 },
  { top: 90,  left: 240, zIndex: 15 },
]

const CARD_DEFS = [
  { label: 'RADAR', content: () => <RadarChart /> },
  { label: 'BARS',  content: () => <BarsChart /> },
  { label: 'SCORE', content: () => <ScoreRing /> },
]

function HeroCards() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setOffset(o => (o + 1) % 3), 3400)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative select-none shrink-0"
      style={{ width: '460px', height: '510px' }}
    >
      {CARD_DEFS.map((card, i) => {
        const posIdx = (i + offset) % 3
        const pos = CARD_POSITIONS[posIdx]
        return (
          <motion.div
            key={card.label}
            initial={false}
            animate={{ top: pos.top, left: pos.left }}
            transition={{ duration: 0.85, ease: [0.25, 0, 0, 1] }}
            style={{ position: 'absolute', zIndex: pos.zIndex }}
          >
            <HeroCard label={card.label} delay={i * 0.15} prominent={posIdx === 0}>
              <card.content />
            </HeroCard>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Evaluation Carousel ───────────────────────────────────────────────────────
interface EvalCarouselProps {
  factors: { title: string; desc: string }[]
}

function EvalCarousel({ factors }: EvalCarouselProps) {
  const [[active, dir], setSlide] = useState<[number, number]>([0, 0])

  const paginate = (newDir: number) => {
    const next = (active + newDir + factors.length) % factors.length
    setSlide([next, newDir])
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 64 : -64, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -64 : 64, opacity: 0 }),
  }

  const f = factors[active]
  const tf = TERMINAL_FACTORS[active]
  const pct = Math.round((tf.score / tf.max) * 100)
  const num = String(active + 1).padStart(2, '0')

  return (
    <div>
      {/* Slide */}
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={active}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.25, 0, 0, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.25, 0, 0, 1] }}
              style={{
                background: SURF,
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '28px 28px 24px',
              }}
            >
              {/* Index + score inline */}
              <div className="flex items-start justify-between mb-4">
                <span
                  className="text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: ACC, fontFamily: MONO }}
                >
                  {num} — {f.title}
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: ACC, fontFamily: MONO }}>
                  {tf.score}/{tf.max}
                </span>
              </div>

              {/* Score bar */}
              <div className="h-[2px] w-full rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  key={`bar-${active}`}
                  className="h-full rounded-full"
                  style={{ background: ACC }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 0, 0, 1] }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-slate-100 mb-3"
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 'clamp(20px, 2.5vw, 28px)',
                  lineHeight: 1.15,
                  fontWeight: 400,
                }}
              >
                {f.title}
              </h3>

              {/* Description */}
              <p
                className="leading-relaxed"
                style={{
                  fontFamily: SANS,
                  fontSize: '14px',
                  color: 'rgba(226,232,240,0.5)',
                  fontWeight: 300,
                  minHeight: '80px',
                }}
              >
                {f.desc}
              </p>

              {/* Percentage badge */}
              <div className="mt-5 flex items-center gap-2">
                <div
                  className="h-px flex-1"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <span
                  className="text-[11px] tabular-nums"
                  style={{ color: 'rgba(255,255,255,0.2)', fontFamily: MONO }}
                >
                  {pct}%
                </span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => paginate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.4)',
            background: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {factors.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide([i, i > active ? 1 : -1])}
              style={{
                width: i === active ? '22px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === active ? ACC : 'rgba(255,255,255,0.14)',
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => paginate(1)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.4)',
            background: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Network SVG decoration (Mission section) ─────────────────────────────────
function NetworkDecoration() {
  const nodes: [number, number][] = [
    [120, 80], [260, 140], [420, 60], [540, 170], [680, 90],
    [340, 230], [190, 280], [500, 300], [80, 200],
  ]
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [5, 7], [0, 8], [3, 5],
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 760 360"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.18 }}
      >
        <defs>
          <radialGradient id="ngrd" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACC} stopOpacity="0.8" />
            <stop offset="100%" stopColor={ACC} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Edges */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]}
            x2={nodes[b][0]} y2={nodes[b][1]}
            stroke={ACC} strokeWidth="1"
            strokeDasharray="5 5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
          />
        ))}

        {/* Nodes */}
        {nodes.map(([x, y], i) => (
          <motion.g key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r="12" fill={ACC} opacity="0.06" />
            <circle cx={x} cy={y} r="4" fill={ACC} opacity={i === 1 ? 0.9 : 0.5} />
            {i === 1 && (
              <>
                <circle cx={x} cy={y} r="8" fill="none" stroke={ACC} strokeWidth="1" opacity="0.3" />
                <circle cx={x} cy={y} r="14" fill="none" stroke={ACC} strokeWidth="0.5" opacity="0.15" />
              </>
            )}
          </motion.g>
        ))}
      </svg>
    </div>
  )
}

// ─── Feedback form ────────────────────────────────────────────────────────────
function FeedbackForm({ strings }: { strings: Strings }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div
        className="rounded-xl p-10 text-center"
        style={{ background: `rgba(0,201,138,0.05)`, border: `1px solid rgba(0,201,138,0.2)` }}
      >
        <p className="text-xl font-medium mb-2" style={{ color: ACC, fontFamily: SANS }}>
          {strings.FEEDBACK_THANKS}
        </p>
        <p className="text-sm text-slate-500" style={{ fontFamily: SANS }}>{strings.FEEDBACK_SENT_MESSAGE}</p>
      </div>
    )
  }

  const inputCls: React.CSSProperties = {
    width: '100%',
    background: SURF,
    border: `1px solid rgba(255,255,255,0.07)`,
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#E2E8F0',
    fontSize: '14px',
    fontFamily: SANS,
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder={strings.FEEDBACK_NAME_PLACEHOLDER}
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputCls}
          onFocus={e => (e.target.style.borderColor = 'rgba(0,201,138,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
        />
        <input
          type="email"
          placeholder={strings.FEEDBACK_EMAIL_PLACEHOLDER}
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputCls}
          onFocus={e => (e.target.style.borderColor = 'rgba(0,201,138,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
        />
      </div>
      <textarea
        placeholder={strings.FEEDBACK_MESSAGE_PLACEHOLDER}
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={5}
        required
        style={{ ...inputCls, resize: 'none' }}
        onFocus={e => (e.target.style.borderColor = 'rgba(0,201,138,0.4)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
      />
      {status === 'error' && (
        <p className="text-xs text-red-400" style={{ fontFamily: SANS }}>
          {strings.FEEDBACK_ERROR}
        </p>
      )}
      <motion.button
        type="submit"
        disabled={status === 'sending' || !message.trim()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        style={{
          width: '100%',
          padding: '13px 24px',
          borderRadius: '8px',
          fontFamily: SANS,
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.02em',
          background: ACC,
          color: '#07090D',
          border: 'none',
          cursor: 'pointer',
          opacity: (status === 'sending' || !message.trim()) ? 0.4 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {status === 'sending' ? strings.FEEDBACK_SENDING : strings.FEEDBACK_SEND}
      </motion.button>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage({ onStart, strings, lang, onLangChange }: Props) {
  const missionRef = useRef<HTMLElement>(null)
  const { scrollY } = useScroll()
  const { scrollYProgress } = useScroll({
    target: missionRef,
    offset: ['start end', 'end start'],
  })

  const navBg = useTransform(scrollY, [0, 80], ['rgba(7,9,13,0)', 'rgba(7,9,13,0.96)'])
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(0,201,138,0)', 'rgba(0,201,138,0.12)'])
  const imageY = useTransform(scrollYProgress, [0, 0.5], [40, -40])

  const navLinks = [
    { id: 'hero',    label: strings.NAV_HOME },
    { id: 'mission', label: strings.NAV_MISSION },
    { id: 'scoring', label: strings.NAV_SCORING },
    { id: 'contact', label: strings.NAV_CONTACT },
  ]

  const evalFactors = useMemo(() => [
    { title: strings.LANDING_SCORE_COMPETITION,      desc: strings.LANDING_SCORE_DESC_COMPETITION },
    { title: strings.LANDING_SCORE_FOOT_TRAFFIC,     desc: strings.LANDING_SCORE_DESC_FOOT_TRAFFIC },
    { title: strings.LANDING_SCORE_AREA_TYPE,        desc: strings.LANDING_SCORE_DESC_AREA_TYPE },
    { title: strings.LANDING_SCORE_URBAN_TIER,       desc: strings.LANDING_SCORE_DESC_URBAN_TIER },
    { title: strings.LANDING_SCORE_ACCESSIBILITY,    desc: strings.LANDING_SCORE_DESC_ACCESSIBILITY },
    { title: strings.LANDING_SCORE_NEARBY_SERVICES,  desc: strings.LANDING_SCORE_DESC_NEARBY_SERVICES },
    { title: strings.LANDING_SCORE_BUSINESS_DENSITY, desc: strings.LANDING_SCORE_DESC_BUSINESS_DENSITY },
  ], [strings])

  const howSteps = useMemo(() => [
    {
      num: '01',
      title: strings.LANDING_HOW_STEP1_TITLE,
      desc:  strings.LANDING_HOW_STEP1_DESC,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
    },
    {
      num: '02',
      title: strings.LANDING_HOW_STEP2_TITLE,
      desc:  strings.LANDING_HOW_STEP2_DESC,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M8 12h8M8 8h5"/>
        </svg>
      ),
    },
    {
      num: '03',
      title: strings.LANDING_HOW_STEP3_TITLE,
      desc:  strings.LANDING_HOW_STEP3_DESC,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
  ], [strings])

  const pillars = useMemo(() => [
    { title: strings.LANDING_PILLAR1_TITLE, desc: strings.LANDING_PILLAR1_DESC, num: '4,589' },
    { title: strings.LANDING_PILLAR2_TITLE, desc: strings.LANDING_PILLAR2_DESC, num: '27' },
    { title: strings.LANDING_PILLAR3_TITLE, desc: strings.LANDING_PILLAR3_DESC, num: 'AI' },
  ], [strings])

  return (
    <div style={{ background: BG, fontFamily: SANS }} className="min-h-screen text-slate-200 overflow-y-auto scroll-smooth">

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <motion.nav
        style={{ backgroundColor: navBg, borderBottomColor: navBorder }}
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
      >
        <div className="px-6 sm:px-10 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="myblocate" className="h-9 w-auto" />

          <div className="hidden sm:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-[15px] font-medium transition-colors duration-200 text-slate-400 hover:text-slate-100"
                style={{ fontFamily: SANS }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[11px] tracking-widest" style={{ fontFamily: MONO }}>
            <button
              onClick={() => onLangChange('az')}
              className="transition-colors duration-200"
              style={{ color: lang === 'az' ? ACC : 'rgba(255,255,255,0.3)' }}
            >
              AZ
            </button>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
            <button
              onClick={() => onLangChange('en')}
              className="transition-colors duration-200"
              style={{ color: lang === 'en' ? ACC : 'rgba(255,255,255,0.3)' }}
            >
              EN
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 75% 40%, rgba(0,201,138,0.07) 0%, transparent 65%),
              radial-gradient(ellipse 50% 70% at 20% 80%, rgba(0,201,138,0.04) 0%, transparent 60%)
            `,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.013) 2px, rgba(255,255,255,0.013) 3px)',
          }}
        />
        <div
          className="absolute right-0 bottom-0 leading-none select-none pointer-events-none"
          style={{
            fontSize: 'clamp(200px, 30vw, 400px)',
            fontFamily: MONO,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.022)',
            lineHeight: 1,
            transform: 'translate(5%, 15%)',
          }}
        >
          95
        </div>

        <div className="relative z-10 w-full px-6 sm:px-10 pt-24 pb-16">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

            {/* Left */}
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="flex items-center gap-3 mb-7"
              >
                <img src="/logo.png" alt="myblocate" className="h-8 w-auto" />
                <span
                  style={{
                    fontFamily: SERIF,
                    fontStyle: 'bold',
                    fontSize: '26px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  myblocate
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0, 0, 1] }}
                className="text-slate-50 mb-6"
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 'clamp(38px, 5.5vw, 72px)',
                  lineHeight: 1.08,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                }}
              >
                {strings.LANDING_DESCRIPTION}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="text-[14px] leading-relaxed mb-10 max-w-sm"
                style={{ color: 'rgba(226,232,240,0.48)', fontFamily: SANS, fontWeight: 300 }}
              >
                {strings.LANDING_DISCLAIMER}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              >
                <motion.button
                  onClick={onStart}
                  whileHover={{ backgroundColor: ACC, color: BG }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center text-slate-100 cursor-pointer"
                  style={{
                    fontFamily: SANS,
                    fontSize: '17px',
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                    padding: '18px 48px',
                    border: `1px solid ${ACC}`,
                    borderRadius: '8px',
                    background: 'transparent',
                    transition: 'background-color 0.25s, color 0.25s',
                  }}
                >
                  {strings.LANDING_CTA}
                </motion.button>
              </motion.div>
            </div>

            {/* Right: 3-card layout */}
            <div className="shrink-0 flex justify-center lg:justify-end w-full lg:w-auto">
              <HeroCards />
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, ${BG})` }}
        />
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section className="py-10 px-6 sm:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {[
              { value: '7',     label: lang === 'az' ? 'Analiz Amili'        : 'Analysis Factors' },
              { value: '4,589', label: lang === 'az' ? 'Yaşayış Məntəqəsi'   : 'Settlements' },
              { value: '27',    label: lang === 'az' ? 'Metro Stansiyası'     : 'Metro Stations' },
              { value: 'AI',    label: lang === 'az' ? 'Dəstəkli Analiz'      : 'Powered Analysis' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="text-center"
              >
                <p
                  className="text-3xl font-light mb-1"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', color: ACC }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[11px] tracking-[0.14em] uppercase"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 sm:px-10 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="absolute -top-8 -left-4 select-none pointer-events-none leading-none"
          style={{
            fontSize: 'clamp(120px, 18vw, 220px)',
            fontFamily: MONO,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.025)',
          }}
        >
          00
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-14"
          >
            <span className="w-8 h-px" style={{ background: ACC }} />
            <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: ACC, fontFamily: MONO }}>
              {strings.LANDING_HOW_TITLE}
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.25, 0, 0, 1] }}
                style={{
                  background: SURF,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="absolute -bottom-3 -right-2 leading-none select-none pointer-events-none"
                  style={{
                    fontSize: '80px',
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: 'rgba(0,201,138,0.05)',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(0,201,138,0.1)', color: ACC }}
                >
                  {step.icon}
                </div>

                <span
                  className="text-[9px] tracking-[0.2em] uppercase mb-3 block"
                  style={{ color: ACC, fontFamily: MONO }}
                >
                  {step.num}
                </span>

                <h3
                  className="text-[17px] font-medium text-slate-100 mb-2"
                  style={{ fontFamily: SANS }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(226,232,240,0.45)', fontFamily: SANS, fontWeight: 300 }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ─────────────────────────────────────────────────────────── */}
      <section
        ref={missionRef}
        id="mission"
        className="relative py-28 px-6 sm:px-10 overflow-hidden"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Network decoration */}
        <NetworkDecoration />

        <div
          className="absolute -top-8 -left-4 select-none pointer-events-none leading-none"
          style={{
            fontSize: 'clamp(120px, 18vw, 220px)',
            fontFamily: MONO,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.025)',
          }}
        >
          01
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-12"
          >
            <span className="w-8 h-px" style={{ background: ACC }} />
            <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: ACC, fontFamily: MONO }}>
              {strings.NAV_MISSION}
            </span>
          </motion.div>

          {/* Phone + text */}
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-20 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, ease: [0.25, 0, 0, 1] }}
              style={{ y: imageY }}
              className="shrink-0"
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 60%, rgba(0,201,138,0.12) 0%, transparent 70%)`,
                    filter: 'blur(30px)',
                    transform: 'scale(1.2)',
                  }}
                />
                <img
                  src="/phone-mockup.png"
                  alt="myblocate app preview"
                  style={{ width: '260px', height: 'auto', position: 'relative', zIndex: 1 }}
                  className="drop-shadow-2xl"
                />
              </div>
            </motion.div>

            <div className="flex-1">
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, ease: [0.25, 0, 0, 1] }}
                className="text-slate-50 mb-5"
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 'clamp(30px, 3.8vw, 50px)',
                  lineHeight: 1.12,
                  fontWeight: 400,
                }}
              >
                {strings.LANDING_MISSION_TITLE}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0, 0, 1] }}
                className="text-[15px] leading-relaxed"
                style={{ color: 'rgba(226,232,240,0.55)', fontFamily: SANS, fontWeight: 300 }}
              >
                {strings.LANDING_MISSION_TEXT}
              </motion.p>
            </div>
          </div>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.25, 0, 0, 1] }}
                style={{
                  background: SURF,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '22px 24px',
                }}
              >
                <p
                  className="text-2xl font-light mb-2"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', color: ACC }}
                >
                  {p.num}
                </p>
                <h4
                  className="text-[14px] font-medium text-slate-200 mb-1.5"
                  style={{ fontFamily: SANS }}
                >
                  {p.title}
                </h4>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'rgba(226,232,240,0.4)', fontFamily: SANS, fontWeight: 300 }}
                >
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we evaluate ────────────────────────────────────────────────── */}
      <section
        id="scoring"
        className="relative py-28 px-6 sm:px-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="absolute -top-8 -left-4 select-none pointer-events-none leading-none"
          style={{
            fontSize: 'clamp(120px, 18vw, 220px)',
            fontFamily: MONO,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.025)',
          }}
        >
          02
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-12"
          >
            <span className="w-8 h-px" style={{ background: ACC }} />
            <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: ACC, fontFamily: MONO }}>
              {strings.NAV_SCORING}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-slate-50 mb-3"
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 400,
              lineHeight: 1.15,
            }}
          >
            {strings.LANDING_SCORE_TITLE}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[15px] mb-12"
            style={{ color: 'rgba(226,232,240,0.45)', fontFamily: SANS, fontWeight: 300 }}
          >
            {strings.LANDING_SCORE_SUBTITLE}
          </motion.p>

          {/* ── Carousel replaces static list ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <EvalCarousel factors={evalFactors} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-[11px] mt-10"
            style={{ color: 'rgba(255,255,255,0.2)', fontFamily: MONO }}
          >
            {strings.LANDING_SCORE_FOOTNOTE}
          </motion.p>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="relative py-28 px-6 sm:px-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="absolute -top-8 -left-4 select-none pointer-events-none leading-none"
          style={{
            fontSize: 'clamp(120px, 18vw, 220px)',
            fontFamily: MONO,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.025)',
          }}
        >
          03
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-12"
          >
            <span className="w-8 h-px" style={{ background: ACC }} />
            <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: ACC, fontFamily: MONO }}>
              {strings.NAV_CONTACT}
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7 }}
            >
              <h2
                className="text-slate-50 mb-4"
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 'clamp(28px, 3.5vw, 48px)',
                  fontWeight: 400,
                  lineHeight: 1.15,
                }}
              >
                {strings.LANDING_CONTACT_TITLE}
              </h2>
              <p
                className="text-[15px] leading-relaxed mb-10"
                style={{ color: 'rgba(226,232,240,0.45)', fontFamily: SANS, fontWeight: 300 }}
              >
                {strings.LANDING_CONTACT_REACH_DESC}
              </p>

              <div className="space-y-5">
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                  <p className="text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>
                    {strings.LANDING_CONTACT_EMAIL_LABEL}
                  </p>
                  <a
                    href={`mailto:${strings.LANDING_CONTACT_EMAIL}`}
                    className="text-[15px] font-medium transition-colors duration-200 hover:text-white"
                    style={{ color: ACC, fontFamily: SANS }}
                  >
                    {strings.LANDING_CONTACT_EMAIL}
                  </a>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>
                    {strings.LANDING_CONTACT_RESPONSE}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACC }} />
                    <p className="text-[14px]" style={{ color: 'rgba(226,232,240,0.5)', fontFamily: SANS, fontWeight: 300 }}>
                      {lang === 'az' ? '24 saat ərzində cavab veririk' : 'We respond within 24 hours'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <p
                className="text-[14px] mb-6"
                style={{ color: 'rgba(226,232,240,0.4)', fontFamily: SANS, fontWeight: 300 }}
              >
                {strings.LANDING_CONTACT_SUBTITLE}
              </p>
              <FeedbackForm strings={strings} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-6 sm:px-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="myblocate" className="h-6 w-auto opacity-50" />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: MONO }}>
              © 2025 MYBLOCATE
            </span>
          </div>
          <a
            href={`mailto:${strings.LANDING_CONTACT_EMAIL}`}
            className="text-[11px] transition-colors duration-200 hover:text-slate-400"
            style={{ color: 'rgba(255,255,255,0.18)', fontFamily: MONO }}
          >
            {strings.LANDING_CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  )
}
