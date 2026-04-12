# Business Location Analyzer — Design Spec
**Date:** 2026-03-31 (last updated: 2026-04-13)

## Overview
A single-page web app where users drop a pin on a map, enter a business type, and receive an AI-powered analysis of whether that business is likely to succeed at that location. Targeted at Azerbaijan for initial launch. Supports Azerbaijani and English (bilingual via i18n).

---

## Architecture

```
Browser (Next.js)
  └── LandingPage — marketing page with hero, mission, scoring explainer, feedback form
  └── Map UI (Leaflet.js + OpenStreetMap tiles)
        ↓ user drops pin (click or LocationSearch geocoding)
  └── BusinessInputModal — user types business type
  └── /api/places  (Next.js API route → serverless)
        ↓ queries Overpass API with lat/lng (500m radius)
        → returns: PlacesContext (competitors, area type, bus stops, parking, metro, grocery, etc.)
  └── [optional] CuisineModal — if nearby food chains detected
  └── /api/analyze  (Next.js API route → serverless)
        ↓ runs deterministic 7-factor score, then calls Groq (Llama 3.3 70B)
        → returns: AnalysisResult (score, pros, cons, summary, factors, luxuryMismatch, etc.)
  └── ResultSheet — bottom panel with score, pros/cons, expandable detail, factor bars, OSM grid
  └── HistorySidebar — slide-in drawer (hamburger triggered), localStorage history
  └── PdfDownloadButton — jsPDF export with Roboto TTF, AZ characters
```

**Stack:**
- Framework: Next.js 16 / React 19 / TypeScript
- Map: Leaflet.js + OpenStreetMap tiles (raw, no react-leaflet)
- Geocoding: Nominatim API (`nominatim.openstreetmap.org`) — location search on map view
- Location data: OpenStreetMap via Overpass API (free, no API key)
- LLM: Groq API — `llama-3.3-70b-versatile` (276 tokens/sec, <100ms latency)
- Scoring: Deterministic 7-factor algorithm in `lib/score.ts` (runs before AI call)
- Storage: Browser localStorage (no accounts, no backend DB)
- Animation: Framer Motion (landing page hero + mission scroll animation)
- Styling: Tailwind CSS v4 (`@import "tailwindcss"`)
- Deployment: Netlify (Next.js plugin, API routes → serverless functions)

---

## UI / UX Flow

The app has 6 states managed in `app/page.tsx`:

### State 0 — Landing (`landing`)
- Marketing page: hero with animated brand name, mission section, scoring explainer, feedback form
- Mission section: phone mockup image (left, bleeds into adjacent sections with scroll animation) + mission text (right)
- Clicking CTA → transitions to `map` state

### State 1 — Map (`map`)
- Full-screen Leaflet map centered on Baku, Azerbaijan
- LocationSearch geocoding input (top-left, Nominatim, filtered to Azerbaijan)
- Instruction text: "Drop a pin to analyze a location"
- Hamburger button (top-right header) opens HistorySidebar drawer
- User clicks/taps to place a draggable pin → transitions to `input`

### State 2 — Business Input (`input`)
- Pin placed, BusinessInputModal appears
- Category grid + text input: "What business do you want to open here?"
- LocationSearch still visible for pin repositioning
- Submit → transitions to `loading`

### State 3 — Loading (`loading`)
- Map dims (opacity-30), centered LoadingOverlay
- 4-step progress indicator with timed transitions

### State 3b — Cuisine (`cuisine`)
- Only shown if nearby food chains detected
- Modal asking user to select their cuisine type
- Used to derive `cuisineMatch` (`same`/`different`/`multiple`) for scoring

### State 4 — Result (`result`)
- ResultSheet panel below the map (not a full overlay)
- Header: business name + score pill (color-coded ≥70 emerald, 40–69 amber, <40 red)
- Reset strip: always-visible "Başqa Yer Təhlil Et" button between header and scrollable body
- Scrollable body: luxury/competitor warnings → summary → pros/cons grid
- Expandable section (toggle button): analysis bullets, factor breakdown bars, OSM data grid
- PDF download button at bottom of expandable section

