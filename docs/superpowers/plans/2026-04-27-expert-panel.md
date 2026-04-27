# Expert Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Ekspert Paneli" button to the result screen that opens a modal showing 4 role-based AI agents analyzing the OSM data in parallel, followed by a synthesizer verdict.

**Architecture:** POST `/api/expert-panel` fires 4 Groq calls in `Promise.all` (one per agent role), then a 5th synthesizer call reads all 4 opinions and produces a 2-sentence verdict. The modal component fetches on open, caches the result in a `useRef` in `page.tsx`, and re-renders from cache on re-open without a second API call.

**Tech Stack:** Next.js App Router API routes, Groq SDK (`llama-3.3-70b-versatile`), React, Tailwind CSS, TypeScript.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/az.ts` | Edit | Add 5 i18n string keys (AZ) |
| `lib/en.ts` | Edit | Add 5 i18n string keys (EN) |
| `app/api/expert-panel/route.ts` | Create | 5 Groq calls, returns `{ agents, verdict }` |
| `components/ExpertPanelModal.tsx` | Create | Modal UI with loading skeleton and agent cards |
| `app/page.tsx` | Edit | Cache ref, open state, pass props to ResultSheet + DesktopDashboard |
| `components/ResultSheet.tsx` | Edit | "Ekspert Paneli" button → opens modal |
| `components/DesktopDashboard.tsx` | Edit | Same button in desktop result view |

---

## Task 1: Add i18n strings

**Files:**
- Modify: `lib/az.ts`
- Modify: `lib/en.ts`

- [ ] **Step 1: Add AZ strings to `lib/az.ts`**

Open `lib/az.ts` and append these 5 entries to the `AZ` object (before the closing `}`):

```ts
  EXPERT_PANEL_BUTTON: 'Ekspert Paneli',
  EXPERT_PANEL_TITLE: 'Ekspert Rəy Paneli',
  EXPERT_PANEL_VERDICT: 'Moderator Nəticəsi',
  EXPERT_PANEL_LOADING: 'Ekspertlər analiz edir...',
  EXPERT_PANEL_ERROR: 'Məlumat yüklənmədi',
```

- [ ] **Step 2: Add EN strings to `lib/en.ts`**

Open `lib/en.ts` and append these 5 entries to the `EN` object (before the closing `}`):

```ts
  EXPERT_PANEL_BUTTON: 'Expert Panel',
  EXPERT_PANEL_TITLE: 'Expert Opinion Panel',
  EXPERT_PANEL_VERDICT: 'Moderator Verdict',
  EXPERT_PANEL_LOADING: 'Experts analyzing...',
  EXPERT_PANEL_ERROR: 'Could not load panel',
```

Note: `lib/i18n.ts` uses `type Strings = { [K in keyof typeof AZ]: string }` — TypeScript will automatically pick up the new keys from `AZ`. No changes needed to `i18n.ts`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/az.ts lib/en.ts
git commit -m "feat: add expert panel i18n strings"
```

---

## Task 2: Create the API route

**Files:**
- Create: `app/api/expert-panel/route.ts`

- [ ] **Step 1: Create the file**

Create `app/api/expert-panel/route.ts` with this content:

