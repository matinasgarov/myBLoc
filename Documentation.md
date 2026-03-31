# myblocate — Project Documentation

**myblocate** is a web application that helps users in Azerbaijan evaluate how suitable a location is for opening a business. The user drops a pin on a map, enters a business type, and the app returns a score with AI-generated pros, cons, and a plain-language verdict — all in Azerbaijani.

---

## What the App Does

1. **Landing page** — introduces the app with an AI disclaimer before anything else
2. **Map view** — user clicks any point in Azerbaijan to drop a pin
3. **Business input** — modal asks what kind of business they plan to open
4. **Data collection** — app queries OpenStreetMap for real businesses within 500 m of the pin
5. **Scoring** — a deterministic algorithm calculates a 0–100 score from the OSM data
6. **AI analysis** — Groq AI receives the score and OSM context, returns pros/cons/verdict in Azerbaijani
7. **Result sheet** — shows the score, pros, cons, verdict; can be dismissed to analyze another location
8. **History** — past analyses are stored in `localStorage` and viewable in a sidebar

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| Map | Leaflet + react-leaflet | ^1.9.4 / ^5 |
| AI | Groq SDK (`llama-3.1-8b-instant`) | ^1.1.2 |
| Map data | Overpass API (OpenStreetMap) | public API |
| Testing | Jest + ts-jest + Testing Library | ^30 |
| Deployment | Netlify (`@netlify/plugin-nextjs`) | ^5 |

---

## Project Structure

```
hanimenebiznes/
├── app/
│   ├── globals.css          # Tailwind v4 import + animation classes
│   ├── layout.tsx           # Root layout (sets font, viewport)
│   ├── page.tsx             # Main page — state machine, all UI flows
│   └── api/
│       ├── places/route.ts  # POST /api/places — queries Overpass, returns PlacesContext
│       └── analyze/route.ts # POST /api/analyze — calculates score, calls Groq
├── components/
│   ├── Map.tsx              # Leaflet map, SSR-disabled
│   ├── BusinessInputModal.tsx
│   ├── LoadingOverlay.tsx
│   ├── ResultSheet.tsx      # Score display with close button
│   └── HistorySidebar.tsx
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── az.ts                # All Azerbaijani UI strings (single source of truth)
│   ├── overpass.ts          # Overpass API query + data extraction logic
│   ├── score.ts             # Deterministic scoring algorithm
│   ├── groq.ts              # Groq AI prompt + retry logic
│   └── storage.ts           # localStorage helper for history
└── __tests__/
    └── lib/
        ├── score.test.ts
        ├── groq.test.ts
        └── ...
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
'result'  ──[close / backdrop]──► 'map'
```

Once past the landing page, the user stays in the map → analyze loop without seeing the splash again.

---

## Scoring Algorithm (`lib/score.ts`)

The score is **fully deterministic** — the AI never guesses or invents it. Three weighted factors:

| Factor | Points | Logic |
|---|---|---|
| Competition | 0–50 | `max(5, 50 − competitors × 8)` — each nearby rival costs 8 pts, floor at 5 |
| Foot traffic | 0–30 | `min(30, amenityTypes × 8)` — each distinct amenity type adds 8 pts |
| Area type | 5–20 | commercial = 20, mixed = 12, residential = 5 |

**Total range: 10–100 points.**

The AI's job is only to *explain* this pre-calculated score in plain language — it cannot change it.

---

## Data Collection (`lib/overpass.ts`)

Queries the public **Overpass API** (OpenStreetMap) for a 500 m radius around the pin:

- Fetches `shop`, `amenity`, `leisure`, and `office` tagged nodes/ways
- **Area type** inferred by comparing commercial vs. residential element counts
- **Amenities** grouped into 4 categories: schools/universities, transit stops, food venues, shops
- **Competitors** counted by fuzzy-matching the business type against OSM name/amenity/shop/leisure tags

All data is near real-time crowdsourced OSM data — no paid APIs required.

---

## AI Integration (`lib/groq.ts`)

- **Model**: `llama-3.1-8b-instant` (via Groq)
- **Prompt language**: Azerbaijani
- **Prompt strategy**: provides the pre-calculated score + OSM context, asks for `{pros, cons, verdict}` in simple plain language (max ~10 words per point, no technical terms, "as if explaining to a friend")
- **Retry logic**: retries once on invalid JSON; throws after 2 failed attempts
- **Required env var**: `GROQ_API_KEY` in `.env.local`

---

## API Routes

### `POST /api/places`
**Input:** `{ lat, lng, businessType }`
**Output:** `PlacesContext` — `{ competitors, areaType, amenities, totalBusinesses }`

### `POST /api/analyze`
**Input:** `{ lat, lng, businessType, placesContext }`
**Output:** `AnalysisResult` — `{ score, pros, cons, verdict }`
Calls `calculateScore` first, then passes the result to Groq.

---

## Key Design Decisions

### Tailwind v4 syntax
The project uses **Tailwind CSS v4** with `@tailwindcss/postcss`. The correct import in `globals.css` is:
```css
@import "tailwindcss";
```
The old v3 directives (`@tailwind base/components/utilities`) do **not** work with v4 and silently break all styles.

### SSR-disabled Map
Leaflet accesses `window` and cannot run on the server. The `Map` component is loaded via:
```ts
const Map = dynamic(() => import('@/components/Map'), { ssr: false })
```

### Flex layout for map height
The map uses `flex-1 min-h-0` inside a `flex flex-col h-screen` container. The `min-h-0` is critical — without it, a `flex-1` child defaults to `min-height: auto` and overflows past the viewport.

### Result sheet dismissal
A full-screen transparent backdrop div (`absolute inset-0 z-[999]`) sits behind the result sheet. Clicking it calls `handleReset`. The sheet itself has `onClick={e => e.stopPropagation()}` to prevent bubbling.

### Pin repositioning
`handlePinDrop` accepts both `'map'` and `'input'` states, allowing the user to move the pin while the business modal is open. The transition to `'input'` only fires when coming from `'map'`.

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
echo "GROQ_API_KEY=your_key_here" > .env.local

# 3. Start dev server
npm run dev
# → http://localhost:3000

# 4. Run tests
npm test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for AI analysis |

`.env.local` is git-ignored via the `.env*` rule in `.gitignore`. Never commit API keys.

---

## Tests

```bash
npm test
```

Tests cover:
- `lib/score.ts` — all scoring formula branches (max, min, floor clamping, per-amenity, area type)
- `lib/groq.ts` — happy path, JSON retry, exhausted retries, network error
- API routes and components

---

## Deployment (Netlify)

The project includes `@netlify/plugin-nextjs`. To deploy:

1. Push to GitHub
2. Connect the repo in the Netlify dashboard
3. Set `GROQ_API_KEY` in Netlify → Site settings → Environment variables
4. Deploy (Netlify auto-detects Next.js and builds correctly)
