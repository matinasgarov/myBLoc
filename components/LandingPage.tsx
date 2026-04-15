'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useRef, useEffect, useMemo } from 'react'
import type { Strings } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface Props {
  onStart: () => void
  strings: Strings
  lang: Lang
  onLangChange: (lang: Lang) => void
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG   = '#07090D'
const SURF = '#0D1218'
const ACC  = '#00C98A'
const MONO  = 'var(--font-space-mono)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

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

// ─── Live analysis terminal (hero right panel) ────────────────────────────────
const TERMINAL_FACTORS = [
  { label: 'Rəqabət',        score: 18, max: 22 },
  { label: 'Metro Trafiyi',  score: 16, max: 20 },
  { label: 'Ərazi Tipi',     score: 13, max: 13 },
  { label: 'Şəhər Tipi',     score: 10, max: 10 },
  { label: 'Əlçatanlıq',     score:  9, max: 12 },
  { label: 'Yaxın Xidm.',    score:  7, max:  8 },
  { label: 'Bizn. Sıxlığı',  score:  7, max: 10 },
]
const TERMINAL_TOTAL = TERMINAL_FACTORS.reduce((s, f) => s + f.score, 0)

function AnalysisTerminal() {
  const total = useCountUp(TERMINAL_TOTAL, 1600, 600)

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.25, 0, 0, 1] }}
      style={{
        fontFamily: MONO,
        background: SURF,
        border: `1px solid rgba(0,201,138,0.18)`,
        boxShadow: `0 0 60px rgba(0,201,138,0.06), inset 0 0 40px rgba(0,0,0,0.3)`,
      }}
      className="rounded-xl overflow-hidden w-full max-w-[340px] select-none"
    >
      {/* Terminal header */}
      <div
        style={{ borderBottom: `1px solid rgba(0,201,138,0.12)`, background: 'rgba(0,201,138,0.04)' }}
        className="px-4 py-2.5 flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full" style={{ background: ACC }} />
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: ACC }}>
          MYBLOCATE · ANALİZ SİSTEMİ
        </span>
      </div>

      {/* Location */}
      <div style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }} className="px-4 py-2">
        <p className="text-[11px] text-slate-300">Bakı, Nizami küçəsi 28</p>
        <p className="text-[10px] text-slate-600">40.3777°N · 49.8533°E</p>
      </div>

      {/* Factor rows */}
      <div className="px-4 py-3 space-y-2.5">
        {TERMINAL_FACTORS.map((f, i) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 shrink-0 w-[88px] truncate">{f.label}</span>
            <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: ACC }}
                initial={{ width: '0%' }}
                animate={{ width: `${(f.score / f.max) * 100}%` }}
                transition={{ duration: 1.0, delay: 0.8 + i * 0.08, ease: [0.25, 0, 0, 1] }}
              />
            </div>
            <motion.span
              className="text-[10px] tabular-nums shrink-0"
              style={{ color: ACC }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 + i * 0.08 }}
            >
              {f.score}/{f.max}
            </motion.span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div
        style={{ borderTop: `1px solid rgba(0,201,138,0.12)`, background: 'rgba(0,201,138,0.03)' }}
        className="px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.12em] uppercase text-slate-500">Ümumi Bal</span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: ACC, fontFamily: MONO }}>
            {total}
            <span className="text-sm text-slate-600 font-normal">/95</span>
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] tracking-[0.12em] uppercase text-slate-500">Qiymətləndirmə</span>
          <motion.span
            className="text-[10px] tracking-[0.1em] font-medium"
            style={{ color: ACC }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            ƏLVERIŞLI ▲
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Evaluation row (no scores shown) ────────────────────────────────────────
interface EvalRowProps {
  index: number
  title: string
  desc: string
  delay: number
}

function EvalRow({ index, title, desc, delay }: EvalRowProps) {
  const num = String(index + 1).padStart(2, '0')
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0, 0, 1] }}
      className="group relative"
    >
      <div style={{ background: 'rgba(255,255,255,0.05)' }} className="h-px w-full" />
      <div className="flex gap-6 py-6 items-start">
        <span
          className="text-xs tabular-nums shrink-0 mt-0.5 w-6"
          style={{ fontFamily: MONO, color: ACC }}
        >
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium text-slate-100 mb-1" style={{ fontFamily: SANS }}>
            {title}
          </h3>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'rgba(226,232,240,0.45)', fontFamily: SANS, fontWeight: 300 }}
          >
            {desc}
          </p>
          <div className="mt-4 h-px w-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              className="h-full"
              style={{ background: ACC, originX: 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.25, 0, 0, 1] }}
            />
          </div>
        </div>
      </div>
    </motion.div>
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
              {/* myblocate wordmark */}
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
                    fontStyle: 'italic',
                    fontSize: '26px',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  myblocate
                </span>
              </motion.div>

              {/* Headline */}
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

              {/* Disclaimer */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="text-[14px] leading-relaxed mb-10 max-w-sm"
                style={{ color: 'rgba(226,232,240,0.48)', fontFamily: SANS, fontWeight: 300 }}
              >
                {strings.LANDING_DISCLAIMER}
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              >
                <motion.button
                  onClick={onStart}
                  whileHover={{ backgroundColor: ACC, color: BG }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-3 text-slate-100 cursor-pointer"
                  style={{
                    fontFamily: SANS,
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    padding: '14px 28px',
                    border: `1px solid ${ACC}`,
                    borderRadius: '6px',
                    background: 'transparent',
                    transition: 'background-color 0.25s, color 0.25s',
                  }}
                >
                  {strings.LANDING_CTA}
                  <span>→</span>
                </motion.button>
              </motion.div>
            </div>

            {/* Right: live analysis terminal */}
            <div className="shrink-0 flex justify-center lg:justify-end w-full lg:w-auto">
              <AnalysisTerminal />
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
                {/* Ghost step number */}
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

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(0,201,138,0.1)', color: ACC }}
                >
                  {step.icon}
                </div>

                {/* Step number pill */}
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

          <div>
            {evalFactors.map((f, i) => (
              <EvalRow
                key={f.title}
                index={i}
                title={f.title}
                desc={f.desc}
                delay={i * 0.07}
              />
            ))}
            <div style={{ background: 'rgba(255,255,255,0.05)' }} className="h-px w-full" />
          </div>

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
            {/* Left: contact info */}
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

              {/* Info items */}
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

            {/* Right: feedback form */}
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
