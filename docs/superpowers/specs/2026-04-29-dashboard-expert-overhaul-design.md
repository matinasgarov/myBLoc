# Design Spec: Dashboard & Expert Panel Visual Overhaul

**Date:** 2026-04-29  
**Status:** Approved

---

## Scope

Six distinct changes across the desktop dashboard, loading overlay, map layer panel, and expert panel modal. No changes to scoring logic, API validation, PDF export, or mobile views.

---

## 1. Layout Ratio & Glassmorphism

### Layout
Change the map/dashboard flex split from `flex:3` / `flex:2` (≈60/40) to explicit `flex: 0 0 55%` / `flex: 0 0 45%` in `app/page.tsx`.

### Glassmorphism
Dashboard background changes from solid `#07090D` to a frosted-glass panel.

CSS variables added to `globals.css`:
```css
:root {
  --dashboard-bg: rgba(7, 9, 13, 0.70);
  --dashboard-blur: blur(24px) saturate(1.4);
  --dashboard-border: rgba(255, 255, 255, 0.10);
}
```

Applied in `DesktopDashboard.tsx` root div:
```tsx
style={{
  background: 'var(--dashboard-bg)',
  backdropFilter: 'var(--dashboard-blur)',
  WebkitBackdropFilter: 'var(--dashboard-blur)',
  borderLeft: '1px solid var(--dashboard-border)',
}}
```

The `DesktopDashboard` container in `page.tsx` removes its hardcoded `borderLeft` (now owned by the component).

**Constraint:** `backdrop-filter` only renders visibly when the element is positioned over the map. The dashboard is already adjacent to the map in the DOM, so this works without DOM changes.

---

## 2. Loading Overlay

**File:** `components/LoadingOverlay.tsx`

### Spinner
Replace the plain blue `animate-spin` ring with an indigo composite spinner:
- Outer ring: `rgba(99,102,241,0.15)` static circle
- Rotating arc: `border-top-color: #6366f1`, 1s spin
- Inner glowing dot: 8×8px, `background:#6366f1`, `box-shadow: 0 0 8px rgba(99,102,241,0.8)`

### Step Indicators
Each step gets a 16px circular icon replacing the `▸ · ✓` text symbols:
- **Future:** empty ring, `border: 1px solid rgba(255,255,255,0.1)`
- **Active:** ring with animated indigo pulse dot inside, `border: 2px solid rgba(99,102,241,0.6)`
- **Done:** filled green circle with SVG checkmark

Steps animate in with 80ms stagger on mount (CSS `animation-delay`).

### Artificial Floor
In `page.tsx` `handleBusinessSubmit`, a minimum 1500ms artificial delay is added before the loading state can advance from step 1, regardless of how fast the `/api/places` call returns. Implementation: start a `minDelay` promise alongside the fetch; advance to step 4 only after both resolve. This does **not** block the fetch itself — they run in parallel.

```ts
const [placesRes] = await Promise.all([
  fetch('/api/places', ...),
  new Promise(resolve => setTimeout(resolve, 1500)),
])
```

---

## 3. Map Layer Panel i18n

**Files:** `lib/az.ts`, `lib/en.ts`, `components/Map.tsx`, `app/page.tsx`

### New string keys
```ts
// az.ts
LAYER_BUS: 'Avtobus',
LAYER_METRO: 'Metro',
LAYER_TRANSPORT: 'Nəqliyyat',
LAYER_COMPETITORS: 'Rəqiblər',

// en.ts
LAYER_BUS: 'Bus Stops',
LAYER_METRO: 'Metro',
LAYER_TRANSPORT: 'Transport',
LAYER_COMPETITORS: 'Competitors',
```

### Map.tsx
Add `strings?: Strings` to the Map props interface. Layer toggle buttons use `strings.LAYER_BUS` etc. instead of hardcoded English. The prop is optional with English fallback so the component remains safe if strings are omitted.

### page.tsx
Pass `strings={strings}` to `<Map>`.

