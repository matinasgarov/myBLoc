# Dashboard & Expert Panel Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the desktop dashboard to a 55/45 frosted-glass layout, redesign the loading overlay, add i18n to map layer buttons, overhaul the Expert Panel with SVG character avatars and per-agent confidence meters, and color-code factor bars.

**Architecture:** All changes are UI-layer only — no scoring, no validation, no PDF logic changes. Six independent file groups, each self-contained. Tasks 1–2 set the visual foundation; Tasks 3–6 are independent of each other; Tasks 7–8 share the confidence type; Task 9 is standalone.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, Leaflet (raw), Groq SDK, Framer Motion (already in Charts.tsx)

---

## File Map

| File | What Changes |
|---|---|
| `app/globals.css` | Add 3 CSS variables + `@keyframes spin-arc` |
| `app/page.tsx` | Layout flex ratio, `strings` prop to `<Map>`, artificial min-delay |
| `components/DesktopDashboard.tsx` | Root div uses CSS variables for glass effect |
| `components/LoadingOverlay.tsx` | Full redesign: composite spinner + circular step icons |
| `components/Map.tsx` | Accept `strings?` prop, read i18n labels for layer buttons |
| `components/ExpertPanelModal.tsx` | `AgentAvatar` component, confidence meter, updated type |
| `components/Charts.tsx` | `barColor()` helper, per-bar color in `BarsChartDisplay` |
| `app/api/expert-panel/route.ts` | `buildConfidencePrompt()`, parallel confidence calls, `confidence` in response |
| `lib/az.ts` | 4 new layer string keys |
| `lib/en.ts` | 4 new layer string keys |

---

## Task 1: CSS Variables + Layout Ratio

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add CSS variables to globals.css**

Open `app/globals.css`. After the existing `@keyframes glow-breathe` block (around line 65), add:

```css
/* ── Design tokens ──────────────────────────────────────────────────────────── */
:root {
  --dashboard-bg: rgba(7, 9, 13, 0.70);
  --dashboard-blur: blur(24px) saturate(1.4);
  --dashboard-border: rgba(255, 255, 255, 0.10);
}

@keyframes spin-arc {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Change layout ratio in page.tsx**

In `app/page.tsx`, find the content area flex row (around line 350). Change the map column and dashboard column flex values:

```tsx
{/* Map column — was flex:'3', now 55% */}
<div className="min-h-0 flex flex-col" style={{ flex: '0 0 55%' }}>
```

```tsx
{/* Desktop dashboard panel — was flex:'2', now 45% */}
<div
  className="hidden lg:flex flex-col"
  style={{ flex: '0 0 45%' }}
>
```

Remove `borderLeft: '1px solid rgba(255,255,255,0.07)'` from the dashboard column div — the dashboard component will own its own border.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "feat: 55/45 layout ratio and CSS design tokens"
```

---

## Task 2: Dashboard Glassmorphism

**Files:**
- Modify: `components/DesktopDashboard.tsx` (root div, line ~769)

- [ ] **Step 1: Apply glass style to DesktopDashboard root**

In `components/DesktopDashboard.tsx`, find the main return div (~line 769):

```tsx
// BEFORE
<div
  className="flex flex-col h-full"
  style={{ background: '#07090D' }}
>
```

Replace with:

```tsx
<div
  className="flex flex-col h-full"
  style={{
    background: 'var(--dashboard-bg)',
    backdropFilter: 'var(--dashboard-blur)',
    WebkitBackdropFilter: 'var(--dashboard-blur)',
    borderLeft: '1px solid var(--dashboard-border)',
  }}
>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/DesktopDashboard.tsx
git commit -m "feat: glassmorphism on desktop dashboard"
```

---

## Task 3: Loading Overlay Redesign

**Files:**
- Modify: `components/LoadingOverlay.tsx`

- [ ] **Step 1: Replace LoadingOverlay with redesigned version**

Completely replace `components/LoadingOverlay.tsx`:

```tsx
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
          {/* Static outer ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.15)',
          }} />
          {/* Rotating arc */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366f1',
            animation: 'spin-arc 1s linear infinite',
          }} />
          {/* Inner glowing dot */}
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
                {/* Step icon */}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/LoadingOverlay.tsx
git commit -m "feat: redesign loading overlay with indigo spinner and circular step icons"
```

