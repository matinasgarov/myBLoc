# myblocate — Project Documentation

**myblocate** is a web application that helps users in Azerbaijan evaluate how suitable a location is for opening a business. The user drops a pin on a map, enters a business type, and the app returns a score with AI-generated pros, cons, and a plain-language verdict — all in Azerbaijani (with English toggle).

---

## What the App Does

1. **Landing page** — introduces the app with an AI disclaimer before anything else; language toggle (AZ/EN) persists across sessions
2. **Map view** — user clicks any point in Azerbaijan to drop a pin (OpenStreetMap, Leaflet)
3. **Business input** — modal asks what kind of business they plan to open (validated: min 2 chars, must contain letters)
4. **Data collection** — app queries OpenStreetMap (Overpass API) + AZ government business dataset for real businesses within 500 m of the pin; also looks up nearest Baku metro station and urban tier from static datasets
5. **Scoring** — a deterministic 7-factor algorithm calculates a 0–95 score from the collected data, returning both the score and a per-factor breakdown
6. **AI analysis** — Groq AI receives the score and OSM context, returns pros/cons/verdict in the user's active language (AZ or EN)
7. **Result sheet** — shows the score, pros, cons, verdict, factor breakdown bars, OSM data grid; reset button re-initializes the map for a new analysis
8. **PDF export** — downloads a formatted A4 PDF report with logo, score pill, pros/cons, factor bars, and OSM data grid
9. **History** — past analyses are stored in `localStorage` and viewable in a sidebar
10. **Warning banner** — shown (amber) when the business type is unrecognized by the matching system

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
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
│   ├── globals.css              # Tailwind v4 import + animation classes
│   ├── layout.tsx               # Root layout (sets font, viewport, metadata)
│   ├── page.tsx                 # Main page — state machine, all UI flows
│   ├── robots.ts                # /robots.txt route
│   ├── sitemap.ts               # /sitemap.xml route
│   └── api/
│       ├── places/route.ts      # POST /api/places — validates input, queries Overpass, returns PlacesContext
│       ├── analyze/route.ts     # POST /api/analyze — calculates score, calls Groq
│       └── feedback/route.ts    # POST /api/feedback
├── components/
│   ├── Map.tsx                  # Leaflet map, SSR-disabled, ref-stable callback pattern
│   ├── MapErrorBoundary.tsx     # Class error boundary wrapping Map
│   ├── LandingPage.tsx          # Splash/intro screen with language toggle
│   ├── BusinessInputModal.tsx   # Business type input modal
│   ├── LoadingOverlay.tsx       # 4-step loading animation
│   ├── ResultSheet.tsx          # Score display with expandable details
│   ├── PdfDownloadButton.tsx    # jsPDF-based A4 PDF export with Roboto font
│   └── HistorySidebar.tsx       # localStorage history panel
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
│   ├── score.ts                 # Deterministic 7-factor scoring algorithm, returns ScoreResult
│   ├── groq.ts                  # Groq AI prompt + JSON retry logic
│   ├── storage.ts               # localStorage helper for analysis history
│   └── ratelimit.ts             # In-memory rate limiting for API routes
├── scripts/
│   ├── build-metro-data.mjs     # Preprocesses datasets/ → lib/metro-stations.ts
│   └── build-settlements.mjs    # Preprocesses datasets/ → lib/settlements.ts
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
| `accessibility` | 12 | Major roads (primary/secondary/tertiary/trunk) within 500 m — up to 12 pts |
| `nearbyServices` | 8 | Grocery stores within 500 m (0–5 pts) + amenity category count (0–3 pts) |
| `businessDensity` | 10 | Total businesses within 500 m — up to 10 pts |

**Hard caps on final score:**
- `cemetery`, `grave_yard`, `military`, `prison` → max 8
- `industrial`, `construction` → max 25–30
- `landfill`, `quarry` → max 5–10
- All others → max 95

### Distance-weighted competitors
Competitor elements with coords <200 m from pin count 1.0 weight; 200–500 m count 0.5. Elements without coords (from AZ dataset) count 0.5. This replaces the old flat count.

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

### Additional lookups (static data)
- `getNearestMetro(lat, lng)` from `lib/metro-stations.ts` — returns nearest metro exit within 2 km and its avg daily ridership, or `null`
- `getUrbanTier(lat, lng)` from `lib/settlements.ts` — returns the urban tier of the nearest settlement