---

## 4. Expert Panel — Character Avatars

**File:** `components/ExpertPanelModal.tsx`

Each agent card replaces the plain `<span>{agent.emoji}</span>` with a 44×44px circular SVG avatar. The avatar uses the agent's existing border color and includes a role-specific silhouette accessory.

### Avatar definitions (one per agent index)
| Index | Role | Accessory | Color |
|---|---|---|---|
| 0 | Data Analyst | Glasses + tie | `#f59e0b` amber |
| 1 | Risk Advisor | Hard hat | `#ef4444` red |
| 2 | Location Expert | Baseball cap | `#3b82f6` blue |
| 3 | Foot Traffic Expert | Walking silhouette | `#10b981` emerald |

### Avatar component
A local `AgentAvatar({ index, color }: { index: number; color: string })` function component renders the correct SVG inline. No external images or fonts required.

The avatar sits where the emoji span currently is in the agent card layout. Container: `width:44px; height:44px; border-radius:50%; background: <color at 15% opacity>; border: 2px solid <color at 50% opacity>`.

---

## 5. Expert Panel — Extended Logic (Confidence Meter)

### API route: `app/api/expert-panel/route.ts`
The prompt is updated to:
1. Request 3–4 sentence opinions per agent (up from 1–2)
2. Add a `confidence` field (integer 0–10) to each agent's JSON output, representing how confident that agent is in their assessment given the data

Updated agent JSON schema in prompt:
```json
{
  "role": "...",
  "emoji": "...",
  "opinion": "3-4 sentences",
  "response": "2-3 sentences after discussion",
  "confidence": 7
}
```

### Type update: `components/ExpertPanelModal.tsx`
```ts
interface AgentResponse {
  role: string
  emoji: string
  opinion: string
  response: string
  confidence?: number   // 0–10, optional for backwards compat
}
```

### Confidence meter UI
Below each agent's `opinion` paragraph, render a row of 10 small dots:
- Filled dots: agent's color at 80% opacity
- Empty dots: `rgba(255,255,255,0.08)`
- Dot size: 6×6px, 4px gap, `border-radius: 50%`
- Label: `"7 / 10"` in 9px muted text to the right

This meter only renders when `agent.confidence !== undefined`.

---

## 6. Data Visualization — Factor Bar Colors

**File:** `components/Charts.tsx` (the `BarsChartDisplay` component)

Factor bars currently fill with flat blue (`#3b82f6`). Change the fill color to be score-relative:
- ≥ 70% of max → `#34d399` emerald
- 40–69% → `#fbbf24` amber  
- < 40% → `#f87171` red

This matches the existing `scoreColor()` helper already in `DesktopDashboard.tsx`. Duplicate the 3-line function locally in `Charts.tsx` — it doesn't warrant a shared utility file.

---

## Files Changed

| File | Change type |
|---|---|
| `app/globals.css` | Add 3 CSS variables |
| `app/page.tsx` | Layout ratio, `strings` prop to Map, artificial delay |
| `components/DesktopDashboard.tsx` | Apply CSS variables to root style |
| `components/LoadingOverlay.tsx` | New spinner, circular step icons, stagger animation |
| `components/Map.tsx` | Accept `strings` prop, use i18n labels in layer panel |
| `components/ExpertPanelModal.tsx` | Character avatars, confidence meter, type update |
| `components/Charts.tsx` | Color-coded bar fills |
| `app/api/expert-panel/route.ts` | Extended prompt, `confidence` field |
| `lib/az.ts` | 4 new string keys |
| `lib/en.ts` | 4 new string keys |

---

## What This Does Not Change

- Scoring algorithm (`lib/score.ts`) — untouched
- Mobile layout (`ResultSheet.tsx`) — untouched  
- PDF export (`PdfDownloadButton.tsx`) — untouched
- History sidebar — untouched
- Test suite — all 61 existing tests must continue to pass; no new tests required for UI-only changes