```ts
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { PlacesContext } from '@/lib/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

interface AgentResponse {
  role: string
  emoji: string
  opinion: string
}

interface RequestBody {
  lat: number
  lng: number
  businessType: string
  score: number
  placesContext: PlacesContext
  luxuryMismatch?: boolean
  rentTierAz?: string
  districtPopulationK?: number
  lang: 'az' | 'en'
}

function buildMarketAnalystPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Market Analyst specializing in Azerbaijani commercial real estate. Write in English only.

Business: ${businessType}
Score: ${score}/95
Competitors within 500m: ${ctx.competitors}
Total businesses in area: ${ctx.totalBusinesses}
Business type recognized in OSM: ${ctx.recognized ? 'yes' : 'no'}
Dominant nearby competitors: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'none'}

Write exactly 3-4 sentences analyzing the competitive landscape for this business at this location. Focus only on competition, market saturation, and business density. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda ticarət daşınmaz əmlakı üzrə ixtisaslaşmış Bazar Analitikisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
500m radiusda rəqib: ${ctx.competitors}
Ərazidəki ümumi müəssisə: ${ctx.totalBusinesses}
Biznes növü tanındı: ${ctx.recognized ? 'bəli' : 'xeyr'}
Yaxın dominant rəqiblər: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'yoxdur'}

Bu biznes üçün rəqabət mənzərəsini təhlil edən tam 3-4 cümlə yaz. Yalnız rəqabət, bazar doyumu və müəssisə sıxlığına fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildRiskAdvisorPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, luxuryMismatch, rentTierAz, lang } = body
  const areaTypeEn = ctx.areaType === 'commercial' ? 'commercial' : ctx.areaType === 'mixed' ? 'mixed' : 'residential'
  const areaTypeAz = ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'
  if (lang === 'en') {
    return `You are a Risk Advisor specializing in Azerbaijani business location analysis. Write in English only.

Business: ${businessType}
Score: ${score}/95
Land use restriction: ${ctx.landUse ?? 'none'}
Area type: ${areaTypeEn}
Rent tier: ${rentTierAz ?? 'unknown'}
Luxury/wealth mismatch: ${luxuryMismatch ? 'yes — luxury business in low-wealth district' : 'no'}

Write exactly 3-4 sentences analyzing the key risks for this business at this location. Focus only on land use, area type suitability, rent burden, and wealth/business mismatch. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkan analizinə ixtisaslaşmış Risk Məsləhətçisisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
Torpaq istifadə məhdudiyyəti: ${ctx.landUse ?? 'yoxdur'}
Ərazi tipi: ${areaTypeAz}
Kirayə səviyyəsi: ${rentTierAz ?? 'məlum deyil'}
Lüks/gəlir uyğunsuzluğu: ${luxuryMismatch ? 'bəli — aşağı gəlirli rayonda lüks biznes' : 'xeyr'}

Bu biznes üçün əsas riskləri təhlil edən tam 3-4 cümlə yaz. Yalnız torpaq istifadəsi, ərazi uyğunluğu, kirayə yükü və biznes-ərazi uyğunsuzluğuna fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildLocationStrategistPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, districtPopulationK, lang } = body
  const urbanEn = ctx.urbanTier === 'metro-city' ? 'metro city' : ctx.urbanTier === 'city' ? 'city' : ctx.urbanTier === 'town' ? 'town' : 'rural'
  const urbanAz = ctx.urbanTier === 'metro-city' ? 'metro şəhəri' : ctx.urbanTier === 'city' ? 'şəhər' : ctx.urbanTier === 'town' ? 'qəsəbə' : 'kənd'
  if (lang === 'en') {
    return `You are a Location Strategist specializing in Azerbaijani commercial real estate. Write in English only.

Business: ${businessType}
Score: ${score}/95
Metro distance: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'none'}
Metro daily ridership: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'no data'}
Major roads nearby: ${ctx.majorRoads}
Urban tier: ${urbanEn}
District population: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} people` : 'unknown'}

