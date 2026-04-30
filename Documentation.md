# myblocate — Project Documentation

**myblocate** is a web application that helps users in Azerbaijan evaluate how suitable a location is for opening a business. The user drops a pin on a map, enters a business type, and the app returns a score with AI-generated pros, cons, and a plain-language verdict — all in Azerbaijani (with English toggle).

---

## What the App Does

1. **Landing page** — introduces the app with an AI disclaimer before anything else; language toggle (AZ/EN) persists across sessions
2. **Map view** — user clicks any point in Azerbaijan to drop a pin (OpenStreetMap, Leaflet); location search bar (Nominatim) lets users fly to a place by name
3. **Map layer controls** — 4 toggleable overlay buttons (Bus Stops, Metro, Transport, Competitors) appear on the map in result state; each queries Overpass and renders colored dot markers; layers reset on new pin drop
4. **Business input** — modal asks what kind of business they plan to open (validated: min 2 chars, must contain letters)
5. **Data collection** — app queries OpenStreetMap (Overpass API) + AZ government business dataset for real businesses within 500 m of the pin; also looks up nearest Baku metro station and urban tier from static datasets
6. **Scoring** — a deterministic 7-factor algorithm calculates a 0–95 score from the collected data, returning both the score and a per-factor breakdown
7. **AI analysis** — Groq AI receives the score and OSM context, returns pros/cons/verdict in the user's active language (AZ or EN)
8. **Desktop dashboard** — right-panel UI on desktop showing score header, agent toolbar, chart tabs (dual/bars/ring), OSM data grid, inline expert panel, and action buttons; all backed by a background image with glassmorphism layers
9. **Expert Panel** — 6 AI agents with professional consultative personas independently analyse the location; each shows a confidence meter and SVG avatar; agents can be toggled via the agent toolbar
10. **PDF export** — downloads a formatted A4 PDF report with logo, score pill, pros/cons, factor bars, and OSM data grid
11. **History** — past analyses are stored in `localStorage` and viewable in a sidebar
12. **Warning banners** — amber when business type is unrecognized; red when a dominant competitor chain is within 100 m

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation | Framer Motion | — |
| Map | Leaflet (SSR-disabled via `dynamic`) | ^1.9.4 |
| AI | Groq SDK (`llama-3.3-70b-versatile`) | ^1.1.2 |
| Map data | Overpass API (OpenStreetMap) | public API |
| AZ business data | `lib/az-places-compact.ts` (bundled dataset) | — |
| Metro data | `lib/metro-stations.ts` (27 stations, 2025 ridership) | static, regenerate from `datasets/` |
| Settlement data | `lib/settlements.ts` (4,589 AZ settlements) | static, regenerate from `datasets/` |
| Testing | Jest + ts-jest | ^30 |
| Deployment | Netlify (`@netlify/plugin-nextjs`) | ^5 |

---

## Project Structure

