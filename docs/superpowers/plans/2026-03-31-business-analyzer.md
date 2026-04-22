# Business Location Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js single-page app where users drop a map pin in Azerbaijan, enter a business type, and receive an AI-powered success analysis via Groq + OpenStreetMap data.

**Architecture:** Sequential pipeline — user drops pin → `/api/places` fetches Overpass API data → `/api/analyze` sends enriched context to Groq (llama3-8b-8192) → result displayed as a slide-up bottom sheet. No database; analyses persist in browser localStorage.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Leaflet.js + react-leaflet, Groq SDK (`groq-sdk`), Overpass API (OpenStreetMap, free/no key), Netlify deployment via `@netlify/plugin-nextjs`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/layout.tsx` | Root HTML layout, `lang="az"`, page metadata |
| `app/page.tsx` | Single page — 4-state machine (map/input/loading/result) |
| `app/globals.css` | Tailwind base, slide-up keyframe animation |
| `app/api/places/route.ts` | POST /api/places — wraps Overpass fetch |
| `app/api/analyze/route.ts` | POST /api/analyze — wraps Groq call |
| `components/Map.tsx` | Leaflet map, pin drop + drag (dynamic, no SSR) |
| `components/BusinessInputModal.tsx` | Floating modal for business type input |
| `components/LoadingOverlay.tsx` | Spinner + two-step progress indicator |
| `components/ResultSheet.tsx` | Bottom sheet: score, pros, cons, verdict |
| `components/HistorySidebar.tsx` | Right-side panel reading localStorage history |
| `lib/types.ts` | Shared TypeScript interfaces |
| `lib/az.ts` | All Azerbaijani UI string constants |
| `lib/overpass.ts` | Overpass query builder + OSM data parser |
| `lib/groq.ts` | Groq prompt builder + API call + JSON parser |
| `lib/storage.ts` | localStorage read/write helpers |
| `__tests__/lib/storage.test.ts` | Unit tests for storage helpers |
| `__tests__/lib/overpass.test.ts` | Unit tests for Overpass parsing |
| `__tests__/lib/groq.test.ts` | Unit tests for Groq prompt + JSON parse |
| `__tests__/api/places.test.ts` | Integration tests for /api/places route |
| `__tests__/api/analyze.test.ts` | Integration tests for /api/analyze route |
| `.env.local.example` | Env var template |
| `netlify.toml` | Netlify build + plugin config |
| `jest.config.js` | Jest configuration |
| `jest.setup.ts` | Jest setup (jest-dom matchers) |

---

### Task 1: Project Scaffold + Test Setup

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Create: `netlify.toml`
- Create: `.env.local.example`
- Create: `.env.local` (fill with real key)

- [ ] **Step 1: Scaffold Next.js inside the existing directory**

Run from `c:\Users\Matin Asgarov\Desktop\Projects\hanimenebiznes`:
```bash
npx create-next-app@latest . --typescript --app --tailwind --no-src-dir --eslint --import-alias "@/*"
```
When prompted about existing files (CLAUDE.md, Documentation.md), choose to keep them.
Expected: package.json, app/, next.config.ts created.

- [ ] **Step 2: Install runtime dependencies**
```bash
npm install leaflet react-leaflet @types/leaflet groq-sdk
```
Expected: packages added, no peer dependency errors.

- [ ] **Step 3: Install test dependencies**
```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 4: Install Netlify plugin**
```bash
npm install --save-dev @netlify/plugin-nextjs
```

- [ ] **Step 5: Create jest.config.js**
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFrameWork: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
})
```

- [ ] **Step 6: Create jest.setup.ts**
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create netlify.toml**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- [ ] **Step 8: Create .env.local.example**
```
GROQ_API_KEY=your_groq_api_key_here
```

- [ ] **Step 9: Create .env.local** (get key from console.groq.com — free account)
```
GROQ_API_KEY=<your_actual_key>
```

- [ ] **Step 10: Add test scripts to package.json**

In the `"scripts"` section add:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 11: Verify Next.js build**
```bash
npm run build
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 12: Commit**
```bash
git add package.json package-lock.json jest.config.js jest.setup.ts netlify.toml .env.local.example next.config.ts tailwind.config.ts tsconfig.json
git commit -m "feat: scaffold Next.js project with Leaflet, Groq, Jest, Netlify"
```

