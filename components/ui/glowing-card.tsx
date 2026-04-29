'use client'

interface GlowingButtonProps {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  fullWidth?: boolean
  style?: React.CSSProperties
}

export function GlowingButton({ onClick, children, disabled, fullWidth, style }: GlowingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="glowing-card-outer"
      style={{
        display: 'block',
        width: fullWidth ? '100%' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        border: 'none',
        padding: 0,
        background: 'none',
        textAlign: 'left',
        ...style,
      }}
    >
      <div
        className="glowing-card-inner"
        style={{
          minHeight: 'unset',
          padding: '12px 16px',
          flexDirection: 'row',
          gap: 10,
          borderRadius: 13,
        }}
      >
        <div className="glowing-card-ray" />
        <div className="glowing-card-line glowing-card-topl" />
        <div className="glowing-card-line glowing-card-leftl" />
        <div className="glowing-card-line glowing-card-bottoml" />
        <div className="glowing-card-line glowing-card-rightl" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
          {children}
        </div>
      </div>
    </button>
  )
}

interface GlowingStatCardProps {
  value: string
  label: string
  animationDelay?: string
}

export function GlowingStatCard({ value, label, animationDelay }: GlowingStatCardProps) {
  return (
    <div
      className="glowing-card-outer"
      style={{
        animationDelay,
        animationName: 'fade-up',
        animationDuration: '0.4s',
        animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        animationFillMode: 'both',
      }}
    >
      <div className="glowing-card-inner">
        <div className="glowing-card-ray" />
        <p
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'rgba(241,245,249,0.97)',
            fontFamily: 'monospace',
            margin: 0,
            position: 'relative',
            zIndex: 1,
            lineHeight: 1.2,
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(148,163,184,0.75)',
            textAlign: 'center',
            margin: '5px 0 0',
            lineHeight: 1.3,
            position: 'relative',
            zIndex: 1,
            padding: '0 4px',
          }}
        >
          {label}
        </p>
        <div className="glowing-card-line glowing-card-topl" />
        <div className="glowing-card-line glowing-card-leftl" />
        <div className="glowing-card-line glowing-card-bottoml" />
        <div className="glowing-card-line glowing-card-rightl" />
      </div>
    </div>
  )
}