```
hanimenebiznes/
├── app/
│   ├── globals.css              # Tailwind v4 import + animation classes + design tokens
│   ├── layout.tsx               # Root layout (sets font, viewport, metadata)
│   ├── page.tsx                 # Main page — state machine, all UI flows
│   ├── robots.ts                # /robots.txt route
│   ├── sitemap.ts               # /sitemap.xml route
│   └── api/
│       ├── places/route.ts      # POST /api/places — validates input, queries Overpass, returns PlacesContext
│       ├── analyze/route.ts     # POST /api/analyze — calculates score, calls Groq
│       ├── expert-panel/route.ts # POST /api/expert-panel — 6-agent expert AI panel with confidence ratings
│       ├── layers/route.ts      # POST /api/layers — Overpass queries for map layer overlays
│       └── feedback/route.ts    # POST /api/feedback
├── components/
│   ├── Map.tsx                  # Leaflet map, SSR-disabled, ref-stable callback, layer panel toggle UI
│   ├── MapErrorBoundary.tsx     # Class error boundary wrapping Map
│   ├── LandingPage.tsx          # Splash/intro screen with language toggle
│   ├── BusinessInputModal.tsx   # Business type input modal
│   ├── LoadingOverlay.tsx       # 4-step loading animation
│   ├── ResultSheet.tsx          # Score display with expandable details (mobile)
│   ├── DesktopDashboard.tsx     # Right-panel dashboard (desktop): score header, agent toolbar, charts, OSM grid, expert panel
│   ├── ExpertPanel.tsx          # 6-agent AI expert panel with SVG avatars, confidence meters, streaming opinions
│   ├── Charts.tsx               # DualChartDisplay, BarsChartDisplay, ScoreRingDisplay, RadarChartDisplay
│   ├── LocationSearch.tsx       # Nominatim geocoding search input overlaid on the map
│   ├── PdfDownloadButton.tsx    # jsPDF-based A4 PDF export with Roboto font
│   ├── HistorySidebar.tsx       # localStorage history panel
│   └── ui/
│       └── glowing-card.tsx     # GlowingStatCard + GlowingButton reusable UI primitives
├── lib/
│   ├── types.ts                 # Shared TypeScript interfaces (PlacesContext, AnalysisResult, FactorResult, etc.)
│   ├── az.ts                    # Azerbaijani UI strings
│   ├── en.ts                    # English UI strings
│   ├── i18n.ts                  # getStrings(lang) helper + Lang type
│   ├── geo.ts                   # Shared haversine distance utility (metres)
│   ├── overpass.ts              # Overpass API query + OSM data extraction + competitor matching
│   ├── az-competitors.ts        # AZ government dataset competitor lookup (haversine radius)
│   ├── az-places-compact.ts     # Bundled AZ business location dataset [lat, lng, TYPE][]
│   ├── metro-stations.ts        # 27 Baku metro stations with exit coords + avg daily ridership (auto-generated)
│   ├── settlements.ts           # 4,589 AZ settlements with urban tier classification (auto-generated)
│   ├── categories.ts            # ~60 BusinessCategory entries with labelAz/labelEn/synonyms
│   ├── score.ts                 # Deterministic 7-factor scoring algorithm, returns ScoreResult
│   ├── groq.ts                  # Groq AI prompt + JSON retry logic
│   ├── storage.ts               # localStorage helper for analysis history
│   └── ratelimit.ts             # In-memory rate limiting for API routes
├── scripts/
│   ├── build-metro-data.mjs     # Preprocesses datasets/ → lib/metro-stations.ts
│   └── build-settlements.mjs   # Preprocesses datasets/ → lib/settlements.ts
├── datasets/                    # Raw source data (not served, only used by build scripts)
└── __tests__/
    ├── lib/
    │   ├── geo.test.ts
    │   ├── score.test.ts
    │   ├── groq.test.ts
    │   └── overpass.test.ts
    └── api/
        ├── places.test.ts
        └── analyze.test.ts
```

---

## App State Machine

The entire UI is driven by a single `AppState` type in `app/page.tsx`:

```
'landing' ──[Başlayaq]──────────► 'map'
'map'     ──[pin click]─────────► 'input'
'input'   ──[submit]────────────► 'loading'
'input'   ──[close]─────────────► 'map'
'loading' ──[success]───────────► 'result'
'loading' ──[error]─────────────► 'map'
'result'  ──[reset button]──────► 'map'  (also increments mapKey → remounts Map)
```

Once past the landing page, the user stays in the map → analyze loop without seeing the splash again.

---

## Scoring Algorithm (`lib/score.ts`)

The score is **fully deterministic** — the AI never guesses or invents it. `calculateScore(ctx)` returns `ScoreResult = { score: number; factors: FactorResult[] }`. Seven weighted factors (max total = 95):