Write exactly 3-4 sentences analyzing the location strengths for this business. Focus only on metro access, road connectivity, urban tier, and population catchment. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda ticarət daşınmaz əmlakına ixtisaslaşmış Məkan Strateqisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
Metro məsafəsi: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'yoxdur'}
Metro gündəlik sərnişin: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'məlumat yoxdur'}
Yaxın böyük yollar: ${ctx.majorRoads}
Şəhər tipi: ${urbanAz}
Rayon əhalisi: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} nəfər` : 'məlum deyil'}

Bu biznes üçün məkanın güclü tərəflərini təhlil edən tam 3-4 cümlə yaz. Yalnız metro əlçatanlığı, yol bağlantısı, şəhər tipi və əhali miqdarına fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildCustomerFlowPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Customer Flow Expert specializing in Azerbaijani business location analysis. Write in English only.

Business: ${businessType}
Score: ${score}/95
Bus stops within 500m: ${ctx.busStops}
Parking available: ${ctx.parking > 0 ? 'yes' : 'no'}
Grocery stores within 500m: ${ctx.groceryStores}
Nearby amenities: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'none'}

Write exactly 3-4 sentences analyzing customer flow and accessibility for this business at this location. Focus only on public transport, parking, pedestrian traffic generators (grocery stores, amenities). Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkan analizinə ixtisaslaşmış Müştəri Axını Ekspertisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
500m-də avtobus dayanacağı: ${ctx.busStops}
Parkinq: ${ctx.parking > 0 ? 'var' : 'yoxdur'}
500m-də ərzaq mağazası: ${ctx.groceryStores}
Yaxın obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}

Bu biznes üçün müştəri axını və əlçatanlığı təhlil edən tam 3-4 cümlə yaz. Yalnız ictimai nəqliyyat, parkinq, piyada trafik generatorlarına (ərzaq mağazaları, obyektlər) fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildSynthesizerPrompt(
  agents: AgentResponse[],
  businessType: string,
  score: number,
  lang: 'az' | 'en',
): string {
  const opinions = agents.map(a => `${a.role}: ${a.opinion}`).join('\n\n')
  if (lang === 'en') {
    return `You are a Moderator synthesizing expert opinions about a business location in Azerbaijan.

Business: ${businessType}
Score: ${score}/95

Expert opinions:
${opinions}

Write exactly 2 sentences as your final verdict. Synthesize all expert views into a balanced conclusion. Be direct. Output only your verdict text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkanı haqqında ekspert rəylərini ümumiləşdirən Moderatorsən.

Biznes: ${businessType}
Bal: ${score}/95

Ekspert rəyləri:
${opinions}

Yekun qərar kimi tam 2 cümlə yaz. Bütün ekspert baxışlarını balanslaşdırılmış nəticəyə birləşdir. Birbaşa ol. Yalnız qərar mətni yaz, JSON yox, etiket yox.`
}

async function callGroq(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as RequestBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { lat, lng, businessType, score, placesContext } = body
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof businessType !== 'string' ||
    typeof score !== 'number' ||
    !placesContext
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const agentDefs: { role: string; emoji: string; prompt: string }[] = [
      { role: body.lang === 'en' ? 'Market Analyst' : 'Bazar Analitiki',      emoji: '📊', prompt: buildMarketAnalystPrompt(body) },
      { role: body.lang === 'en' ? 'Risk Advisor' : 'Risk Məsləhətçisi',      emoji: '⚠️', prompt: buildRiskAdvisorPrompt(body) },
      { role: body.lang === 'en' ? 'Location Strategist' : 'Məkan Strateqi',  emoji: '🗺️', prompt: buildLocationStrategistPrompt(body) },
      { role: body.lang === 'en' ? 'Customer Flow Expert' : 'Müştəri Axını Eksperti', emoji: '🚶', prompt: buildCustomerFlowPrompt(body) },
    ]

    const opinions = await Promise.all(agentDefs.map(a => callGroq(a.prompt)))

    const agents: AgentResponse[] = agentDefs.map((a, i) => ({
      role: a.role,
      emoji: a.emoji,
      opinion: opinions[i],
    }))

    const verdict = await callGroq(buildSynthesizerPrompt(agents, businessType, score, body.lang ?? 'az'))

    return NextResponse.json({ agents, verdict })
  } catch {
    return NextResponse.json({ agents: [], verdict: '' })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Smoke-test the route manually**

Start dev server (`npm run dev`) and in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/expert-panel \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 40.4093,
    "lng": 49.8671,
    "businessType": "kafe",
    "score": 72,
    "lang": "en",
    "placesContext": {
      "competitors": 3,
      "areaType": "commercial",
      "amenities": ["restaurant", "pharmacy"],
      "totalBusinesses": 18,
      "landUse": null,
      "recognized": true,
      "busStops": 2,
      "parking": 1,
      "groceryStores": 1,
      "majorRoads": 1,
      "metroDistance": 320,
      "metroRidership": 12000,
      "urbanTier": "metro-city",
      "dominantCompetitors": []
    }
  }' | head -c 500
```