---

## Task 4: Artificial Loading Delay Floor

**Files:**
- Modify: `app/page.tsx` (`handleBusinessSubmit` function, lines ~167–206)

- [ ] **Step 1: Add minimum 1500ms delay to handleBusinessSubmit**

In `app/page.tsx`, find `handleBusinessSubmit`. Replace the fetch block:

```tsx
// BEFORE
const t2 = setTimeout(() => setLoadingStep(2), 2000)
const t3 = setTimeout(() => setLoadingStep(3), 4000)

try {
  const placesRes = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: activePin.lat, lng: activePin.lng, businessType: business }),
  })
  clearTimeout(t2)
  clearTimeout(t3)
```

```tsx
// AFTER
const t2 = setTimeout(() => setLoadingStep(2), 2000)
const t3 = setTimeout(() => setLoadingStep(3), 4000)
const minDelay = new Promise<void>(resolve => setTimeout(resolve, 1500))

try {
  const [placesRes] = await Promise.all([
    fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: activePin.lat, lng: activePin.lng, businessType: business }),
    }),
    minDelay,
  ])
  clearTimeout(t2)
  clearTimeout(t3)
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: 1500ms minimum loading floor for perceived analysis depth"
```

---

## Task 5: i18n String Keys for Map Layers

**Files:**
- Modify: `lib/az.ts`
- Modify: `lib/en.ts`

- [ ] **Step 1: Add keys to az.ts**

In `lib/az.ts`, add these 4 entries anywhere in the `AZ` object (e.g. after the last existing key):

```ts
  LAYER_BUS: 'Avtobus',
  LAYER_METRO: 'Metro',
  LAYER_TRANSPORT: 'Nəqliyyat',
  LAYER_COMPETITORS: 'Rəqiblər',
```

- [ ] **Step 2: Add keys to en.ts**

In `lib/en.ts`, add these 4 entries:

```ts
  LAYER_BUS: 'Bus Stops',
  LAYER_METRO: 'Metro',
  LAYER_TRANSPORT: 'Transport',
  LAYER_COMPETITORS: 'Competitors',
```

- [ ] **Step 3: Verify TypeScript — both files must match shape**

```bash
npx tsc --noEmit
```

Expected: 0 errors. The `Strings` type in `lib/i18n.ts` is `{ [K in keyof typeof AZ]: string }` — TypeScript will enforce `EN` has the same keys.

- [ ] **Step 4: Run existing tests**

```bash
npm test
```

Expected: 61 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/az.ts lib/en.ts
git commit -m "feat: add LAYER_BUS/METRO/TRANSPORT/COMPETITORS i18n keys"
```

---

## Task 6: Map Layer Panel i18n

**Files:**
- Modify: `components/Map.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add strings prop to Map.tsx**

In `components/Map.tsx`, import the `Strings` type and update the props interface:

```tsx
import type { LatLng } from '@/lib/types'
import type { Strings } from '@/lib/i18n'   // ← add this import

interface MapProps {
  onPinDrop: (lat: number, lng: number) => void
  pin: LatLng | null
  dimmed: boolean
  flyToTarget: LatLng | null
  showLayerPanel?: boolean
  businessType?: string
  strings?: Strings   // ← add this
}
```

- [ ] **Step 2: Update LAYER_DEFS to remove hardcoded labels**

Remove the `label` field from `LAYER_DEFS` and add a `stringKey` field instead:

```tsx
// BEFORE
const LAYER_DEFS: { type: LayerType; label: string; emoji: string }[] = [
  { type: 'bus',         label: 'Bus Stops',   emoji: '🚌' },
  { type: 'metro',       label: 'Metro',        emoji: '🚇' },
  { type: 'transport',   label: 'Transport',    emoji: '🚦' },
  { type: 'competitors', label: 'Competitors',  emoji: '🏪' },
]
```