| Factor key | Max pts | Logic |
|---|---|---|
| `competition` | 22 | Distance-weighted rivals: <200 m = full weight, 200–500 m = half weight. `max(0, 22 − weighted × 4)` |
| `footTraffic` | 20 | Metro ridership tier: ≥30k→12, ≥20k→10, ≥10k→7, ≥5k→4, present→2, none→0. Plus major roads within 500 m (up to 8 pts) |
| `areaType` | 13 | commercial=13, mixed=9, residential=5 |
| `urbanTier` | 10 | metro-city=10, city=7, town=4, rural=1 |
| `accessibility` | 12 | Bus stops within 500 m (0–7 pts) + parking presence (0–5 pts) |
| `nearbyServices` | 8 | Grocery stores within 500 m (0–5 pts) + amenity category count (0–3 pts) |
| `businessDensity` | 10 | Total businesses within 500 m — up to 10 pts |

**Hard caps on final score:**
- `cemetery`, `grave_yard`, `military`, `prison` → max 8
- `industrial`, `construction` → max 25–30
- `landfill`, `quarry` → max 5–10
- All others → max 95

### Distance-weighted competitors
Competitor elements with coords <200 m from pin count 1.0 weight; 200–500 m count 0.5. Elements without coords (from AZ dataset) count 0.5.

The AI's job is only to *explain* the pre-calculated score in plain language — it cannot change it.

---

## Data Collection (`lib/overpass.ts`)

Queries the public **Overpass API** (OpenStreetMap) for a 500 m radius around the pin:

- **Two parallel queries**: business/amenity data + land use data (with `.catch()` fallback → degraded result, never 500)
- Uses `out body center` (not `out tags`) so way elements include a `center` coordinate
- Fetches `shop`, `amenity`, `leisure`, `office`, `highway=bus_stop`, `highway=primary/secondary/tertiary/trunk` nodes/ways
- **Road ways** are separated from business elements by `splitElements()` so they don't inflate `totalBusinesses`
- **Area type** inferred by comparing commercial vs. residential element counts
- **Bus stops**, **parking**, **grocery stores** each extracted into dedicated fields
- **Competitors** — distance-weighted: combines AZ dataset (0.5 weight, no coords) + OSM matches (<200 m = 1.0, 200–500 m = 0.5)
- **`recognized` flag** — `true` if the business type maps to known OSM tags or AZ dataset types; `false` triggers a warning banner

### Overpass Endpoint Fallback & Resilience

- **5 public endpoints** tried in order: `overpass-api.de` → `overpass.kumi.systems` → `overpass.private.coffee` → `overpass.openstreetmap.ru` → `overpass.nchc.org.tw`
- **HTTP 429** (rate limit): waits 1.5 s before trying the next endpoint
- **15-second abort timeout** per endpoint attempt
- **`User-Agent: myblocate/1.0`** header is sent on all requests (required by Overpass fair-use policy)
- **Server-side in-memory cache** (5-minute TTL, keyed by full query string): repeated requests to the same coordinates return cached data instantly

### Additional lookups (static data)
- `getNearestMetro(lat, lng)` from `lib/metro-stations.ts` — returns nearest metro exit within 2 km and its avg daily ridership, or `null`
- `getUrbanTier(lat, lng)` from `lib/settlements.ts` — returns the urban tier of the nearest settlement

### Chain Detection

`detectChainsFromOSM()` scans all OSM elements within 500 m for known Azerbaijani retail chains defined in `lib/chains.ts` (`BAKU_CHAINS`). Matching uses `matchesChain()` which normalises names to lowercase and strips punctuation.

- **`dominantCompetitors`** — chains found within **100 m** of the pin. Flagged as a red warning in the result sheet.
- **`nearbyChains`** — chains within **200 m**, only populated for food businesses (triggers the cuisine-selection modal).

### Competitor Matching

`COMPETITOR_ALIASES` in `overpass.ts` maps Azerbaijani/English keywords → OSM tag values.
`BUSINESS_TO_AZ_TYPES` in `az-competitors.ts` maps keywords → AZ dataset TYPE codes.