Expected: JSON with `agents` array of 4 objects (each with `role`, `emoji`, `opinion`) and a `verdict` string.

- [ ] **Step 4: Commit**

```bash
git add app/api/expert-panel/route.ts
git commit -m "feat: add expert panel API route with 4 parallel Groq agents"
```

---

## Task 3: Create `ExpertPanelModal` component

**Files:**
- Create: `components/ExpertPanelModal.tsx`

- [ ] **Step 1: Create the file**

Create `components/ExpertPanelModal.tsx`:

```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
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
  cacheRef: React.MutableRefObject<PanelResult | null>
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
                <div key={i} style={{
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
            <div key={i} style={{
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/ExpertPanelModal.tsx
git commit -m "feat: add ExpertPanelModal component"
```

---

## Task 4: Wire modal into `page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports and state**

In `app/page.tsx`, add the import at the top with other component imports:

```ts
import ExpertPanelModal from '@/components/ExpertPanelModal'
```

Then inside the `Home` component, add these two lines after the existing `useState` / `useRef` declarations (e.g., after `const [flyToTarget, setFlyToTarget] = useState<LatLng | null>(null)`):

```ts
const [expertPanelOpen, setExpertPanelOpen] = useState(false)
const expertPanelCacheRef = useRef<{ agents: { role: string; emoji: string; opinion: string }[]; verdict: string } | null>(null)
```

- [ ] **Step 2: Clear the cache in `handleReset`**

In `handleReset()`, add one line after `setMapKey(k => k + 1)`:

```ts
expertPanelCacheRef.current = null
```

The full `handleReset` should then read:
```ts
const handleReset = () => {
  setAppState('map')
  setPin(null)
  setResult(null)
  setPlacesContext(null)
  setBusinessType('')
  setError(null)
  setWarning(null)
  setMapKey(k => k + 1)
  expertPanelCacheRef.current = null
}
```

- [ ] **Step 3: Pass new props to `ResultSheet`**

Find the `<ResultSheet` JSX in `page.tsx`. Add these two props:

```tsx
onOpenExpertPanel={() => setExpertPanelOpen(true)}
expertPanelAvailable={!!result}
```

- [ ] **Step 4: Pass new props to `DesktopDashboard`**

Find the `<DesktopDashboard` JSX in `page.tsx`. Add these two props:

```tsx
onOpenExpertPanel={() => setExpertPanelOpen(true)}
expertPanelAvailable={!!result}
```

- [ ] **Step 5: Render `ExpertPanelModal` in `page.tsx`**

Inside the `return (...)` of `Home`, before the closing `</main>` tag, add:

```tsx
{result && pin && placesContext && (
  <ExpertPanelModal
    isOpen={expertPanelOpen}
    onClose={() => setExpertPanelOpen(false)}
    lat={pin.lat}
    lng={pin.lng}
    businessType={businessType}
    score={result.score}
    placesContext={placesContext}
    luxuryMismatch={result.luxuryMismatch}
    rentTierAz={result.rentTierAz}
    districtPopulationK={result.districtPopulationK}
    lang={lang}
    cacheRef={expertPanelCacheRef}
  />
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors about unknown props on `ResultSheet` and `DesktopDashboard` — these will be fixed in Tasks 5 and 6.

- [ ] **Step 7: Commit (after Tasks 5 + 6 make it green)**

Hold this commit until the end of Task 6 when TypeScript is clean.

---

## Task 5: Add button to `ResultSheet`

**Files:**
- Modify: `components/ResultSheet.tsx`

- [ ] **Step 1: Add new props to the `Props` interface**

In `ResultSheet.tsx`, find the `interface Props {` block and add two lines:

```ts
onOpenExpertPanel: () => void
expertPanelAvailable: boolean
```

- [ ] **Step 2: Destructure new props**

In the `export default function ResultSheet(...)` signature, add the two new props:

```tsx
export default function ResultSheet({
  business, result, context, lat, lng, lang, onReset, strings,
  onOpenExpertPanel, expertPanelAvailable,
}: Props) {
```

- [ ] **Step 3: Add the Expert Panel button**

Find the `{/* Reset button */}` comment in the header section (around line 252). Add the Expert Panel button immediately **before** the reset button:

```tsx
{/* Expert Panel button */}
<button
  onClick={onOpenExpertPanel}
  disabled={!expertPanelAvailable}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
  style={{
    border: '1px solid rgba(99,102,241,0.35)',
    color: 'rgba(165,180,252,0.85)',
    background: 'rgba(99,102,241,0.06)',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'rgba(99,102,241,0.14)'
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
  }}
>
  ✦ {strings.EXPERT_PANEL_BUTTON}
</button>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or only the DesktopDashboard error from Task 4 still pending).

---

## Task 6: Add button to `DesktopDashboard`

**Files:**
- Modify: `components/DesktopDashboard.tsx`

- [ ] **Step 1: Add new props to the `Props` interface**

In `DesktopDashboard.tsx`, find `interface Props {` and add:

```ts
onOpenExpertPanel: () => void
expertPanelAvailable: boolean
```

- [ ] **Step 2: Destructure new props in the component**

Find `export default function DesktopDashboard({` and add `onOpenExpertPanel, expertPanelAvailable` to the destructuring.

- [ ] **Step 3: Pass the props to `ResultView`**

Inside `DesktopDashboard`, find where `<ResultView` is rendered and pass down the two new props:

```tsx
<ResultView
  ...existing props...
  onOpenExpertPanel={onOpenExpertPanel}
  expertPanelAvailable={expertPanelAvailable}
/>
```

- [ ] **Step 4: Add new props to `ResultView` inside DesktopDashboard**

Find `function ResultView({...})` and its props type. Add:

```ts
onOpenExpertPanel: () => void
expertPanelAvailable: boolean
```

- [ ] **Step 5: Add the Expert Panel button in `ResultView`**

In `ResultView`, find the reset button (look for `onReset` or "Başqa Yer" text). Add the Expert Panel button immediately before it, using the same style as in Task 5 Step 3:

```tsx
{/* Expert Panel button */}
<button
  onClick={onOpenExpertPanel}
  disabled={!expertPanelAvailable}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
  style={{
    border: '1px solid rgba(99,102,241,0.35)',
    color: 'rgba(165,180,252,0.85)',
    background: 'rgba(99,102,241,0.06)',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'rgba(99,102,241,0.14)'
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
  }}
>
  ✦ {strings.EXPERT_PANEL_BUTTON}
</button>
```

- [ ] **Step 6: Verify TypeScript compiles with 0 errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Run existing tests**

```bash
npm test
```

Expected: all 61 tests pass (no scoring/overpass logic was changed).

- [ ] **Step 8: Commit everything from Tasks 4, 5, 6**

```bash
git add app/page.tsx components/ResultSheet.tsx components/DesktopDashboard.tsx
git commit -m "feat: wire Expert Panel button and modal into result views"
```

---

## Task 7: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Full happy path**

1. Open `http://localhost:3000`
2. Click "Başlayaq" → drop a pin in Baku city center
3. Enter "kafe" → click "Təhlil et"
4. Wait for result to appear
5. Verify "Ekspert Paneli" / "Expert Panel" button is visible in the result header area
6. Click the button → modal opens with 4 skeleton cards
7. After ~3–5 seconds: 4 agent cards fill in with opinion text, verdict card appears at bottom
8. Press Escape → modal closes
9. Click button again → modal opens instantly (cached, no loading spinner)
10. Click backdrop → modal closes

- [ ] **Step 3: Reset clears cache**

1. Click reset ("Başqa Yer Təhlil Et")
2. Drop new pin, enter new business, get new result
3. Click "Ekspert Paneli" → should fetch fresh data (loading state visible again)

- [ ] **Step 4: Language switch**

1. Get a result in AZ mode
2. Open expert panel → agents speak Azerbaijani
3. Close modal, switch to EN
4. Open expert panel → still shows cached AZ result (cache is per-analysis, language switch alone doesn't invalidate)
   This is expected behavior per spec ("cache is scoped to the current analysis").

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Expert Panel feature"
```