```tsx
// AFTER
const LAYER_DEFS: { type: LayerType; stringKey: keyof Strings; emoji: string }[] = [
  { type: 'bus',         stringKey: 'LAYER_BUS',         emoji: '🚌' },
  { type: 'metro',       stringKey: 'LAYER_METRO',        emoji: '🚇' },
  { type: 'transport',   stringKey: 'LAYER_TRANSPORT',    emoji: '🚦' },
  { type: 'competitors', stringKey: 'LAYER_COMPETITORS',  emoji: '🏪' },
]

// Fallback labels when strings prop is absent
const LAYER_LABELS: Record<LayerType, string> = {
  bus: 'Bus Stops',
  metro: 'Metro',
  transport: 'Transport',
  competitors: 'Competitors',
}
```

- [ ] **Step 3: Update component signature and toast + button**

Update the function signature to destructure `strings`:

```tsx
export default function Map({ onPinDrop, pin, dimmed, flyToTarget, showLayerPanel, businessType, strings }: MapProps) {
```

In `toggleLayer`, update the empty-result toast (line ~152). Replace `showToast(`No ${def.label}...`)` with:

```tsx
const label = strings ? strings[stringKey] : LAYER_LABELS[type]
if (elements.length === 0) {
  showToast(`${label}: 0`)
  return
}
```

In the layer panel render (the `.map()` over `LAYER_DEFS`), update to compute the label:

```tsx
{LAYER_DEFS.map(({ type, stringKey, emoji }) => {
  const label = strings ? strings[stringKey] : LAYER_LABELS[type]
  const isActive = activeLayers[type]
  const isLoading = layerLoading[type]
  return (
    <button
      key={type}
      onClick={() => toggleLayer(type)}
      style={{
        background: isActive ? LAYER_COLORS[type] : 'rgba(7,9,13,0.82)',
        border: `1px solid ${isActive ? LAYER_COLORS[type] : 'rgba(255,255,255,0.18)'}`,
        color: '#fff',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        backdropFilter: 'blur(8px)',
        minWidth: 130,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <span>{emoji}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {isLoading && <span style={{ fontSize: 10, opacity: 0.7 }}>…</span>}
    </button>
  )
})}
```

- [ ] **Step 4: Pass strings to Map in page.tsx**

In `app/page.tsx`, find the `<Map>` element (line ~358) and add `strings={strings}`:

```tsx
<Map
  key={mapKey}
  onPinDrop={handlePinDrop}
  pin={pin}
  dimmed={isDimmed}
  flyToTarget={flyToTarget}
  showLayerPanel={appState === 'result'}
  businessType={businessType}
  strings={strings}
/>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add components/Map.tsx app/page.tsx
git commit -m "feat: i18n labels for map layer panel buttons"
```

---

## Task 7: Expert Panel Confidence Field (API)

**Files:**
- Modify: `app/api/expert-panel/route.ts`

- [ ] **Step 1: Update AgentResponse interface and callGroq in route.ts**

In `app/api/expert-panel/route.ts`, update the `AgentResponse` interface (line 16) to include `confidence`:

```ts
interface AgentResponse {
  role: string
  emoji: string
  opinion: string
  response: string
  confidence: number
}
```

Update `callGroq` to accept an optional `maxTokens` parameter:

```ts
async function callGroq(prompt: string, maxTokens = 300): Promise<string> {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}
```

- [ ] **Step 2: Add buildConfidencePrompt function**

Add this function after `buildCustomerFlowPrompt` (around line 143):

```ts
function buildConfidencePrompt(role: string, opinion: string, lang: 'az' | 'en'): string {
  if (lang === 'en') {
    return `You are ${role}. Your analysis was:
"${opinion}"

Rate your confidence in this assessment on a scale from 0 to 10, where 0 = very uncertain and 10 = highly confident. Consider data availability and potential confounding factors. Reply with only a single integer between 0 and 10, nothing else.`
  }
  return `Sən ${role}. Sənin analizin:
"${opinion}"

Bu qiymətləndirmədəki inamını 0-dan 10-a qədər qiymətləndir: 0 = çox qeyri-müəyyən, 10 = çox əmindir. Yalnız 0 ilə 10 arasında bir tam ədəd yaz, başqa heç nə yox.`
}
```