Both lists include `'aptek'` / `'apteka'` for pharmacy. When adding a new business category to `lib/categories.ts`, also add entries to both lists.

### Business Categories (`lib/categories.ts`)

`BUSINESS_CATEGORIES` (~60 entries) covers retail, food, health, services, transport, education, entertainment, and agriculture. Each entry has: `key`, `labelAz`, `labelEn`, `synonyms[]`, and optional `pinned` (3 pinned categories shown in collapsed modal: restoran, supermarket, aptek).

---

## Input Validation (`app/api/places/route.ts`)

Business type is validated before any external call:
- Length: 2–100 characters
- Must contain at least 2 consecutive Unicode letters (`/[\p{L}]{2,}/u`) — rejects pure gibberish/numbers

Returns `400` for invalid input, `500` only if something unexpected throws.

---

## AI Integration (`lib/groq.ts`)

- **Model**: `llama-3.3-70b-versatile` (via Groq)
- **Prompt language**: controlled by `lang` parameter — `buildPrompt()` for Azerbaijani, `buildPromptEn()` for English
- **Language routing**: `page.tsx` passes `lang` in the fetch body → `/api/analyze/route.ts` extracts it → `analyzeLocation(..., lang)` selects the correct prompt builder
- **English prompt differences**: uses `rent.tier` ('Low'/'Medium'/'High'/'Very High') instead of `rent.tierAz`
- **Prompt strategy**: provides pre-calculated score + OSM context, asks for `{ summary, detail, pros, cons, verdict }` as JSON
- **Retry logic**: retries once on invalid JSON; throws after 2 failed attempts
- **Required env var**: `GROQ_API_KEY` in `.env.local`
- **Contradiction prevention**: prompt explicitly forbids "no competitor" pros when `competitors > 0`, and "high competition" cons when `competitors = 0`
- **Grammar correction**: `AZ_CORRECTIONS` regex map applied to all output fields via `fixAzerbaijaniGrammar()` before returning. **Skipped for English responses.**

---

## Expert Panel (`app/api/expert-panel/route.ts` + `components/ExpertPanel.tsx`)

### 6 Expert Agents

All agents use a **professional/consultative tone** — they write as senior consultants advising a client, not as generic chatbots.

| Key | Emoji | Role (EN) | Role (AZ) | Color |
|---|---|---|---|---|
| `market-analyst` | 📊 | Market Analyst | Bazar Analitiki | #f59e0b |
| `risk-advisor` | ⚠️ | Risk Advisor | Risk Məsləhətçisi | #ef4444 |
| `location-strategist` | 🗺️ | Location Strategist | Məkan Strateqi | #3b82f6 |
| `customer-flow` | 🚶 | Customer Flow Expert | Müştəri Axını Eksperti | #10b981 |
| `urban-forecaster` | 🏙️ | Urban Development Forecaster | Şəhər İnkişafı Proqnozçusu | #8b5cf6 |
| `infrastructure-auditor` | 🔧 | Infrastructure & Utility Auditor | İnfrastruktur Auditor | #06b6d4 |

### API Route (`POST /api/expert-panel`)

**Input:** `{ lat, lng, businessType, score, placesContext, luxuryMismatch?, rentTierAz?, districtPopulationK?, lang?, selectedAgents? }`

- `selectedAgents` — optional array of agent keys to run. If omitted or empty, all 6 agents run.
- Each agent gets a separate Groq call with its own prompt. All run in parallel (`Promise.all`).
- Agents return: `{ role, emoji, opinion, confidence }`. A `verdict` summary is generated as a final Groq call over all agent opinions.
- `confidence` is an integer 1–10 extracted from a special `[CONFIDENCE: N]` tag appended to each prompt and parsed via `parseConfidence()`.