---

### Task 2: Shared Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**
```typescript
export interface LatLng {
  lat: number
  lng: number
}

export interface OSMElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

export interface PlacesContext {
  competitors: number
  areaType: 'residential' | 'commercial' | 'mixed'
  amenities: string[]
  totalBusinesses: number
}

export interface AnalysisResult {
  score: number
  pros: string[]
  cons: string[]
  verdict: string
}

export interface SavedAnalysis {
  id: string
  date: string
  lat: number
  lng: number
  business: string
  score: number
  pros: string[]
  cons: string[]
  verdict: string
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: Azerbaijani String Constants

**Files:**
- Create: `lib/az.ts`

- [ ] **Step 1: Create lib/az.ts**
```typescript
export const AZ = {
  MAP_INSTRUCTION: 'Yer seçmək üçün xəritəyə klikləyin',
  MODAL_TITLE: 'Bu ərazidə hansı biznes açmaq istəyirsiniz?',
  MODAL_PLACEHOLDER: 'Məsələn: Oyun klubu, Restoran, Kafe...',
  MODAL_SUBMIT: 'Təhlil et',
  MODAL_CLOSE: 'Bağla',
  LOADING_STEP_1: 'Sahə məlumatları yüklənir...',
  LOADING_STEP_2: 'AI ilə təhlil edilir...',
  RESULT_PROBABILITY: 'Uğur ehtimalı',
  RESULT_PROS: 'Müsbət cəhətlər',
  RESULT_CONS: 'Risklər',
  RESULT_VERDICT: 'Ümumi qiymətləndirmə',
  RESULT_RESET: 'Başqa yer təhlil et',
  HISTORY_BUTTON_LABEL: 'Tarixçə',
  HISTORY_TITLE: 'Keçmiş təhlillər',
  HISTORY_EMPTY: 'Hələ heç bir təhlil yoxdur.',
  ERROR_NO_DATA: 'Bu ərazidə kifayət qədər məlumat yoxdur. Daha məskunlaşmış bir yer sınayın.',
  ERROR_ANALYSIS_FAILED: 'Təhlil uğursuz oldu. Birazdan yenidən cəhd edin.',
} as const
```

- [ ] **Step 2: Commit**
```bash
git add lib/az.ts
git commit -m "feat: add Azerbaijani UI string constants"
```

---

### Task 4: localStorage Helpers + Tests

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/storage.test.ts`:
```typescript
import { saveAnalysis, getAnalyses, clearAnalyses } from '@/lib/storage'
import type { SavedAnalysis } from '@/lib/types'

const mockAnalysis: SavedAnalysis = {
  id: 'test-id-1',
  date: '2026-03-31',
  lat: 40.4093,
  lng: 49.8671,
  business: 'Oyun Klubu',
  score: 72,
  pros: ['Yaxşı yer'],
  cons: ['Az müştəri'],
  verdict: 'Orta perspektiv.',
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves an analysis', () => {
    saveAnalysis(mockAnalysis)
    const analyses = getAnalyses()
    expect(analyses).toHaveLength(1)
    expect(analyses[0].id).toBe('test-id-1')
  })

  it('accumulates multiple analyses, newest first', () => {
    saveAnalysis(mockAnalysis)
    saveAnalysis({ ...mockAnalysis, id: 'test-id-2' })
    const analyses = getAnalyses()
    expect(analyses).toHaveLength(2)
    expect(analyses[0].id).toBe('test-id-2')
  })

  it('returns empty array when nothing saved', () => {
    expect(getAnalyses()).toEqual([])
  })

  it('clears all analyses', () => {
    saveAnalysis(mockAnalysis)
    clearAnalyses()
    expect(getAnalyses()).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npm test -- --testPathPattern=storage
```
Expected: FAIL — `Cannot find module '@/lib/storage'`

