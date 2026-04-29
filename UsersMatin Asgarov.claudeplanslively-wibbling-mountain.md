# Plan: Interactive Map Layer Control Panel

## Context
After a result is shown, the map is static - users cannot explore what is around their pin. This adds a 4-button toggle panel (top-right corner of the map) visible only in result state. Each button queries Overpass for that category and renders colored markers; toggling off removes them. All 4 layers are independent.

---

## Files to Change

| File | Change |
|---|---|
|  | **New** - server-side Overpass queries per layer type |
|  | Export  and  |
|  | Add showLayerPanel + businessType props, layer refs, toggle UI, toast |
|  | Pass showLayerPanel and businessType to Map |

---

## Step 1 - Export helpers from lib/overpass.ts

Add  keyword to two existing unexported functions:
-  (line 62) - reused by the new API route
-  (line 228) - resolves business type string to OSM tag values for competitors layer

---

## Step 2 - New API Route: app/api/layers/route.ts

Accepts POST , returns .

**LayerType to Overpass query:**

| Layer | Overpass nodes | Radius |
|---|---|---|
|  |  +  | 500m |
|  |  +  +  | 2000m |
|  |  +  | 500m |
|  | Call resolveOSMTags(businessType) then build amenity/shop node queries | 500m |

Extract coords: / for nodes, / for ways (existing OSMElement pattern).

Return 400 if lat/lng/layerType missing. Return 200 with empty array on Overpass error or no resolved tags.

---

## Step 3 - components/Map.tsx Changes

**New props:**
\
**New state:**
-  - all false initially
-  - all false initially  
- 
**New ref (same ref pattern as markerRef):**
\
**Layer colors (small filled dot divIcons, 14x14):**
- bus:  amber
- metro:  purple  
- transport:  emerald
- competitors:  red

**Toggle handler logic:**
- Layer ON: remove all its markers from map, clear array, set active false
- Layer OFF: POST to /api/layers, add L.marker per element with colored divIcon, store in layerMarkersRef, set active true
- Empty result: show toast 3s, button stays inactive
- Loading: show spinning indicator on button while fetching

**Clear layers when pin changes:**
In the existing pin useEffect, before creating new pin marker, loop all 4 types: call .remove() on each, clear arrays, reset activeLayers to all false.

**Return structure wrapping change:**
Currently returns bare . Wrap it so overlays can be absolutely positioned:
\
**Panel UI (position: absolute, top:12, right:12, zIndex:1000):**
4 stacked buttons (flex column, gap 6px), each: emoji + label + loading indicator.
- Active: filled with layer color
- Inactive: rgba(7,9,13,0.82) background, rgba(255,255,255,0.15) border
- backdropFilter blur(8px), borderRadius 8, minWidth 130px

**Toast UI (bottom:24, left:50%, translateX(-50%), zIndex:1000):**
Dark blurred pill, auto-dismissed after 3s.

---

## Step 4 - app/page.tsx

Add two props to the existing Map element:
\
---

## Layer Summary

| Type | Label | Color | Radius |
|---|---|---|---|
|  | Bus Stops | #f59e0b amber | 500m |
|  | Metro Stations | #a855f7 purple | 2000m |
|  | Transport Stops | #10b981 emerald | 500m |
|  | Competitors | #ef4444 red | 500m |

---

## Verification

1. error TS5025: Unknown compiler option '--noEmit'. Did you mean 'noEmit'? - 0 errors
2. Unknown command: "test"

Did you mean this?
    npm test # Test a package

To see a list of supported npm commands, run:
  npm help - all 61 tests pass (no scoring/overpass logic changed)
3. Drop pin, enter business type, submit, get result
4. Layer panel appears top-right of the map
5. Toggle each button on/off - markers appear/disappear per layer
6. All 4 layers active simultaneously - toggling one off does not affect others
7. Drop a new pin - all layers reset to inactive, all markers cleared
8. Toggle a layer in sparse area - toast shows 3s, button stays inactive