**Output:** `{ agents: [{ role, emoji, opinion, response, confidence }], verdict }`

### Component (`components/ExpertPanel.tsx`)

- Each agent card shows: SVG avatar silhouette (per-agent design), role title, opinion text, and a confidence meter (0–10 bar with color-coded fill)
- `AGENT_BORDER_COLORS` — 6 accent colors matching the agent order
- The component uses a cache ref (`cacheRef`) to avoid re-fetching when the panel re-opens for the same result
- Skeleton loader count matches the number of selected agents

### Agent Toolbar (`components/DesktopDashboard.tsx → AgentToolbar`)

A fixed strip rendered between the score header and the scrollable body in `ResultView`:
- 6 pill buttons, one per agent
- **Hover**: glassmorphism tooltip (blur(16px)) with agent name and description
- **Click**: toggles agent participation. Minimum 1 agent enforced (last active agent cannot be deselected)
- Active state: gradient background + colored border + glow shadow using the agent's color
- `selectedAgents` Set is passed to `ExpertPanel` as an array prop

---

## Desktop Dashboard (`components/DesktopDashboard.tsx`)

### Layout

The right-side panel has a 4-layer background:
1. `/dashboard-image.png` — atmospheric background photo
2. `--dashboard-bg: rgba(7,9,13,0.48)` — dark overlay (CSS variable)
3. `--dashboard-blur: blur(24px) saturate(1.4)` — backdrop filter
4. Per-card `backdrop-filter: blur(10–12px)` on summary, pros, and cons sections for legibility

### Views

| View | Shown when |
|---|---|
| `idle` | No result yet — shows history/compare/insights buttons |
| `result` | After analysis — score header + agent toolbar + scrollable body |
| `compare` | User navigates from idle — side-by-side factor comparison across saved analyses |
| `insights` | User navigates from idle — metro ridership chart, urban tier scoring reference |

### Result View sections (top to bottom)

1. **Score header** (fixed/shrink-0) — business name, verdict badge, rent tier, score %, ScoreRingMini
2. **Agent Toolbar** (fixed/shrink-0) — 6 agent pill buttons, always visible
3. **Scrollable body**:
   - Luxury mismatch / dominant competitor warnings
   - Summary (blur(12px) glass background)
   - Pros (blur(10px) glass background)
   - Cons (blur(10px) glass background)
   - Factor breakdown chart (tabs: dual ◐ / bars ≡ / ring ○)
   - OSM data grid (6 GlowingStatCards)
   - Inline Expert Panel
   - Action buttons (Expert Panel, Reset, PDF)

### Chart Tabs

| Tab | Component | Description |
|---|---|---|
| `dual` (◐) | `DualChartDisplay` | 128px score ring (left, flex:1) + factor progress bars (right, flex:1) — **default** |
| `bars` (≡) | `BarsChartDisplay` | Horizontal bar chart only |
| `ring` (○) | `ScoreRingDisplay` | Large centered ring + 2-col factor grid |

---

## Charts (`components/Charts.tsx`)

All chart components are animated via Framer Motion.

### `barColor(pct: number): string`
- ≥70 → `#34d399` (emerald)
- ≥40 → `#fbbf24` (amber)
- <40 → `#f87171` (red)

Used by all chart components and the score ring.

### `DualChartDisplay`
- Left panel (`flex: 1`): 128×128 px SVG ring (R=56), `useCountUp` animated score, `barColor` fill
- Right panel (`flex: 1`): factor bars at 9.5px font, `barColor` per bar, animated width with stagger

### `BarsChartDisplay`
- Simple horizontal bars, `barColor` per factor, Framer Motion width animation

### `ScoreRingDisplay`
- 132×132 px centered ring + 2-column mini grid of factor scores below

### `RadarChartDisplay`
- Polygon radar/spider chart — still exported but no longer the default tab

---

## Map Layer Controls (`app/api/layers/route.ts` + `components/Map.tsx`)