- [ ] **Step 3: Create lib/storage.ts**
```typescript
import type { SavedAnalysis } from './types'

const STORAGE_KEY = 'hanimenebiznes_analyses'

export function saveAnalysis(analysis: SavedAnalysis): void {
  const existing = getAnalyses()
  existing.unshift(analysis)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getAnalyses(): SavedAnalysis[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedAnalysis[]
  } catch {
    return []
  }
}

export function clearAnalyses(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npm test -- --testPathPattern=storage
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**
```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add localStorage helpers with tests"
```

---

### Task 5: Overpass API Lib + Tests

**Files:**
- Create: `lib/overpass.ts`
- Create: `__tests__/lib/overpass.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/overpass.test.ts`:
```typescript
import { fetchPlacesContext } from '@/lib/overpass'

global.fetch = jest.fn()

const mockOSMResponse = {
  elements: [
    { type: 'node', id: 1, tags: { amenity: 'restaurant', name: 'Kafe 1' } },
    { type: 'node', id: 2, tags: { amenity: 'restaurant', name: 'Kafe 2' } },
    { type: 'node', id: 3, tags: { shop: 'clothes', name: 'Paltar Mağazası' } },
    { type: 'node', id: 4, tags: { amenity: 'school', name: 'Məktəb 1' } },
    { type: 'node', id: 5, tags: { amenity: 'bus_station', name: 'Avtobus' } },
    { type: 'node', id: 6, tags: { office: 'company', name: 'Ofis' } },
  ],
}

describe('fetchPlacesContext', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOSMResponse,
    })
  })

  afterEach(() => jest.clearAllMocks())

  it('returns correct totalBusinesses count', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.totalBusinesses).toBe(6)
  })

  it('counts competitors matching business type keyword', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.competitors).toBe(2)
  })

  it('includes school in amenities summary', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.amenities.some(a => a.includes('məktəb'))).toBe(true)
  })

  it('includes transit in amenities summary', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.amenities.some(a => a.includes('nəqliyyat'))).toBe(true)
  })

  it('infers commercial area type when many shops/offices', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'cafe')
    expect(result.areaType).toBe('commercial')
  })

  it('throws on Overpass API error response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 })
    await expect(fetchPlacesContext(40.4093, 49.8671, 'restaurant')).rejects.toThrow(
      'Overpass API error: 429'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npm test -- --testPathPattern=overpass
```
Expected: FAIL — `Cannot find module '@/lib/overpass'`

- [ ] **Step 3: Create lib/overpass.ts**
```typescript
import type { OSMElement, PlacesContext } from './types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS = 500

function buildQuery(lat: number, lng: number): string {
  const r = RADIUS
  return (
    `[out:json][timeout:25];` +
    `(` +
    `node["shop"](around:${r},${lat},${lng});` +
    `node["amenity"](around:${r},${lat},${lng});` +
    `node["leisure"](around:${r},${lat},${lng});` +
    `node["office"](around:${r},${lat},${lng});` +
    `way["shop"](around:${r},${lat},${lng});` +
    `way["amenity"](around:${r},${lat},${lng});` +
    `);out tags;`
  )
}

function inferAreaType(elements: OSMElement[]): 'residential' | 'commercial' | 'mixed' {
  const residential = elements.filter(
    (e) =>
      e.tags?.amenity === 'school' ||
      e.tags?.amenity === 'kindergarten' ||
      e.tags?.building === 'residential'
  ).length
  const commercial = elements.filter(
    (e) =>
      e.tags?.shop ||
      e.tags?.office ||
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'bank'
  ).length
  if (commercial > residential * 2) return 'commercial'
  if (residential > commercial * 2) return 'residential'
  return 'mixed'
}

function extractAmenities(elements: OSMElement[]): string[] {
  const result: string[] = []
  const schools = elements.filter(
    (e) => e.tags?.amenity === 'school' || e.tags?.amenity === 'university'
  ).length
  const transit = elements.filter(
    (e) =>
      e.tags?.amenity === 'bus_station' ||
      e.tags?.railway === 'station' ||
      e.tags?.railway === 'subway_entrance'
  ).length
  const food = elements.filter(
    (e) =>
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'fast_food'
  ).length
  const shops = elements.filter((e) => e.tags?.shop).length

  if (schools > 0) result.push(`${schools} məktəb/universitet`)
  if (transit > 0) result.push(`${transit} nəqliyyat dayanacağı`)
  if (food > 0) result.push(`${food} yemək yeri`)
  if (shops > 0) result.push(`${shops} mağaza`)
  return result
}

function countCompetitors(elements: OSMElement[], businessType: string): number {
  const lower = businessType.toLowerCase()
  return elements.filter((e) => {
    const name = (e.tags?.name || '').toLowerCase()
    const amenity = (e.tags?.amenity || '').toLowerCase()
    const shop = (e.tags?.shop || '').toLowerCase()
    const leisure = (e.tags?.leisure || '').toLowerCase()
    return (
      name.includes(lower) ||
      amenity.includes(lower) ||
      shop.includes(lower) ||
      leisure.includes(lower)
    )
  }).length
}

export async function fetchPlacesContext(
  lat: number,
  lng: number,
  businessType: string
): Promise<PlacesContext> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(buildQuery(lat, lng))}`,
  })
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`)
  }
  const data = (await response.json()) as { elements: OSMElement[] }
  const elements = data.elements || []
  return {
    competitors: countCompetitors(elements, businessType),
    areaType: inferAreaType(elements),
    amenities: extractAmenities(elements),
    totalBusinesses: elements.length,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npm test -- --testPathPattern=overpass
```
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**
```bash
git add lib/overpass.ts __tests__/lib/overpass.test.ts
git commit -m "feat: add Overpass API lib with OSM parsing and tests"
```

---

### Task 6: Groq Lib + Tests

**Files:**
- Create: `lib/groq.ts`
- Create: `__tests__/lib/groq.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/groq.test.ts`:
```typescript
import { analyzeLocation } from '@/lib/groq'
import type { PlacesContext } from '@/lib/types'

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }))
})