### Competitor Matching

`COMPETITOR_ALIASES` in `overpass.ts` maps Azerbaijani/English keywords → OSM tag values.
`BUSINESS_TO_AZ_TYPES` in `az-competitors.ts` maps keywords → AZ dataset TYPE codes.

Both lists include `'aptek'` / `'apteka'` for pharmacy. When adding a new business category to `lib/categories.ts`, also add entries to both `COMPETITOR_ALIASES` and `BUSINESS_TO_AZ_TYPES`.

### Business Categories (`lib/categories.ts`)

`BUSINESS_CATEGORIES` (~60 entries) covers:
- **Retail**: restoran, supermarket, kafe, fast food, çay evi, aptek, elektronika, geyim, mebel, bərbər/gözəllik, kitab, oyuncaq, çiçəkçi, avtomobil malları, qida mağazası, kosmetika, idman malları, zərgərlik, topdan
- **Health/Wellness**: klinika, diş, masaj, optika, baytarlıq
- **Services**: minik avtomobili, hüquq, mühasibat, sığorta, əmlak, təmizlik, çatdırılma, foto, reklam, IT xidmət, avtomobil satış, çap, tərcümə
- **Transport/Logistics**: taksi, yük daşıma, anbar, turizm
- **Education**: məktəb/kurs, tədris mərkəzi, mühəndislik, arxitektura
- **Entertainment**: idman, park/istirahət, kinoteatr, musiqi
- **Agriculture**: kənd təsərrüfatı, heyvandarlıq, balıqçılıq, bağçılıq, kənd malları
- **Other**: tikinti/materiallar, digər

Each entry has: `key` (used for OSM matching), `labelAz`, `labelEn`, `synonyms[]` (searched alongside label/key), and optional `pinned` (3 pinned categories shown in collapsed modal: restoran, supermarket, aptek).

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
- **Language routing**: `page.tsx` passes `lang` in the fetch body → `/api/analyze/route.ts` extracts it → `analyzeLocation(..., lang)` selects the correct prompt builder. Language switch does **not** reset map/pin/score state.
- **English prompt differences**: uses `rent.tier` ('Low'/'Medium'/'High'/'Very High') instead of `rent.tierAz`; maps `urbanTier` to English strings; no Azerbaijani grammar rules
- **Prompt strategy**: provides pre-calculated score + OSM context, asks for `{ summary, detail, pros, cons, verdict }` as JSON
- **Retry logic**: retries once on invalid JSON; throws after 2 failed attempts
- **Required env var**: `GROQ_API_KEY` in `.env.local`
- **Contradiction prevention**: prompt explicitly forbids the LLM from writing "no competitor" pros when `competitors > 0`, and "high competition" cons when `competitors = 0`; also forbids English words leaking into AZ responses
- **Grammar correction**: `AZ_CORRECTIONS` regex map applied to all output fields via `fixAzerbaijaniGrammar()` before returning (fixes common errors like `çoxluq rəqib → çoxlu rəqib`). **Skipped for English responses.**
- **Chain cuisine radius**: cuisine-based context hint (e.g. "KFC nearby") only triggers if the competitor is within **50 m** (not 300 m)

---

## API Routes

### `POST /api/places`
**Input:** `{ lat, lng, businessType }`
**Validation:** businessType must be 2–100 chars with letters
**Output:** `PlacesContext` — `{ competitors, areaType, amenities, totalBusinesses, landUse, recognized, busStops, parking, groceryStores, majorRoads, metroDistance, metroRidership, urbanTier }`

### `POST /api/analyze`
**Input:** `{ lat, lng, businessType, placesContext, lang? }`
**Output:** `AnalysisResult` — `{ score, factors, summary, detail, pros, cons, verdict }`
Calls `calculateScore(ctx)` first (returns `{ score, factors }`), merges both into the Groq result before responding. `lang` ('az' | 'en') controls the AI response language.

---

## Map Lifecycle (`components/Map.tsx`)

Critical implementation details:

### Stable callback via ref
`handlePinDrop` in `page.tsx` depends on `appState` via `useCallback`. To prevent the map from being torn down when `appState` changes, the callback is stored in a ref:
```ts
const dropRef = useRef(onPinDrop)
useEffect(() => { dropRef.current = onPinDrop }, [onPinDrop])
// map init effect has deps: []
```

### Remount on reset
When `handleReset()` is called, `mapKey` is incremented in `page.tsx`. The Map receives `key={mapKey}`, causing React to unmount the old instance (runs `map.remove()` cleanly) and mount a fresh one. This is safe because no zoom animation is in progress when the user clicks the reset button.

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
- `connect-src`: allows Overpass API endpoints

### i18n
Language is stored in `localStorage` under `myblocate-lang`. `getStrings(lang)` from `lib/i18n.ts` returns the full string map. Language toggles on the landing page and header persist across sessions.

The AI response language is also controlled by `lang` — it is passed through the entire call chain so the Groq prompt changes language without resetting any UI state.

All UI strings must use `strings.*` keys — never hardcode Azerbaijani text in components. Recent string additions: `RESULT_OSM_BUS_STOPS`, `RESULT_OSM_GROCERY`, `RESULT_OSM_PARKING`, `RESULT_OSM_METRO`, `RESULT_LOW_SCORE_WARNING`, `MODAL_SHOW_ALL`, `MODAL_SHOW_LESS`, `RESULT_TOGGLE_EXPAND`, `RESULT_TOGGLE_COLLAPSE`, `RESULT_COMPETITORS_NOTE`.

---

## Result Sheet (`components/ResultSheet.tsx`)

The expandable bottom sheet shows:
- **Score badge** — color-coded (green ≥70, amber ≥40, red <40) with ring
- **Dominant competitor warning** — red banner when a major chain is within radius
- **Summary** — one-paragraph AI summary
- **Pros / Cons** — two-column grid from Groq output
- **Expandable section** (toggle button) — reveals:
  - Full AI analysis text
  - **Factor breakdown** — 7 color-coded progress bars (`ScoreBar`); competition bar shows inline competitor count note (e.g. `· 71 rəqib`)
  - **OSM data grid** — always 6 fixed cards: competitors, total businesses, bus stops, grocery stores, parking, metro distance
  - **Low-score warning banner** — red text above OSM grid when `result.score < 45`
  - Land use note (amber) if relevant

`ScoreBar` fills: green (`bg-emerald-500`) ≥70%, amber (`bg-amber-500`) 40–70%, red (`bg-red-500`) <40%. Track is red when fill is red, slate otherwise. Empty bars (0 pts) render no fill div.

---

## PDF Export (`components/PdfDownloadButton.tsx`)

Generates an A4 PDF report client-side via `jsPDF` (dynamic import).

**Font setup:**
- Loads `public/fonts/Roboto-Regular.ttf` and `public/fonts/Roboto-Bold.ttf` via `fetch` + base64 encoding
- Files must be real binary TTF (magic bytes `00 01 00 00`), **not** WOFF/WOFF2 or HTML — jsPDF's TTF parser rejects everything else
- Covers all AZ Latin characters: ə, ğ, ı, İ, ş, ç, ö, ü
- `addFont` fires errors via jsPDF's internal PubSub (not JS throw) — verify registration with `doc.getFontList()` if unsure

**Logo:**
- `public/logo.png` is **319×330 px** (nearly square, ratio 0.97:1) — it is an icon mark, not a wide banner
- Placed at `14×14 mm` at position `(M, 6)` inside the 26 mm dark header band

**PDF layout (top to bottom):**
1. Dark header (`#0f172a`) with logo (14×14 mm) + date (right-aligned)
2. Business name + score pill (color-coded green/amber/red)
3. Rent tier (`Kira: Çox Yüksək`) — district name is intentionally omitted
4. Horizontal rule
5. AI summary paragraph
6. Pros / Cons two-column layout
7. Horizontal rule
8. Factor breakdown — 7 bars with `score/max` labels (green ≥70%, amber 40–70%, red <40%)
9. OSM data grid — 6 cards: competitors, total businesses, bus stops, grocery stores, parking, metro distance
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
| `GROQ_API_KEY` | Yes | Groq API key for AI analysis |

`.env.local` is git-ignored. Never commit API keys.

---

## Tests

56 tests across 6 files:
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