- [ ] **Step 3: Add confidence calls in the POST handler**

In the `POST` handler, after `round2Responses` is collected (around line 264), add the confidence calls before building the final `agents` array:

```ts
// Round 3: confidence ratings (parallel, short calls)
const confidenceResponses = await Promise.all(
  round1Agents.map(a =>
    callGroq(buildConfidencePrompt(a.role, a.opinion, lang), 5)
  )
)
const confidences = confidenceResponses.map(r => {
  const n = parseInt(r.trim(), 10)
  return isNaN(n) ? 5 : Math.min(10, Math.max(0, n))
})

const agents: AgentResponse[] = round1Agents.map((a, i) => ({
  ...a,
  response: round2Responses[i],
  confidence: confidences[i],
}))
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Run existing tests**

```bash
npm test
```

Expected: 61 tests pass (expert panel route has no existing unit tests).

- [ ] **Step 6: Commit**

```bash
git add app/api/expert-panel/route.ts
git commit -m "feat: add confidence rating field to expert panel agents"
```

---

## Task 8: Expert Panel — Avatars + Confidence Meter

**Files:**
- Modify: `components/ExpertPanelModal.tsx`

- [ ] **Step 1: Update AgentResponse type and add AgentAvatar component**

In `components/ExpertPanelModal.tsx`, update the `AgentResponse` interface:

```ts
interface AgentResponse {
  role: string
  emoji: string
  opinion: string
  response: string
  confidence?: number
}
```

Add the `AgentAvatar` component right after the `AgentResponse` / `PanelResult` interfaces:

```tsx
function AgentAvatar({ index, color }: { index: number; color: string }) {
  const avatars = [
    // 0 — Data Analyst: glasses + tie
    <svg key={0} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="11" r="7" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      {/* Glasses */}
      <rect x="8.5" y="9.5" width="4.5" height="3" rx="1.2" stroke={color} strokeWidth="1" fill="none"/>
      <rect x="15" y="9.5" width="4.5" height="3" rx="1.2" stroke={color} strokeWidth="1" fill="none"/>
      <line x1="13" y1="11" x2="15" y2="11" stroke={color} strokeWidth="0.9"/>
      {/* Body */}
      <path d="M4 30 Q4 20 14 20 Q24 20 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
      {/* Tie */}
      <path d="M13 20 L12.3 25.5 L14 27 L15.7 25.5 L15 20" fill={`${color}70`}/>
    </svg>,

    // 1 — Risk Advisor: hard hat
    <svg key={1} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="12" r="6.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      {/* Hard hat dome */}
      <path d="M7 11 Q14 4 21 11" fill={`${color}70`} stroke={`${color}cc`} strokeWidth="1.2"/>
      {/* Hat brim */}
      <rect x="5.5" y="10" width="17" height="2" rx="0.8" fill={`${color}80`}/>
      {/* Body */}
      <path d="M4 30 Q4 21 14 21 Q24 21 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
    </svg>,

    // 2 — Location Expert: baseball cap
    <svg key={2} width="28" height="30" viewBox="0 0 28 30" fill="none">
      <circle cx="14" cy="12" r="6.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      {/* Cap dome */}
      <path d="M8 11.5 Q14 5 20 11.5" fill={`${color}60`} stroke={`${color}aa`} strokeWidth="1.2"/>
      {/* Cap brim */}
      <path d="M8 11.5 Q5 12.5 4 13" stroke={`${color}bb`} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Cap band */}
      <line x1="8" y1="11.5" x2="20" y2="11.5" stroke={`${color}80`} strokeWidth="1"/>
      {/* Body */}
      <path d="M4 30 Q4 21 14 21 Q24 21 24 30" fill={`${color}25`} stroke={`${color}55`} strokeWidth="1.2"/>
    </svg>,

    // 3 — Foot Traffic Expert: walking pedestrian
    <svg key={3} width="28" height="30" viewBox="0 0 28 30" fill="none">
      {/* Head */}
      <circle cx="14" cy="7" r="4.5" fill={`${color}40`} stroke={`${color}99`} strokeWidth="1.2"/>
      {/* Body */}
      <line x1="14" y1="11.5" x2="14" y2="20" stroke={`${color}aa`} strokeWidth="2" strokeLinecap="round"/>
      {/* Arms */}
      <path d="M14 14 L9 17" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 14 L19 16" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Legs — walking pose */}
      <path d="M14 20 L10 27" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 20 L18 26" stroke={`${color}aa`} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Walking stick */}
      <line x1="19" y1="16" x2="22" y2="28" stroke={`${color}55`} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>,
  ]

  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      background: hex2,
      border: `2px solid ${hex8}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {avatars[index] ?? <span style={{ fontSize: 18 }}>👤</span>}
    </div>
  )
}
```

