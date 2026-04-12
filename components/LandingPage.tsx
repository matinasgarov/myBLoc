'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useMemo, useRef } from 'react'
import type { Strings } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface Props {
  onStart: () => void
  strings: Strings
  lang: Lang
  onLangChange: (lang: Lang) => void
}

function FloatingPaths({ position }: { position: number }) {
  const paths = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
          380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
          152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
          684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
        duration: 20 + Math.random() * 10,
      })),
    [position]
  )

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

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
      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-10 text-center">
        <p className="text-emerald-400 text-2xl font-bold mb-2">{strings.FEEDBACK_THANKS}</p>
        <p className="text-slate-400">{strings.FEEDBACK_SENT_MESSAGE}</p>
      </div>
    )
  }

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-slate-500 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder={strings.FEEDBACK_NAME_PLACEHOLDER}
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputCls}
        />
        <input
          type="email"
          placeholder={strings.FEEDBACK_EMAIL_PLACEHOLDER}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={inputCls}
        />
      </div>
      <textarea
        placeholder={strings.FEEDBACK_MESSAGE_PLACEHOLDER}
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={5}
        required
        className={`${inputCls} resize-none`}
      />
      {status === 'error' && (
        <p className="text-red-400 text-sm">{strings.FEEDBACK_ERROR}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending' || !message.trim()}
        className="w-full py-3.5 rounded-xl font-semibold text-sm bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'sending' ? strings.FEEDBACK_SENDING : strings.FEEDBACK_SEND}
      </button>
    </form>
  )
}


