'use client'
import { useEffect, useState, type MutableRefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getStrings, type Lang } from '@/lib/i18n'
import type { PlacesContext } from '@/lib/types'

interface AgentResponse {
  role: string
  emoji: string
  opinion: string
  response: string
  confidence?: number
}

interface PanelResult {
  agents: AgentResponse[]
  verdict: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  businessType: string
  score: number
  placesContext: PlacesContext
  luxuryMismatch?: boolean
  rentTierAz?: string
  districtPopulationK?: number
  lang: Lang
  cacheRef: MutableRefObject<PanelResult | null>
}

const AGENT_BORDER_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981']

function AgentAvatar({ index, color }: { index: number; color: string }) {
  const avatars = [
    // 0 — Data Analyst: glasses + tie
    <svg key={0} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="11" r="7" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      <rect x="8.5" y="9.5" width="4.5" height="3" rx="1.2" stroke={color} strokeWidth="1" fill="none"/>
      <rect x="15" y="9.5" width="4.5" height="3" rx="1.2" stroke={color} strokeWidth="1" fill="none"/>
      <line x1="13" y1="11" x2="15" y2="11" stroke={color} strokeWidth="0.9"/>
      <path d="M4 30 Q4 20 14 20 Q24 20 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
      <path d="M13 20 L12.3 25.5 L14 27 L15.7 25.5 L15 20" fill={`${color}70`}/>
    </svg>,
    // 1 — Risk Advisor: hard hat
    <svg key={1} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="12" r="6.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      <path d="M7 11 Q14 4 21 11" fill={`${color}70`} stroke={`${color}cc`} strokeWidth="1.2"/>
      <rect x="5.5" y="10" width="17" height="2" rx="0.8" fill={`${color}80`}/>
      <path d="M4 30 Q4 21 14 21 Q24 21 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
    </svg>,
    // 2 — Location Expert: baseball cap
    <svg key={2} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="12" r="6.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      <path d="M8 11.5 Q14 5 20 11.5" fill={`${color}60`} stroke={`${color}aa`} strokeWidth="1.2"/>
      <path d="M8 11.5 Q5 12.5 4 13" stroke={`${color}bb`} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="11.5" x2="20" y2="11.5" stroke={`${color}80`} strokeWidth="1"/>
      <path d="M4 30 Q4 21 14 21 Q24 21 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
    </svg>,
    // 3 — Foot Traffic Expert: walking pedestrian
    <svg key={3} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="7" r="4.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      <line x1="14" y1="11.5" x2="14" y2="20" stroke={`${color}aa`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 14 L9 17" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 14 L19 16" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 20 L10 27" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 20 L18 26" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="19" y1="16" x2="22" y2="28" stroke={`${color}55`} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>,
  ]

  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      background: `${color}26`,
      border: `2px solid ${color}80`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {avatars[index] ?? <span style={{ fontSize: 18 }}>👤</span>}
    </div>
  )
}

function ConfidenceMeter({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < value ? `${color}cc` : 'rgba(255,255,255,0.08)',
              transition: `background 0.2s ${i * 40}ms`,
            }}
          />
        ))}
      </div>
      <span style={{
        fontSize: 9, color: 'rgba(100,116,139,0.6)',
        fontFamily: 'monospace', whiteSpace: 'nowrap',
      }}>
        {value} / 10
      </span>
    </div>
  )
}

export default function ExpertPanel({
  isOpen, onClose, lat, lng, businessType, score,
  placesContext, luxuryMismatch, rentTierAz, districtPopulationK,
  lang, cacheRef,
}: Props) {
  const strings = getStrings(lang)
  const [data, setData] = useState<PanelResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    if (cacheRef.current) {
      setData(cacheRef.current)
      return
    }

    setLoading(true)
    setError(false)
    setData(null)

    fetch('/api/expert-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat, lng, businessType, score,
        placesContext, luxuryMismatch, rentTierAz, districtPopulationK, lang,
      }),
    })
      .then(r => r.json())
      .then((res: PanelResult) => {
        if (!res.agents || res.agents.length === 0) {
          setError(true)
        } else {
          cacheRef.current = res
          setData(res)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: fetch once per analysis session; re-fetch is prevented by cacheRef.
  }, [isOpen])

  useEffect(() => {
    if (!loading) { setPhase(0); return }
    const t1 = setTimeout(() => setPhase(1), 3500)
    const t2 = setTimeout(() => setPhase(2), 6500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [loading])

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="expert-panel"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              background: '#080C11',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <h2 style={{ color: 'rgba(241,245,249,0.95)', fontSize: 15, fontWeight: 700, margin: 0 }}>
                {strings.EXPERT_PANEL_TITLE}
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(100,116,139,0.8)', fontSize: 20, lineHeight: 1,
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Loading state */}
              {loading && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(165,180,252,0.85)', fontWeight: 600 }}>
                      {phase === 0 ? strings.EXPERT_PANEL_ROUND1 : phase === 1 ? strings.EXPERT_PANEL_ROUND2 : strings.EXPERT_PANEL_SYNTHESIS}
                    </span>
                  </div>
                  {['📊', '⚠️', '🗺️', '🚶'].map((emoji, i) => (
                    <div key={emoji} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(255,255,255,0.07)`,
                      borderLeft: `3px solid ${AGENT_BORDER_COLORS[i]}`,
                      borderRadius: 10, padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                        <div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[100, 80, 90].map((w, j) => (
                          <div key={j} style={{ height: 10, width: `${w}%`, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Error state */}
              {error && !loading && (
                <div style={{
                  background: 'rgba(248,113,113,0.05)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 10, padding: '14px 16px',
                  color: 'rgba(248,113,113,0.9)', fontSize: 13,
                }}>
                  {strings.EXPERT_PANEL_ERROR}
                </div>
              )}

              {/* Agent cards */}
              {data && data.agents.map((agent, i) => (
                <div key={agent.role} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `3px solid ${AGENT_BORDER_COLORS[i] ?? '#6366f1'}`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <AgentAvatar index={i} color={AGENT_BORDER_COLORS[i] ?? '#6366f1'} />
                    <span style={{ color: 'rgba(203,213,225,0.9)', fontSize: 13, fontWeight: 600 }}>
                      {agent.role}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {agent.opinion}
                  </p>
                  {agent.confidence !== undefined && (
                    <ConfidenceMeter value={agent.confidence} color={AGENT_BORDER_COLORS[i] ?? '#6366f1'} />
                  )}
                  {agent.response && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        margin: '12px 0 10px',
                      }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                          {strings.EXPERT_PANEL_AFTER_DISCUSSION}
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                      <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                        {agent.response}
                      </p>
                    </>
                  )}
                </div>
              ))}

              {/* Verdict card */}
              {data && data.verdict && (
                <div style={{
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 10, padding: '14px 16px',
                  marginTop: 4,
                }}>
                  <p style={{
                    color: 'rgba(148,163,184,0.7)', fontSize: 11,
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.12em', marginBottom: 8,
                  }}>
                    {strings.EXPERT_PANEL_VERDICT}
                  </p>
                  <p style={{ color: 'rgba(226,232,240,0.9)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {data.verdict}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