### History Drawer
- Hamburger icon (≡) in app header opens HistorySidebar
- Slides in from right with CSS transform transition (`translate-x-full` → `translate-x-0`)
- Semi-transparent backdrop closes it on click
- List view with score badge, date, summary snippet; tap for detail view

---

## Data Layer

### Overpass API Query
Radius: 500m around dropped pin. Fetches:
- Direct competitor count (same business type)
- Total businesses in radius
- Bus stops, parking, grocery stores
- Major roads (for foot traffic scoring)
- Nearest metro station distance + ridership tier
- Land use zone (cemetery, industrial, etc. → score caps)
- Dominant competitor detection (single large chain within 200m)

### Scoring Algorithm (7 factors, `lib/score.ts`)
Runs deterministically before AI. Max score 95. Land use caps apply.

| Factor | Key | Max |
|---|---|---|
| Competition | `competition` | 22 |
| Foot traffic | `footTraffic` | 20 |
| Area type | `areaType` | 13 |
| Urban tier | `urbanTier` | 10 |
| Accessibility | `accessibility` | 12 |
| Nearby services | `nearbyServices` | 8 |
| Business density | `businessDensity` | 10 |

- `footTraffic` = metro ridership tier score (0–12) + road score (0–8)
- `accessibility` = bus stop score (0–7) + parking (0–5)

### Groq Prompt Structure
```
Location context: [PlacesContext fields]
Score: [pre-calculated score]
Business type: [user input]
Language: [az or en]

Return JSON: { score, pros, cons, summary, detail, verdict, luxuryMismatch }
```
Grammar correction pipeline (`fixAzerbaijaniGrammar`) runs on all AZ output. Skipped for EN.

### localStorage Schema
```json
{
  "analyses": [
    {
      "id": "uuid",
      "date": "2026-04-13",
      "lat": 40.4093,
      "lng": 49.8671,
      "business": "Restoran",
      "score": 72,
      "pros": ["...", "..."],
      "cons": ["...", "..."],
      "summary": "...",
      "verdict": "...",
      "context": { "competitors": 3, "totalBusinesses": 45, ... }
    }
  ]
}
```

---

## API Routes

### `POST /api/places`
**Input:** `{ lat, lng, businessType }`
**Action:** Validates input (2–100 chars, `/[\p{L}]{2,}/u`); queries Overpass API; detects competitors, area type, bus stops, parking, metro, grocery, land use, nearby chains
**Output:** `PlacesContext`

### `POST /api/analyze`
**Input:** `{ lat, lng, businessType, placesContext, lang, cuisineMatch? }`
**Action:** Runs `calculateScore(ctx)`, builds Groq prompt, calls LLM, applies grammar correction
**Output:** `AnalysisResult` — includes `score`, `factors[]`, `pros`, `cons`, `summary`, `detail`, `verdict`, `luxuryMismatch`

### `POST /api/feedback`
**Input:** `{ name?, email?, message }`
**Action:** Persists user feedback (contact form on landing page)
**Output:** `{ ok: true }`

---

## Error Handling
- Overpass timeout or no data → degraded PlacesContext with empty arrays (never 500)
- Groq API failure → "Analysis failed. Please try again."
- Invalid JSON from Groq → retry once with stricter prompt, then surface error
- Restricted zone (cemetery/military) → 422 `RESTRICTED_ZONE` → pin cleared, user returned to map

---

## Language
- UI: Azerbaijani (`az`) or English (`en`), user-selectable, persisted in localStorage
- All UI strings via `getStrings(lang)` from `lib/i18n.ts` — never hardcode AZ strings
- AI response language controlled by `lang` field sent in `/api/analyze` body
- Language switch does NOT reset map/pin/score state

---

## LandingPage sections
1. **Hero** — animated brand name (Framer Motion spring per letter), CTA button, floating path SVG background
2. **Mission** — two-column: phone mockup image (left, scroll-animated) + mission text (right)
3. **Scoring** — 7-factor card grid explaining the algorithm
4. **Contact** — feedback form (name, email, message) → `/api/feedback`

---

## Future Upgrades
- Swap OpenStreetMap for Google Places API for richer data (ratings, popular times)
- Add more regions beyond Azerbaijan
- User accounts + cloud-synced history
- Together AI / Replicate as Groq fallback (do not use HuggingFace managed API — Gemma 4 not deployed there)
