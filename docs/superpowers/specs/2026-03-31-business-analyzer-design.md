# Business Location Analyzer — Design Spec
**Date:** 2026-03-31

## Overview
A single-page web app where users drop a pin on a map, enter a business type, and receive an AI-powered analysis of whether that business is likely to succeed at that location. Targeted at Azerbaijan for initial launch.

---

## Architecture

```
Browser (Next.js)
  └── Map UI (Leaflet.js + OpenStreetMap tiles)
        ↓ user drops pin + types business name
  └── /api/places  (Netlify serverless function)
        ↓ queries Overpass API with lat/lng (500m radius)
        → returns: nearby business categories, competitor count, area type
  └── /api/analyze  (Netlify serverless function)
        ↓ sends OSM data + business name to Groq (Llama 3)
        → returns: success probability %, pros, cons, verdict
  └── Result UI — displays analysis as bottom sheet
  └── localStorage — persists past analyses
```

**Stack:**
- Framework: Next.js (React)
- Map: Leaflet.js + OpenStreetMap tiles (free, no API key)
- Location data: OpenStreetMap via Overpass API (free, no API key)
- LLM: Groq API — `llama3-8b-8192` model (free tier)
- Storage: Browser localStorage (no accounts, no backend DB)
- Deployment: Netlify (Next.js plugin, API routes → serverless functions)

---

## UI / UX Flow

The app has a single page with 4 states:

### State 1 — Map (default)
- Full-screen map centered on Baku, Azerbaijan
- Subtle instruction text: "Drop a pin to analyze a location"
- User clicks/taps to place a draggable pin

### State 2 — Business Input
- Pin placed, a modal/popup appears
- Single text input: "What business do you want to open here?"
- Submit button

### State 3 — Loading
- Map dims slightly, centered loading animation
- Two-step progress indicator:
  1. "Fetching area data..."
  2. "Analyzing with AI..."

### State 4 — Result
- Slide-up bottom sheet over the map (map stays visible)
- Displays:
  - Business name + location
  - **Success probability** — large percentage, color-coded (green ≥70, yellow 40–69, red <40)
  - **Why it could work** — 2–3 bullet points (pros)
  - **Risks** — 2–3 bullet points (cons)
  - **Overall verdict** — one AI-generated sentence
- "Analyze another location" button resets to State 1
- Result is auto-saved to localStorage

### History Sidebar
- Small icon to open past analyses from localStorage
- List view: location name, business type, score, date

---

## Data Layer

### Overpass API Query
Radius: 500m around dropped pin. Fetches:
- Count of businesses by category (restaurants, shops, entertainment, etc.)
- Direct competitor count — same business type nearby
- Area type inference — residential, commercial, or mixed
- Nearby amenities — schools, parks, transit stops (foot traffic proxies)

### Groq Prompt Structure
```
Location: [lat, lng] in Azerbaijan
Business type: [user input]
Nearby data:
- [N] similar venues within 500m
- Area type: [residential / commercial / mixed]
- Nearby: [schools, metro stations, cafes, etc.]
- Total businesses in radius: [N]

Analyze the viability of opening a [business type] here.
Return JSON only:
{
  "score": 0-100,
  "pros": ["...", "...", "..."],
  "cons": ["...", "...", "..."],
  "verdict": "One sentence summary."
}
```

### localStorage Schema
```json
{
  "analyses": [
    {
      "id": "uuid",
      "date": "2026-03-31",
      "lat": 40.4093,
      "lng": 49.8671,
      "business": "Game Club",
      "score": 72,
      "pros": ["...", "..."],
      "cons": ["...", "..."],
      "verdict": "..."
    }
  ]
}
```

---

## API Routes

### `POST /api/places`
**Input:** `{ lat, lng, businessType }`
**Action:** Queries Overpass API, processes raw OSM data into structured context
**Output:** `{ competitors, areaType, amenities, totalBusinesses }`

### `POST /api/analyze`
**Input:** `{ lat, lng, businessType, placesContext }`
**Action:** Builds prompt, calls Groq API, parses JSON response
**Output:** `{ score, pros, cons, verdict }`

---

## Error Handling
- Overpass API timeout or no data → show message: "Not enough data for this area. Try a more populated location."
- Groq API failure → show message: "Analysis failed. Please try again."
- Invalid JSON from Groq → retry once, then surface error

---

## Language
The app UI is in Azerbaijani. All labels, instructions, button text, loading messages, and result output must be in Azerbaijani.

The Groq prompt will instruct the model to return `pros`, `cons`, and `verdict` text in Azerbaijani.

---

## Future Upgrades
- Swap OpenStreetMap for Google Places API for richer data (ratings, popular times)
- Add more regions beyond Azerbaijan
- User accounts + cloud-synced history
