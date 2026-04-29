'use client'
import { getStrings } from '@/lib/i18n'

type Strings = ReturnType<typeof getStrings>

interface Props {
  step: 1 | 2 | 3 | 4
  strings: Strings
}

export default function LoadingOverlay({ step, strings }: Props) {
  const STEPS = [
    strings.LOADING_STEP_1,
    strings.LOADING_STEP_2,
    strings.LOADING_STEP_3,
    strings.LOADING_STEP_4,
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div
        style={{
          background: 'rgba(8,12,17,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          minWidth: 240,
        }}
      >
        {/* Composite indigo spinner */}
        <div style={{ position: 'relative', width: 48, height: 48 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.15)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366f1',
            animation: 'spin-arc 1s linear infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#6366f1',
              boxShadow: '0 0 8px rgba(99,102,241,0.8)',
            }} />
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4
            const isDone = step > stepNum
            const isActive = step === stepNum

            return (
              <div
                key={stepNum}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  animationName: 'fade-up',
                  animationDuration: '0.35s',
                  animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                  animationFillMode: 'both',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {isDone ? (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none"
                      stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5l2.5 2.5 4-4"/>
                    </svg>
                  </div>
                ) : isActive ? (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid rgba(99,102,241,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#6366f1',
                      boxShadow: '0 0 5px rgba(99,102,241,0.9)',
                    }} />
                  </div>
                ) : (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }} />
                )}

                <span style={{
                  fontSize: 13,
                  color: isDone
                    ? 'rgba(100,116,139,0.45)'
                    : isActive
                    ? 'rgba(165,180,252,0.9)'
                    : 'rgba(100,116,139,0.3)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.3s',
                }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