import Groq from 'groq-sdk'

const mockCtx: PlacesContext = {
  competitors: 3,
  areaType: 'commercial',
  amenities: ['2 məktəb/universitet', '1 nəqliyyat dayanacağı'],
  totalBusinesses: 47,
}

function getMockCreate() {
  return (Groq as jest.MockedClass<typeof Groq>).mock.results[0].value.chat.completions.create as jest.Mock
}

describe('analyzeLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-instantiate mock for each test
    ;(Groq as jest.MockedClass<typeof Groq>).mockClear()
  })

  it('returns parsed AnalysisResult on valid Groq response', async () => {
    const mockPayload = {
      score: 75,
      pros: ['Yaxşı trafik', 'Az rəqabət'],
      cons: ['Yüksək icarə'],
      verdict: 'Bu biznes üçün yaxşı yer.',
    }
    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockPayload) } }],
          }),
        },
      },
    } as any))

    const result = await analyzeLocation(40.4093, 49.8671, 'Oyun Klubu', mockCtx)
    expect(result.score).toBe(75)
    expect(result.pros).toHaveLength(2)
    expect(result.cons).toHaveLength(1)
    expect(result.verdict).toBe('Bu biznes üçün yaxşı yer.')
  })

  it('retries once on invalid JSON then returns result', async () => {
    const mockPayload = { score: 60, pros: ['a'], cons: ['b'], verdict: 'Orta.' }
    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'not valid json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(mockPayload) } }] })

    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any))

    const result = await analyzeLocation(40.4093, 49.8671, 'Restoran', mockCtx)
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result.score).toBe(60)
  })

  it('throws after 2 failed JSON parses', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    })
    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any))

    await expect(analyzeLocation(40.4093, 49.8671, 'Kafe', mockCtx)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npm test -- --testPathPattern=groq
```
Expected: FAIL — `Cannot find module '@/lib/groq'`

- [ ] **Step 3: Create lib/groq.ts**
```typescript
import Groq from 'groq-sdk'
import type { PlacesContext, AnalysisResult } from './types'

const MODEL = 'llama3-8b-8192'

function buildPrompt(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext
): string {
  return `Sən biznes məsləhətçisisən. Aşağıdakı məlumatlar əsasında Azərbaycanda göstərilən yerdə biznesin uğur ehtimalını qiymətləndir.

Məkan: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Azərbaycan)
Biznes növü: ${businessType}
Yaxınlıqdakı məlumatlar:
- 500m radiusda oxşar müəssisələr: ${ctx.competitors}
- Ərazi tipi: ${ctx.areaType}
- Yaxınlıqdakı obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'məlumat yoxdur'}
- Ərazidəki ümumi müəssisə sayı: ${ctx.totalBusinesses}

Yalnız JSON formatında cavab ver (başqa heç nə yazma):
{
  "score": <0-100 arası tam rəqəm>,
  "pros": ["müsbət cəhət 1", "müsbət cəhət 2", "müsbət cəhət 3"],
  "cons": ["risk 1", "risk 2", "risk 3"],
  "verdict": "Bir cümlə ilə ümumi qiymətləndirmə."
}

Bütün mətn Azərbaycan dilində olmalıdır.`
}

function parseResponse(content: string): AnalysisResult {
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as AnalysisResult
  if (
    typeof parsed.score !== 'number' ||
    !Array.isArray(parsed.pros) ||
    !Array.isArray(parsed.cons) ||
    typeof parsed.verdict !== 'string'
  ) {
    throw new Error('Invalid response shape')
  }
  return parsed
}

export async function analyzeLocation(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext
): Promise<AnalysisResult> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prompt = buildPrompt(lat, lng, businessType, ctx)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = response.choices[0]?.message?.content || ''
    try {
      return parseResponse(content)
    } catch {
      if (attempt === 1) throw new Error('Groq returned invalid JSON after 2 attempts')
    }
  }
  throw new Error('Analysis failed')
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npm test -- --testPathPattern=groq
```
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**
```bash
git add lib/groq.ts __tests__/lib/groq.test.ts
git commit -m "feat: add Groq lib with prompt builder, retry logic, and tests"
```

---

### Task 7: /api/places Route + Tests

**Files:**
- Create: `app/api/places/route.ts`
- Create: `__tests__/api/places.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/places.test.ts`:
```typescript
import { POST } from '@/app/api/places/route'
import * as overpass from '@/lib/overpass'
import { NextRequest } from 'next/server'

