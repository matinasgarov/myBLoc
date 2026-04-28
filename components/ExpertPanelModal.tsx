'use client'
import { useEffect, useState, type MutableRefObject } from 'react'
import { getStrings, type Lang } from '@/lib/i18n'
import type { PlacesContext } from '@/lib/types'

interface AgentResponse {
  role: string
  emoji: string
  opinion: string
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

export default function ExpertPanelModal({
  isOpen, onClose, lat, lng, businessType, score,
  placesContext, luxuryMismatch, rentTierAz, districtPopulationK,
  lang, cacheRef,
}: Props) {
  const strings = getStrings(lang)
  const [data, setData] = useState<PanelResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

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
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal={true}
        style={{
          width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflowY: 'auto',
          background: '#080C11',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
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
              {['📊', '⚠️', '🗺️', '🚶'].map((emoji, i) => (
                <div key={emoji} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `3px solid ${AGENT_BORDER_COLORS[i]}`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    <div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[100, 80, 90].map((w, j) => (
                      <div key={j} style={{ height: 10, width: `${w}%`, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                    ))}
                  </div>
                  <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>{strings.EXPERT_PANEL_LOADING}</p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{agent.emoji}</span>
                <span style={{ color: 'rgba(203,213,225,0.9)', fontSize: 13, fontWeight: 600 }}>
                  {agent.role}
                </span>
              </div>
              <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {agent.opinion}
              </p>
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
    </div>
  )
}