Visible only in result state (`showLayerPanel={appState === 'result'}`).

### 4 Layers

| Type | Label | Color | Query radius |
|---|---|---|---|
| `bus` | Bus Stops | #f59e0b amber | 500 m |
| `metro` | Metro Stations | #a855f7 purple | 2000 m |
| `transport` | Transport Stops | #10b981 emerald | 500 m |
| `competitors` | Competitors | #ef4444 red | 500 m |

### Behaviour
- Each layer is independent — toggling one does not affect others
- **Layer ON → OFF**: markers are removed, active state cleared
- **Layer OFF → ON**: POST to `/api/layers`, colored dot markers (`divIcon 14×14 px`) added per result element
- Empty result: toast notification shown for 3 seconds, button stays inactive
- **New pin drop**: all layer markers cleared, all layers reset to inactive

### API Route (`POST /api/layers`)
**Input:** `{ lat, lng, layerType, businessType? }`
**Output:** `{ elements: Array<{ lat, lng, name? }> }`
Returns `400` if lat/lng/layerType missing. Returns `200` with empty array on Overpass error (graceful fallback).

---

## Location Search (`components/LocationSearch.tsx`)

Floating search input overlaid on the map when `appState === 'map'` or `'input'`:
- Debounces queries 300 ms
- Calls Nominatim (`countrycodes=az`, limit 5)
- On result select: calls `handlePinDrop(lat, lng)` AND `setFlyToTarget({ lat, lng })`
- `flyToTarget` prop on `Map.tsx` triggers `map.flyTo([lat, lng], 17, { duration: 1.2 })`
- Dismisses dropdown on click-outside or Escape key

---

## API Routes

### `POST /api/places`
**Input:** `{ lat, lng, businessType }`
**Validation:** businessType must be 2–100 chars with letters
**Output:** `PlacesContext` — `{ competitors, areaType, amenities, totalBusinesses, landUse, recognized, busStops, parking, groceryStores, majorRoads, metroDistance, metroRidership, urbanTier }`

### `POST /api/analyze`
**Input:** `{ lat, lng, businessType, placesContext, lang? }`
**Output:** `AnalysisResult` — `{ score, factors, summary, detail, pros, cons, verdict }`

### `POST /api/expert-panel`
**Input:** `{ lat, lng, businessType, score, placesContext, lang?, selectedAgents? }`
**Output:** `{ agents: [{ role, emoji, opinion, response, confidence }], verdict }`

### `POST /api/layers`
**Input:** `{ lat, lng, layerType, businessType? }`
**Output:** `{ elements: Array<{ lat, lng, name? }> }`

---

## Map Lifecycle (`components/Map.tsx`)

### Stable callback via ref
`handlePinDrop` in `page.tsx` depends on `appState` via `useCallback`. To prevent the map from being torn down when `appState` changes, the callback is stored in a ref:
```ts
const dropRef = useRef(onPinDrop)
useEffect(() => { dropRef.current = onPinDrop }, [onPinDrop])
// map init effect has deps: []
```

### Remount on reset
When `handleReset()` is called, `mapKey` is incremented in `page.tsx`. The Map receives `key={mapKey}`, causing React to unmount the old instance and mount a fresh one.

### Why not `invalidateSize()`?
`invalidateSize()` only works if tiles are already loaded. A fresh mount guarantees correct container dimensions from the start.

---

## Key Design Decisions

### Tailwind v4 syntax
Uses `@tailwindcss/postcss`. The correct import in `globals.css` is:
```css
@import "tailwindcss";
```
The old v3 directives (`@tailwind base/components/utilities`) do **not** work with v4.

### SSR-disabled Map
```ts
const Map = dynamic(() => import('@/components/Map'), { ssr: false })
```

### Flex layout for map height
`flex-1 min-h-0` inside `flex flex-col h-screen`. The `min-h-0` is critical — without it, flex children overflow past the viewport.