jest.mock('@/lib/overpass')

const mockContext = {
  competitors: 3,
  areaType: 'commercial',
  amenities: ['2 yemək yeri'],
  totalBusinesses: 20,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/places', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/places', () => {
  it('returns 200 with places context on success', async () => {
    ;(overpass.fetchPlacesContext as jest.Mock).mockResolvedValue(mockContext)
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671, businessType: 'Restoran' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockContext)
  })

  it('returns 400 when lat is missing', async () => {
    const res = await POST(makeRequest({ lng: 49.8671, businessType: 'Kafe' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when businessType is missing', async () => {
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671 }))
    expect(res.status).toBe(400)
  })

  it('returns 500 on Overpass failure', async () => {
    ;(overpass.fetchPlacesContext as jest.Mock).mockRejectedValue(new Error('timeout'))
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671, businessType: 'Restoran' }))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npm test -- --testPathPattern="api/places"
```
Expected: FAIL — `Cannot find module '@/app/api/places/route'`

- [ ] **Step 3: Create app/api/places/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { fetchPlacesContext } from '@/lib/overpass'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !body.businessType
  ) {
    return NextResponse.json(
      { error: 'lat, lng, and businessType are required' },
      { status: 400 }
    )
  }
  try {
    const context = await fetchPlacesContext(body.lat, body.lng, body.businessType)
    return NextResponse.json(context)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npm test -- --testPathPattern="api/places"
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**
```bash
git add app/api/places/route.ts __tests__/api/places.test.ts
git commit -m "feat: add /api/places route with validation and tests"
```

---

### Task 8: /api/analyze Route + Tests

**Files:**
- Create: `app/api/analyze/route.ts`
- Create: `__tests__/api/analyze.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/analyze.test.ts`:
```typescript
import { POST } from '@/app/api/analyze/route'
import * as groqLib from '@/lib/groq'
import { NextRequest } from 'next/server'

jest.mock('@/lib/groq')

