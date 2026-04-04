# Scoring Improvements Design
**Date:** 2026-04-05
**Project:** myblocate (hanimenebiznes)
**Status:** Approved

---

## Overview

Expand the deterministic scoring system from 6 to 7 factors by incorporating real-world data signals: metro ridership, urban density tier, bus stop count, parking availability, grocery store proximity, and distance-weighted competitors. Add a factor breakdown panel to the result screen so users can see per-factor scores.

---

## Decisions Made

| Question | Decision |
|---|---|
| Geographic scope for metro data | Metro signal for Baku only (26 stations). OSM-only fallback outside Baku. No WorldPop API. |
| Result screen changes | Add a factor breakdown panel (7 rows: label, progress bar, score/max) |
| Data freshness strategy | Static files for metro + settlements; Overpass remains the live source for all OSM signals |
| opendata.az live call | Not used — no bus stop dataset found on opendata.az; Overpass already covers this live |

---

## Data Sources

| Factor | Source | Type | Update cadence |
|---|---|---|---|
| Population density / demographics | `datasets/azrbaycann_hrlri...geojson` → `lib/settlements.ts` (pre-processed) | Static | Manual (GeoJSON is from official AZ registry) |
| Foot traffic — metro | `datasets/pathways.csv` + `datasets/passenger_2025.csv` → `lib/metro-stations.ts` | Static | Annual (new CSV each year) |
| Foot traffic — roads | Overpass `highway=primary\|secondary\|tertiary` count | Live | Real-time OSM |
| Commercial zone | Overpass `landuse` + `shop`/`amenity` density (existing `areaType`) | Live | Real-time OSM |
| Bus stops | Overpass `highway=bus_stop` count | Live | Real-time OSM |
| Parking | Overpass `amenity=parking` count | Live | Real-time OSM |
| Competitors | Overpass `out body` (upgraded from `out tags`) — distance-weighted | Live | Real-time OSM |
| Grocery stores | Overpass `shop=supermarket\|convenience\|grocery\|food` count | Live | Real-time OSM |

---

## PlacesContext Changes (`lib/types.ts`)

### Fields added
```ts
busStops: number          // highway=bus_stop count within 500m (replaces fragile amenities string)
parking: number           // amenity=parking count within 500m
groceryStores: number     // shop=supermarket|convenience|grocery|food count within 500m
majorRoads: number        // highway=primary|secondary|tertiary count within 500m
metroDistance: number | null   // metres to nearest station exit; null if >2km or outside Baku
metroRidership: number | null  // daily avg passengers at nearest station; null if no metro
urbanTier: 'metro-city' | 'city' | 'town' | 'rural'
```

### Fields removed
None. Existing fields (`competitors`, `areaType`, `amenities`, `totalBusinesses`, `landUse`, `recognized`) are kept. `amenities` string array is kept for the Groq prompt context but `busStops` is now the authoritative count for scoring.

---

## AnalysisResult Changes (`lib/types.ts`)

```ts
factors: Array<{ key: FactorKey; score: number; max: number }>
```

`FactorKey` union:
```ts
type FactorKey = 'competition' | 'footTraffic' | 'areaType' | 'urbanTier' | 'accessibility' | 'nearbyServices' | 'businessDensity'
```

---

## Scoring Formula (`lib/score.ts`)

7 factors, max total = 95.

| # | Factor | Key | Max | Scoring logic |
|---|---|---|---|---|
| 1 | Competition | `competition` | 22 | 0 competitors = 22; linear decay to 0 at 10+ competitors |
| 2 | Foot traffic | `footTraffic` | 20 | Metro ridership tier (0–12) + major road count capped at 3 (0–8) |
| 3 | Area type | `areaType` | 13 | commercial=13, mixed=9, residential=5 |
| 4 | Urban tier | `urbanTier` | 10 | metro-city=10, city=7, town=4, rural=1 |
| 5 | Accessibility | `accessibility` | 12 | bus stops: 0→0, 1→3, 2→5, ≥3→7 (0–7) + parking: 0→0, ≥1→5 (0–5) |
| 6 | Nearby services | `nearbyServices` | 8 | grocery: 0→0, 1→2, 2→4, ≥3→5 (0–5) + amenities array length: 0→0, 1→1, ≥2→3 (0–3) |
| 7 | Business density | `businessDensity` | 10 | totalBusinesses: 0→0, 10→4, 25→7, 50+→10 (log scale) |

**Metro ridership tiers (factor 2):**
- ≥ 30,000/day → 12
- ≥ 20,000/day → 10
- ≥ 10,000/day → 7
- ≥ 5,000/day → 4
- Metro present but < 5,000 → 2
- No metro (null) → 0

**Land-use hard caps** remain unchanged (cemetery, military, industrial, etc. cap the final score regardless of factor sum).

`score.ts` exports `{ score: number; factors: FactorBreakdown[] }` instead of a bare `number`.

---

## Static Files

### `lib/metro-stations.ts`
Hand-compiled from `datasets/pathways.csv` + `datasets/passenger_2025.csv`.

```ts
interface MetroStation {
  nameAz: string
  exits: Array<{ lat: number; lng: number }>  // coordinates divided by 1_000_000
  dailyRidership: number                       // avg 2025 ridership
}
export const METRO_STATIONS: MetroStation[]
```