- [ ] **Step 2: Add ConfidenceMeter component**

Add this component after `AgentAvatar`:

```tsx
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
```

- [ ] **Step 3: Replace emoji spans with AgentAvatar in agent cards**

In the agent cards render (around line 194), replace:

```tsx
// BEFORE
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
  <span style={{ fontSize: 16 }}>{agent.emoji}</span>
  <span style={{ color: 'rgba(203,213,225,0.9)', fontSize: 13, fontWeight: 600 }}>
    {agent.role}
  </span>
</div>
<p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
  {agent.opinion}
</p>
```

```tsx
// AFTER
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
```

Also update the loading skeleton to use a placeholder circle instead of emoji. In the loading state skeleton render (around line 160):

```tsx
// BEFORE
<span style={{ fontSize: 16 }}>{emoji}</span>
<div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
```

```tsx
// AFTER
<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
<div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 61 tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/ExpertPanelModal.tsx
git commit -m "feat: SVG character avatars and confidence meters in Expert Panel"
```

---

## Task 9: Color-Coded Factor Bars

**Files:**
- Modify: `components/Charts.tsx` (`BarsChartDisplay`)

- [ ] **Step 1: Add barColor helper and update BarsChartDisplay**

In `components/Charts.tsx`, add the `barColor` helper after the existing `useCountUp` hook (around line 31):

```ts
function barColor(pct: number): string {
  if (pct >= 70) return '#34d399'
  if (pct >= 40) return '#fbbf24'
  return '#f87171'
}
```

In `BarsChartDisplay`, update the `motion.div` fill and the score label color to use `barColor` instead of the `accent` prop:

```tsx
export function BarsChartDisplay({ factors, accent }: { factors: ChartFactor[]; accent: string }) {
  return (
    <div className="px-3 py-4 space-y-3">
      {factors.map((f, i) => {
        const pct = (f.score / f.max) * 100
        const color = barColor(pct)            // ← computed per-bar
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
                style={{ background: color }}          // ← was: accent
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, delay: 0.08 + i * 0.07, ease: [0.25, 0, 0, 1] }}
              />
            </div>
            <motion.span
              className="text-[9px] tabular-nums shrink-0"
              style={{ color, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}  // ← was: accent
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
```

Note: `accent` prop is kept on the function signature for `RadarChartDisplay` and `ScoreRingDisplay` which still use it. `BarsChartDisplay` just ignores `accent` for bar fills now.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 61 tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/Charts.tsx
git commit -m "feat: color-coded factor bars (green/amber/red) by score percentage"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: 61 tests pass.

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server (`npm run dev`) and verify:

1. Desktop layout — map takes ~55%, dashboard ~45%
2. Dashboard has frosted-glass effect (appears translucent when hovering map tiles peek behind it at panel edges)
3. Enter map state → drop a pin → submit business → loading overlay shows indigo spinner + circular step icons with stagger
4. Fast connection: overlay shows for ≥1.5s before result appears
5. Result view: factor bars in the dashboard are green / amber / red based on score, not uniform blue
6. Switch language AZ↔EN: map layer panel button labels change language
7. Click a layer button → labels are in the active language
8. Open Expert Panel: agent cards show SVG character avatars (not plain emojis)
9. After data loads: confidence meter (10 dots + "N / 10") appears below each agent's opinion
10. `npx tsc --noEmit` still passes after smoke-testing (no runtime console errors)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: dashboard & expert panel overhaul complete"
```
