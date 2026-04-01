'use client'

import { motion } from 'framer-motion'
import type { Strings } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface Props {
  onStart: () => void
  strings: Strings
  lang: Lang
  onLangChange: (lang: Lang) => void
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))

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
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export default function LandingPage({ onStart, strings, lang, onLangChange }: Props) {
  const brandLetters = 'myblocate'.split('')

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-950 text-white">
      {/* Language toggle */}
      <div className="fixed top-6 right-6 z-50 flex gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1">
        <button
          onClick={() => onLangChange('az')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            lang === 'az' ? 'bg-white text-slate-950' : 'text-white/70 hover:text-white'
          }`}
        >
          AZ
        </button>
        <button
          onClick={() => onLangChange('en')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            lang === 'en' ? 'bg-white text-slate-950' : 'text-white/70 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>

      {/* Hero section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
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
      </section>

      {/* Contact section */}
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold mb-6 text-white"
          >
            {strings.LANDING_CONTACT_TITLE}
          </motion.h2>
          <motion.a
            href={`mailto:${strings.LANDING_CONTACT_EMAIL}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-lg hover:text-white transition-colors"
          >
            {strings.LANDING_CONTACT_EMAIL}
          </motion.a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800 text-center">
        <p className="text-slate-600 text-sm">&copy; 2025 myblocate</p>
      </footer>
    </div>
  )
}