### Security headers (CSP)
Defined in `next.config.ts`. Key directives:
- `img-src`: allows `https://*.tile.openstreetmap.org` for OSM tiles
- `connect-src`: allows Overpass API endpoints and Nominatim

### i18n
Language is stored in `localStorage` under `myblocate-lang`. `getStrings(lang)` from `lib/i18n.ts` returns the full string map. Language toggles on the landing page and header persist across sessions.

The AI response language is also controlled by `lang` — it is passed through the entire call chain (page → /api/analyze → /api/expert-panel → Groq prompts) so the language changes without resetting any UI state.

All UI strings must use `strings.*` keys — never hardcode Azerbaijani text in components.

### Design tokens (`globals.css`)
```css
:root {
  --dashboard-bg: rgba(7, 9, 13, 0.48);   /* dark overlay on dashboard background image */
  --dashboard-blur: blur(24px) saturate(1.4);
  --dashboard-border: rgba(255, 255, 255, 0.10);
}
```

---

## Result Sheet (`components/ResultSheet.tsx`)

Mobile-oriented bottom sheet showing:
- **Score badge** — color-coded (green ≥70, amber ≥40, red <40) with ring
- **Dominant competitor warning** — red banner when a major chain is within radius
- **Summary** — one-paragraph AI summary
- **Pros / Cons** — two-column grid from Groq output
- **Expandable section** — reveals full AI analysis, 7 factor bars, OSM data grid, land use note

`ScoreBar` fills: green ≥70%, amber 40–70%, red <40%.

---

## PDF Export (`components/PdfDownloadButton.tsx`)

Generates an A4 PDF report client-side via `jsPDF` (dynamic import).

**Font setup:**
- Loads `public/fonts/Roboto-Regular.ttf` and `public/fonts/Roboto-Bold.ttf` via `fetch` + base64 encoding
- Files must be real binary TTF — jsPDF rejects WOFF/WOFF2 or HTML
- Covers all AZ Latin characters: ə, ğ, ı, İ, ş, ç, ö, ü

**Logo:**
- `public/logo.png` is **319×330 px** (nearly square, ratio 0.97:1) — it is an icon mark, not a wide banner
- Placed at `14×14 mm` at position `(M, 6)` inside the 26 mm dark header band

**PDF layout (top to bottom):**
1. Dark header (`#0f172a`) with logo (14×14 mm) + date (right-aligned)
2. Business name + score pill (color-coded green/amber/red)
3. Rent tier — district name is intentionally omitted
4. Horizontal rule
5. AI summary paragraph
6. Pros / Cons two-column layout
7. Horizontal rule
8. Factor breakdown — 7 bars with `score/max` labels
9. OSM data grid — 6 cards
10. Footer — `myblocate.az · Bu hesabat məlumat xarakter daşıyır.`

---

## Running Locally

```bash
npm install
echo "GROQ_API_KEY=your_key_here" > .env.local
npm run dev       # http://localhost:3000
npm test          # run all tests
npm run build     # production build check
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for AI analysis and expert panel |

`.env.local` is git-ignored. Never commit API keys.

---

## Tests

Tests across 6 files (`npm test`):
- `__tests__/lib/geo.test.ts` — haversine distance calculations
- `__tests__/lib/score.test.ts` — all 7 scoring factors, caps, land use
- `__tests__/lib/groq.test.ts` — happy path, JSON retry, exhausted retries, network error
- `__tests__/lib/overpass.test.ts` — distance-weighted competitors, bus stop/parking/grocery extraction, degraded fallback, recognized flag
- `__tests__/api/places.test.ts` — input validation (missing fields, gibberish, too short), 200/400/500 responses
- `__tests__/api/analyze.test.ts` — score + factors in response body

---

## Deployment (Netlify)

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Set `GROQ_API_KEY` in Netlify → Site settings → Environment variables
4. Deploy (Netlify auto-detects Next.js)