const mockResult = {
  score: 72,
  pros: ['Yaxşı trafik'],
  cons: ['Yüksək rəqabət'],
  verdict: 'Orta perspektiv.',
}

const validBody = {
  lat: 40.4093,
  lng: 49.8671,
  businessType: 'Oyun Klubu',
  placesContext: {
    competitors: 2,
    areaType: 'commercial',
    amenities: ['1 məktəb/universitet'],
    totalBusinesses: 15,
  },
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/analyze', () => {
  it('returns 200 with analysis result on success', async () => {
    ;(groqLib.analyzeLocation as jest.Mock).mockResolvedValue(mockResult)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockResult)
  })

  it('returns 400 when placesContext is missing', async () => {
    const { placesContext: _, ...withoutCtx } = validBody
    const res = await POST(makeRequest(withoutCtx))
    expect(res.status).toBe(400)
  })

  it('returns 400 when businessType is missing', async () => {
    const { businessType: _, ...withoutBiz } = validBody
    const res = await POST(makeRequest(withoutBiz))
    expect(res.status).toBe(400)
  })

  it('returns 500 on Groq failure', async () => {
    ;(groqLib.analyzeLocation as jest.Mock).mockRejectedValue(new Error('Groq error'))
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npm test -- --testPathPattern="api/analyze"
```
Expected: FAIL — `Cannot find module '@/app/api/analyze/route'`

- [ ] **Step 3: Create app/api/analyze/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { analyzeLocation } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !body.businessType ||
    !body.placesContext
  ) {
    return NextResponse.json(
      { error: 'lat, lng, businessType, and placesContext are required' },
      { status: 400 }
    )
  }
  try {
    const result = await analyzeLocation(body.lat, body.lng, body.businessType, body.placesContext)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npm test -- --testPathPattern="api/analyze"
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Run all tests**
```bash
npm test
```
Expected: PASS — all 17 tests passing across 5 suites.

- [ ] **Step 6: Commit**
```bash
git add app/api/analyze/route.ts __tests__/api/analyze.test.ts
git commit -m "feat: add /api/analyze route with validation and tests"
```

---

### Task 9: Map Component

**Files:**
- Create: `components/Map.tsx`

- [ ] **Step 1: Create components/Map.tsx**

Note: This component is always loaded via `dynamic(..., { ssr: false })` from page.tsx. It must never be imported directly in a server context.

```tsx
'use client'
import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/types'

interface MapProps {
  onPinDrop: (lat: number, lng: number) => void
  pin: LatLng | null
  dimmed: boolean
}

const BAKU_CENTER: [number, number] = [40.4093, 49.8671]
const INITIAL_ZOOM = 13

const PIN_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  className: '',
})

export default function Map({ onPinDrop, pin, dimmed }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const stableDrop = useCallback(onPinDrop, [onPinDrop])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current).setView(BAKU_CENTER, INITIAL_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => stableDrop(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [stableDrop])

  useEffect(() => {
    if (!mapRef.current) return
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (pin) {
      const marker = L.marker([pin.lat, pin.lng], { icon: PIN_ICON, draggable: true }).addTo(
        mapRef.current
      )
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        stableDrop(pos.lat, pos.lng)
      })
      markerRef.current = marker
    }
  }, [pin, stableDrop])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    />
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add components/Map.tsx
git commit -m "feat: add Leaflet map component with pin drop and drag"
```

---

### Task 10: BusinessInputModal Component

**Files:**
- Create: `components/BusinessInputModal.tsx`

- [ ] **Step 1: Create components/BusinessInputModal.tsx**
```tsx
'use client'
import { useState } from 'react'
import { AZ } from '@/lib/az'

interface Props {
  onSubmit: (businessType: string) => void
  onClose: () => void
}