Name mismatches resolved manually:
- `"28.05.2026 00:00:00"` → `"28 May"`
- `"Şah İsmayıl Xətai"` → `"Xətai"` (passenger_2025.csv spelling)
- `"Memar Əcəmi 2"` vs `"Memar Əcəmi-2"` → unified as `"Memar Əcəmi 2"`
- `"Koroğlu"` vs `"Koroglu"` → matched by index order

Lookup: for a given pin (lat, lng), find nearest exit across all stations using haversine. If distance > 2000m → `metroDistance: null`, `metroRidership: null`.

### `lib/settlements.ts`
Pre-processed from `datasets/azrbaycann_hrlri_v_inzibati_razi_vahidlri.geojson` by a one-off Node.js script (not shipped).

```ts
type UrbanTier = 'metro-city' | 'city' | 'town' | 'rural'
interface Settlement { lat: number; lng: number; tier: UrbanTier }
export const SETTLEMENTS: Settlement[]
```

Tier mapping from GeoJSON `TYPE` field:
- `"city"` + NAME_AZ is Bakı or Sumqayıt → `'metro-city'`
- `"city"` or `"town"` → `'city'` / `'town'`
- `"settlement"` or `"kənd"` → `'rural'`

Lookup: nearest settlement by haversine.

---

## Overpass Query Changes (`lib/overpass.ts`)

- Switch from `out tags` to `out body` to get coordinates for each element (enables distance-weighted competitor scoring)
- Add three new node queries within the same 500m radius:
  - `node["highway"="bus_stop"]` → `busStops` count
  - `node["amenity"="parking"]` → `parking` count  
  - `node["shop"~"supermarket|convenience|grocery|food"]` → `groceryStores` count
- Add `way["highway"~"primary|secondary|tertiary"]` for `majorRoads` count
- Competition score: weight competitors by distance (< 200m counts full, 200–500m counts 0.5)

All new queries are bundled into the existing Overpass request — no extra HTTP calls.

---

## Groq Prompt Changes (`lib/groq.ts`)

Add to the data block:
```
- Metro məsafəsi: ${metroDistance ? `${metroDistance}m` : 'yoxdur'}
- Metro gündəlik sərnişin: ${metroRidership ?? 'məlumat yoxdur'}
- Şəhər tipi: ${urbanTier}
- Bus dayanacağı: ${busStops}
- Ərzaq mağazası: ${groceryStores}
- Parkinq: ${parking}
```

---

## UI Changes

### `components/FactorBreakdown.tsx` (new)
- 7 rows, each: factor label (from i18n) + narrow progress bar + `score/max`
- Tailwind v4, no new dependencies
- Accepts `factors: Array<{ key: FactorKey; score: number; max: number }>` + `lang: Lang`

### `app/page.tsx`
- Pass `result.factors` to `<FactorBreakdown>` below the score display
- No state machine changes

### `lib/az.ts` + `lib/en.ts`
Add factor label strings:
```ts
FACTOR_COMPETITION: '...', FACTOR_FOOT_TRAFFIC: '...', FACTOR_AREA_TYPE: '...',
FACTOR_URBAN_TIER: '...', FACTOR_ACCESSIBILITY: '...', FACTOR_NEARBY_SERVICES: '...',
FACTOR_BUSINESS_DENSITY: '...'
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Overpass down | Existing `.catch(() => ({ elements: [] }))` — all new fields default to `0`, `metroDistance/Ridership: null`, `urbanTier: 'rural'` |
| Pin outside Baku (no metro) | `metroDistance: null`, `metroRidership: null` — foot traffic uses roads only |
| Pin far from all settlements | Nearest settlement used (haversine); worst case `urbanTier: 'rural'` |
| Groq bad JSON | Existing 2-attempt retry unchanged — `factors` from score.ts not affected |

---

## Testing

- `__tests__/lib/score.test.ts` — update for new signature `{ score, factors }`, add cases: metro nearby vs null, rural vs metro-city, all-zero new fields, land-use cap
- `__tests__/lib/overpass.test.ts` — update mocks to include new `PlacesContext` fields
- `__tests__/api/places.test.ts` — update expected PlacesContext shape
- All 38 existing tests must pass; total grows to ~48

---

## Files Affected

| File | Change type |
|---|---|
| `lib/types.ts` | Modify |
| `lib/overpass.ts` | Modify |
| `lib/score.ts` | Modify |
| `lib/groq.ts` | Modify |
| `lib/az.ts` | Modify |
| `lib/en.ts` | Modify |
| `lib/metro-stations.ts` | Create |
| `lib/settlements.ts` | Create |
| `components/FactorBreakdown.tsx` | Create |
| `app/page.tsx` | Modify |
| `__tests__/lib/score.test.ts` | Modify |
| `__tests__/lib/overpass.test.ts` | Modify |
| `__tests__/api/places.test.ts` | Modify |
| `next.config.ts` | No change |
| `app/api/places/route.ts` | No change |
| `app/api/analyze/route.ts` | No change |

---

## Out of Scope

- WorldPop API integration
- opendata.az live calls (no suitable public dataset found)
- Changes to Map.tsx, MapErrorBoundary.tsx, ratelimit.ts
- Any changes to the map init effect deps (must stay `[]`)