export default function LandingPage({ onStart, strings, lang, onLangChange }: Props) {
  const brandLetters = 'myblocate'.split('')
  const missionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: missionRef,
    offset: ['start end', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 0.3], [80, 0])
  const imageOpacity = useTransform(scrollYProgress, [0.55, 0.9], [1, 0])

  const navLinks = [
    { id: 'hero', label: strings.NAV_HOME },
    { id: 'mission', label: strings.NAV_MISSION },
    { id: 'scoring', label: strings.NAV_SCORING },
    { id: 'contact', label: strings.NAV_CONTACT },
  ]

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-950 text-white scroll-smooth">
      {/* Navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="px-8 h-14 flex items-center relative">
          {/* Logo — absolute left */}
          <img src="/logo.png" alt="myblocate" className="h-10 w-auto absolute left-8" />
          {/* Nav links — centered */}
          <div className="flex items-center gap-6 mx-auto">
            {navLinks.map(link => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-base text-slate-400 hover:text-white transition-colors hidden sm:block"
              >
                {link.label}
              </a>
            ))}
          </div>
          {/* Lang switcher — absolute right */}
          <div className="flex gap-0.5 bg-white/8 rounded-full p-0.5 absolute right-8">
            <button
              onClick={() => onLangChange('az')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors leading-none ${
                lang === 'az' ? 'bg-white text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              AZ
            </button>
            <button
              onClick={() => onLangChange('en')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors leading-none ${
                lang === 'en' ? 'bg-white text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
              {brandLetters.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: i * 0.05,
                    type: 'spring',
                    stiffness: 150,
                    damping: 25,
                  }}
                  className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80"
                >
                  {letter}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg sm:text-xl text-slate-300 mb-3 max-w-md mx-auto"
            >
              {strings.LANDING_DESCRIPTION}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-sm text-slate-500 mb-10 max-w-sm mx-auto"
            >
              {strings.LANDING_DISCLAIMER}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="inline-block group relative bg-gradient-to-b from-white/10 to-black/10 p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <motion.button
                onClick={onStart}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-[1.15rem] px-8 py-4 text-lg font-semibold backdrop-blur-md bg-white/95 hover:bg-white text-slate-950 transition-all duration-300 group-hover:-translate-y-0.5 border border-white/10 hover:shadow-md cursor-pointer"
              >
                <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                  {strings.LANDING_CTA}
                </span>
                <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300 inline-block">
                  &rarr;
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Mission section */}
      <section ref={missionRef} id="mission" className="py-24 px-6 overflow-visible relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Image side — LEFT, bleeds into adjacent sections */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{ y: imageY, opacity: imageOpacity }}
            className="shrink-0 flex justify-center md:justify-start -my-96 relative z-10"
          >
            <img
              src="/phone-mockup.png"
              alt="myblocate app preview"
              style={{ width: '360px', height: 'auto' }}
              className="drop-shadow-2xl"
            />
          </motion.div>

          {/* Text side — RIGHT */}
          <div className="flex-1 text-center md:text-left">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl font-bold mb-6 text-white"
            >
              {strings.LANDING_MISSION_TITLE}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-400 text-lg leading-relaxed"
            >
              {strings.LANDING_MISSION_TEXT}
            </motion.p>
          </div>
        </div>
      </section>

      {/* How score is calculated */}
      <section id="scoring" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold mb-4 text-white text-center"
          >
            {strings.LANDING_SCORE_TITLE}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-slate-400 text-center mb-12"
          >
            {strings.LANDING_SCORE_SUBTITLE}
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              {
                title: strings.LANDING_SCORE_COMPETITION,
                sub: strings.LANDING_SCORE_COMPETITION_SUB,
                icon: '🏪',
                color: 'from-emerald-500/15 to-transparent',
                border: 'border-emerald-500/20 hover:border-emerald-500/40',
                accent: 'text-emerald-400',
                desc: strings.LANDING_SCORE_DESC_COMPETITION,
              },
              {
                title: strings.LANDING_SCORE_FOOT_TRAFFIC,
                sub: null,
                icon: '🚇',
                color: 'from-sky-500/15 to-transparent',
                border: 'border-sky-500/20 hover:border-sky-500/40',
                accent: 'text-sky-400',
                desc: strings.LANDING_SCORE_DESC_FOOT_TRAFFIC,
              },
              {
                title: strings.LANDING_SCORE_AREA_TYPE,
                sub: null,
                icon: '🏙️',
                color: 'from-violet-500/15 to-transparent',
                border: 'border-violet-500/20 hover:border-violet-500/40',
                accent: 'text-violet-400',
                desc: strings.LANDING_SCORE_DESC_AREA_TYPE,
              },
              {
                title: strings.LANDING_SCORE_URBAN_TIER,
                sub: null,
                icon: '🗺️',
                color: 'from-indigo-500/15 to-transparent',
                border: 'border-indigo-500/20 hover:border-indigo-500/40',
                accent: 'text-indigo-400',
                desc: strings.LANDING_SCORE_DESC_URBAN_TIER,
              },
              {
                title: strings.LANDING_SCORE_ACCESSIBILITY,
                sub: null,
                icon: '🚏',
                color: 'from-rose-500/15 to-transparent',
                border: 'border-rose-500/20 hover:border-rose-500/40',
                accent: 'text-rose-400',
                desc: strings.LANDING_SCORE_DESC_ACCESSIBILITY,
              },
              {
                title: strings.LANDING_SCORE_NEARBY_SERVICES,
                sub: null,
                icon: '🏥',
                color: 'from-teal-500/15 to-transparent',
                border: 'border-teal-500/20 hover:border-teal-500/40',
                accent: 'text-teal-400',
                desc: strings.LANDING_SCORE_DESC_NEARBY_SERVICES,
              },
              {
                title: strings.LANDING_SCORE_BUSINESS_DENSITY,
                sub: null,
                icon: '🛒',
                color: 'from-amber-500/15 to-transparent',
                border: 'border-amber-500/20 hover:border-amber-500/40',
                accent: 'text-amber-400',
                desc: strings.LANDING_SCORE_DESC_BUSINESS_DENSITY,
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
                className={`relative bg-gradient-to-b ${item.color} border ${item.border} rounded-2xl p-6 transition-colors duration-300`}
              >
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <h3 className={`text-sm font-bold uppercase tracking-wide mb-1 ${item.accent}`}>{item.title}</h3>
                {item.sub && <p className="text-slate-500 text-xs mb-2">{item.sub}</p>}
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-600 text-xs text-center mt-10"
          >
            {strings.LANDING_SCORE_FOOTNOTE}
          </motion.p>
        </div>
      </section>

      {/* Feedback form */}
      <section id="contact" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold mb-4 text-white text-center"
          >
            {strings.LANDING_CONTACT_TITLE}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-slate-400 text-center mb-10"
          >
            {strings.LANDING_CONTACT_SUBTITLE}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <FeedbackForm strings={strings} />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800 text-center">
        <p className="text-slate-600 text-sm">&copy; 2025 myblocate</p>
      </footer>
    </div>
  )
}
