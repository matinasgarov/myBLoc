# Expert Panel Feature — Design Spec
**Date:** 2026-04-27  
**Status:** Approved

---

## Overview

After a location analysis completes, users can open an "Ekspert Paneli" modal. Four role-based AI agents (each powered by a separate Groq call) analyze the OSM data from different angles simultaneously. A fifth synthesizer agent reads all four opinions and produces a final 2-sentence verdict. The panel follows the app's current language setting (AZ / EN).

---

## Architecture

### API Route — `app/api/expert-panel/route.ts`

**Method:** POST  
**Request body:**
```ts
{
  lat: number
  lng: number
  businessType: string
  score: number
  placesContext: PlacesContext
  luxuryMismatch?: boolean   // from AnalysisResult, not PlacesContext
  rentTierAz?: string        // from AnalysisResult
  districtPopulationK?: number
  lang: 'az' | 'en'
}
```

**Response:**
```ts
{
  agents: Array<{
    role: string       // e.g. "Market Analyst"
    emoji: string      // e.g. "📊"
    opinion: string    // 3–4 sentences from Groq
  }>
  verdict: string      // 2-sentence synthesizer output
}
```

**Execution flow:**
1. Validate required fields (lat, lng, businessType, score, placesContext). Return 400 if missing.
2. Build 4 role-specific prompts using `placesContext` + `score` + `lang`.
3. Fire all 4 Groq calls with `Promise.all` (model: `llama-3.3-70b-versatile`, `temperature: 0.7`).
4. Collect responses, build synthesizer prompt with all 4 opinions.
5. Fire synthesizer Groq call (5th call).
6. Return `{ agents, verdict }`.
7. On any Groq error: return 200 with fallback empty strings (never 500 — same pattern as `/api/places`).

---

## The Four Agents

| Agent | Emoji | Focus area | Key data fields used |
|---|---|---|---|
| Market Analyst | 📊 | Competition landscape | `competitors`, `dominantCompetitors`, `recognized`, `totalBusinesses` |
| Risk Advisor | ⚠️ | Risks & mismatches | `landUse`, `areaType`, `rentTier`, `luxuryMismatch` (passed via score context) |
| Location Strategist | 🗺️ | Location strengths | `metroDistance`, `metroRidership`, `urbanTier`, `majorRoads`, district population |
| Customer Flow Expert | 🚶 | Foot traffic & access | `busStops`, `parking`, `groceryStores`, `amenities` |

Each agent receives only its relevant fields to keep prompts tight. Each writes 3–4 sentences in the specified language.

---

## UI Components

### Button — `ResultSheet.tsx` + `DesktopDashboard.tsx`

- Label: `strings.EXPERT_PANEL_BUTTON` ("Ekspert Paneli" / "Expert Panel")
- Positioned near the reset strip in both mobile and desktop result layouts
- Disabled until `result` is available (always true when button is visible, but guard anyway)

### Modal — `components/ExpertPanelModal.tsx`

**Props:**
```ts
{
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  businessType: string
  score: number
  placesContext: PlacesContext
  lang: Lang
}
```

**Layout:**
- Full-screen dark blurred backdrop (`z-[2000]`, `backdrop-filter: blur`)
- Centered scrollable container (max-width 640px on desktop, full-width on mobile)
- Header: title (`strings.EXPERT_PANEL_TITLE`) + close button (×)
- 4 agent cards (stacked on mobile, 2×2 grid on desktop `md:grid-cols-2`)
- Moderator verdict card at bottom — distinct style (brighter border, `strings.EXPERT_PANEL_VERDICT` label)
- Dismiss: close button, backdrop click, or Escape key

**Agent card anatomy:**
- Header row: emoji + role name
- Body: opinion text (3–4 sentences)
- Dark card background, subtle colored left border per agent (matches layer panel color palette)

**Loading state:**
- Cards render immediately with agent names + pulsing skeleton body (`animate-pulse`)
- Single `Promise.all` — all 4 cards fill in simultaneously on resolve
- `strings.EXPERT_PANEL_LOADING` shown inside skeleton area

**Error state:**
- If API returns error or network fails: show a single error message card instead of agents
- No retry button (keep it simple)

---

## State & Caching

In `page.tsx`:
```ts
const expertPanelCacheRef = useRef<{ agents: AgentResponse[]; verdict: string } | null>(null)
const [expertPanelOpen, setExpertPanelOpen] = useState(false)
```

- Cache is populated on first successful fetch
- Re-opening modal reads from `expertPanelCacheRef.current` — no second API call
- Cache is cleared in `handleReset()` alongside `mapKey` increment

---

## i18n Strings

Add to `lib/az.ts` and `lib/en.ts`:

| Key | AZ | EN |
|---|---|---|
| `EXPERT_PANEL_BUTTON` | Ekspert Paneli | Expert Panel |
| `EXPERT_PANEL_TITLE` | Ekspert Rəy Paneli | Expert Opinion Panel |
| `EXPERT_PANEL_VERDICT` | Moderator Nəticəsi | Moderator Verdict |
| `EXPERT_PANEL_LOADING` | Ekspertlər analiz edir... | Experts analyzing... |
| `EXPERT_PANEL_ERROR` | Məlumat yüklənmədi | Could not load panel |

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `app/api/expert-panel/route.ts` | New | API route, 5 Groq calls |
| `components/ExpertPanelModal.tsx` | New | Modal UI, skeleton, agent cards |
| `app/page.tsx` | Edit | Add cache ref, open state, pass props to result components |
| `components/ResultSheet.tsx` | Edit | Add "Ekspert Paneli" button + modal wiring |
| `components/DesktopDashboard.tsx` | Edit | Same button for desktop layout |
| `lib/az.ts` | Edit | 5 new string keys |
| `lib/en.ts` | Edit | 5 new string keys |
| `lib/i18n.ts` | Edit | Export new string keys in `Strings` type |

---

## Out of Scope

- No streaming (all 4 agents arrive together)
- No agent-to-agent conversation in real-time (parallel, not sequential)
- No caching across sessions (cache lives only for the current analysis in memory)
- No test coverage for the modal UI (component tests only if already established in project)