export default function BusinessInputModal({ onSubmit, onClose }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 pointer-events-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{AZ.MODAL_TITLE}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={AZ.MODAL_PLACEHOLDER}
            className="border border-gray-300 rounded-lg px-4 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              {AZ.MODAL_CLOSE}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {AZ.MODAL_SUBMIT}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/BusinessInputModal.tsx
git commit -m "feat: add business input modal component"
```

---

### Task 11: LoadingOverlay Component

**Files:**
- Create: `components/LoadingOverlay.tsx`

- [ ] **Step 1: Create components/LoadingOverlay.tsx**
```tsx
'use client'
import { AZ } from '@/lib/az'

interface Props {
  step: 1 | 2
}

export default function LoadingOverlay({ step }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col gap-2 text-sm min-w-[200px]">
          <div
            className={`flex items-center gap-2 ${
              step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'
            }`}
          >
            <span className="w-4 text-center">{step > 1 ? '✓' : '·'}</span>
            <span>{AZ.LOADING_STEP_1}</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              step === 2 ? 'text-blue-600 font-medium' : 'text-gray-400'
            }`}
          >
            <span className="w-4 text-center">·</span>
            <span>{AZ.LOADING_STEP_2}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/LoadingOverlay.tsx
git commit -m "feat: add loading overlay with two-step progress indicator"
```

---

### Task 12: ResultSheet Component

**Files:**
- Create: `components/ResultSheet.tsx`

- [ ] **Step 1: Create components/ResultSheet.tsx**
```tsx
'use client'
import { AZ } from '@/lib/az'
import type { AnalysisResult } from '@/lib/types'

interface Props {
  business: string
  result: AnalysisResult
  onReset: () => void
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200'
  if (score >= 40) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

export default function ResultSheet({ business, result, onReset }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-2xl p-6 max-h-[72vh] overflow-y-auto animate-slide-up">
      <div className={`flex items-center justify-between mb-2 p-4 rounded-2xl border ${scoreBg(result.score)}`}>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{AZ.RESULT_PROBABILITY}</p>
          <h2 className="text-lg font-bold text-gray-800">{business}</h2>
        </div>
        <span className={`text-5xl font-extrabold ${scoreColor(result.score)}`}>
          {result.score}%
        </span>
      </div>

      <div className="mb-4 mt-4">
        <h3 className="text-sm font-semibold text-green-700 mb-2">{AZ.RESULT_PROS}</h3>
        <ul className="space-y-1.5">
          {result.pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              {pro}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-red-600 mb-2">{AZ.RESULT_CONS}</h3>
        <ul className="space-y-1.5">
          {result.cons.map((con, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-400 mt-0.5 shrink-0">✗</span>
              {con}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {AZ.RESULT_VERDICT}
        </h3>
        <p className="text-sm text-gray-700 italic">"{result.verdict}"</p>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        {AZ.RESULT_RESET}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/ResultSheet.tsx
git commit -m "feat: add result bottom sheet with score, pros, cons, verdict"
```

---

### Task 13: HistorySidebar Component

**Files:**
- Create: `components/HistorySidebar.tsx`

- [ ] **Step 1: Create components/HistorySidebar.tsx**
```tsx
'use client'
import { AZ } from '@/lib/az'
import type { SavedAnalysis } from '@/lib/types'

interface Props {
  analyses: SavedAnalysis[]
  onClose: () => void
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-green-100 text-green-700'
      : score >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score}%</span>
}

export default function HistorySidebar({ analyses, onClose }: Props) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 z-[1000] bg-white shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800 text-sm">{AZ.HISTORY_TITLE}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {analyses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-10">{AZ.HISTORY_EMPTY}</p>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-800 text-sm">{a.business}</span>
                  <ScoreBadge score={a.score} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-400">{a.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/HistorySidebar.tsx
git commit -m "feat: add history sidebar reading from localStorage"
```

---

### Task 14: Main Page, Layout, and Global Styles

**Files:**
- Modify: `app/page.tsx` (replace default content)
- Modify: `app/layout.tsx` (replace default content)
- Modify: `app/globals.css` (add slide-up animation)

- [ ] **Step 1: Replace app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

- [ ] **Step 2: Replace app/layout.tsx**
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Biznes Analizatoru',
  description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Replace app/page.tsx**
```tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AZ } from '@/lib/az'
import { saveAnalysis, getAnalyses } from '@/lib/storage'
import BusinessInputModal from '@/components/BusinessInputModal'
import LoadingOverlay from '@/components/LoadingOverlay'
import ResultSheet from '@/components/ResultSheet'
import HistorySidebar from '@/components/HistorySidebar'
import type { AnalysisResult, LatLng, SavedAnalysis } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type AppState = 'map' | 'input' | 'loading' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('map')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

  const handlePinDrop = useCallback(
    (lat: number, lng: number) => {
      if (appState !== 'map') return
      setPin({ lat, lng })
      setError(null)
      setAppState('input')
    },
    [appState]
  )

  const handleBusinessSubmit = async (business: string) => {
    if (!pin) return
    setBusinessType(business)
    setAppState('loading')
    setLoadingStep(1)
    setError(null)

    try {
      const placesRes = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business }),
      })
      if (!placesRes.ok) throw new Error('places')
      setLoadingStep(2)
      const placesContext = await placesRes.json()

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business, placesContext }),
      })
      if (!analyzeRes.ok) throw new Error('analyze')

      const analysisResult: AnalysisResult = await analyzeRes.json()
      setResult(analysisResult)
      setAppState('result')

      const saved: SavedAnalysis = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        lat: pin.lat,
        lng: pin.lng,
        business,
        ...analysisResult,
      }
      saveAnalysis(saved)
      setAnalyses(getAnalyses())
    } catch (err) {
      const msg =
        (err as Error).message === 'places' ? AZ.ERROR_NO_DATA : AZ.ERROR_ANALYSIS_FAILED
      setError(msg)
      setAppState('map')
    }
  }

  const handleReset = () => {
    setAppState('map')
    setPin(null)
    setResult(null)
    setBusinessType('')
    setError(null)
  }

  const isDimmed = appState === 'loading' || appState === 'result'

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Map onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} />

      {appState === 'map' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-gray-600 shadow-md pointer-events-none select-none">
          {AZ.MAP_INSTRUCTION}
        </div>
      )}

      {error && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl shadow-md max-w-xs text-center">
          {error}
        </div>
      )}

      {appState === 'input' && (
        <BusinessInputModal onSubmit={handleBusinessSubmit} onClose={handleReset} />
      )}

      {appState === 'loading' && <LoadingOverlay step={loadingStep} />}

      {appState === 'result' && result && (
        <ResultSheet business={businessType} result={result} onReset={handleReset} />
      )}

      <button
        onClick={() => setShowHistory((h) => !h)}
        title={AZ.HISTORY_BUTTON_LABEL}
        className="absolute top-4 right-4 z-[999] bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow text-lg"
      >
        🕐
      </button>

      {showHistory && (
        <HistorySidebar analyses={analyses} onClose={() => setShowHistory(false)} />
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Run all tests**
```bash
npm test
```
Expected: all 17 tests passing.

- [ ] **Step 6: Run the dev server and manually test the flow**
```bash
npm run dev
```
Open http://localhost:3000. Verify:
- Map loads centered on Baku
- Clicking the map shows the input modal
- Typing a business name and submitting triggers the loading overlay
- Loading overlay shows step 1 then step 2
- Result sheet slides up with score, pros, cons, verdict
- "Başqa yer təhlil et" resets to map state
- Clock icon opens history sidebar showing the saved analysis

- [ ] **Step 7: Commit**
```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: wire up main page state machine with all components"
```

---

### Task 15: Final Build + Netlify Deployment Check

- [ ] **Step 1: Run production build**
```bash
npm run build
```
Expected: `✓ Compiled successfully`. Note any warnings but no errors.

- [ ] **Step 2: Verify .env.local is in .gitignore**
```bash
cat .gitignore | grep env
```
Expected: `.env.local` or `.env*.local` appears in output. If not, add it:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Commit final state**
```bash
git add .
git status  # verify .env.local is NOT listed as staged
git commit -m "feat: complete business location analyzer — ready for Netlify deploy"
```

- [ ] **Step 4: Deploy to Netlify**

Option A — Netlify CLI:
```bash
npx netlify deploy --prod
```

Option B — Connect repo via Netlify dashboard at app.netlify.com:
1. New site → Import from Git → select repo
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variable: `GROQ_API_KEY` = your key
5. Deploy

Expected: site live at `https://<your-site>.netlify.app`
