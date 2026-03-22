# HANDOFF — VR Simulator V3.1.2

## Project Overview

VR (Value Rebalancing) Simulator for leveraged ETF investing using the 라오어 실력공식. Two deployments:
- **Streamlit**: https://vr-simulator.streamlit.app/ (`app.py`)
- **GitHub Pages**: https://wjgoarxiv.github.io/vr-simulator/ (React app in `react_app/`)

## What Was Done This Session

### 1. Autoconference Validation (app.py)
- Ran 4-researcher autoconference (5 rounds, very-tight convergence) to validate `app.py` against the published 라오어 실력공식
- **Formula verdict**: CORRECT (4/4 consensus) — core formula exactly matches published 실력공식
- **Strategy verdict**: COMPUTATIONALLY SOUND (4/4 consensus)
- Implemented 7 approved modifications (MOD-01, 02, 05, 06, 07, 08, 10)
- Version bumped from V3.1.1 → V3.1.2

### 2. React App Rebuild (from scratch)
- Old React source was deleted (commit `b35a02b`), only `dist/` remained
- Built fresh React 18 + Vite 5 + Tailwind 3.3 app matching app.py V3.1.2 exactly
- Used team orchestration (Layer 0-5) with parallel workers
- Stack: React 18, Vite 5, Tailwind CSS, Plotly.js, PapaParse, Lucide Icons

### 3. Retrofuture Terminal UI Redesign
- Redesigned from generic GitHub Dark clone to Retrofuture Terminal aesthetic
- JetBrains Mono + Noto Sans KR typography pairing
- 5-tier surface depth color system with cyan/green/red/amber accents
- Breathing glow animations on signal cards
- Terminal-style section dividers, LED status indicators

### 4. Bug Fixes (multiple rounds)
- **Market status off-by-one**: UTC/ET timezone mismatch in `marketStatus.js` — all 6 date-addition branches were 1 day behind. Fixed with pure calendar-date arithmetic.
- **Charts crash**: `CycleInput.jsx` used snake_case keys (`divergence_ratio`) but `calculateAdaptiveBands()` returns camelCase (`divergenceRatio`). Fixed key names.
- **PNG export broken**: Charts unmounted on tab switch, killing Plotly refs. Fixed by keeping Charts mounted with `display:none` + `Plotly.Plots.resize()` on visibility change.
- **PNG export low-res fonts**: On-screen 11px fonts were tiny in 2880x2120 export. Fixed with off-screen Plotly instances using 42px titles, 36px body, 30px ticks.
- **PNG export as 4 separate files**: Changed to single bundled 2x2 canvas composite (1400x1000 per chart).
- **Buy/sell table download missing**: Added `downloadTableCSV()` helper + buttons above each table.
- **Table download button hidden**: Moved buttons above scrollable `max-h-[400px]` table area with sticky headers.

### 5. README + Cover Image
- Stargazing-style README matching youtube-digest-skill format
- Cover image: `generate_cover.py` — 2560x960, emerald/amber palette, JetBrains Mono, gaussian blur blobs, film grain, 350 DPI

## Current State

### Git History (latest first)
```
f5bf106  fix(react): Move table download buttons above scrollable area
5611843  style(react): Increase chart scatter marker size from 6 to 10
34fbe3d  fix(react): Increase PNG export font sizes
2375189  fix(react): Use large fonts in PNG export via off-screen Plotly render
c8b9cad  fix(react): Constrain chart sizing to prevent overflow
e809901  fix(react): Bundled 2x2 high-res PNG export
6d15cbc  fix(react): Keep Charts mounted for PNG export across tabs
8639268  fix(react): Fix Charts crash and PNG export
6df482f  feat(react): Retrofuture Terminal UI redesign
7cdd243  docs(README): Update cover image and fix version labels
625af6c  fix(react): Fix market status off-by-one day + redesign README
aa233d0  feat(react): Rebuild React app V3.1.2 for GitHub Pages deployment
8a83af5  feat(v3.1.2): Autoconference-validated fixes and V/E cap indicator
```

### File Structure
```
app.py                          # Streamlit app (V3.1.2, ~1220 lines)
README.md                       # Stargazing-style README
cover.png                       # Generated cover image (2560x960)
generate_cover.py               # Cover image generator
react_app/
├── package.json                # React 18 + Vite 5
├── vite.config.js              # base: /vr-simulator/
├── tailwind.config.js          # Retrofuture Terminal design system
├── src/
│   ├── App.jsx                 # State management + layout
│   ├── index.css               # Design system classes
│   ├── constants.js            # VR parameters (identical to app.py)
│   ├── utils/
│   │   ├── vrCalculations.js   # All VR math (10 functions)
│   │   ├── csvHandling.js      # CSV import/export + validation
│   │   └── marketStatus.js     # KST market status
│   └── components/
│       ├── Sidebar.jsx         # Settings, adaptive toggle, market info
│       ├── InitialSetup.jsx    # CSV upload or manual input
│       ├── CycleViewer.jsx     # Metrics, signals, tables
│       ├── CycleInput.jsx      # Next cycle form
│       ├── ResultsDashboard.jsx # KPIs, tabs, downloads
│       └── Charts.jsx          # 4 Plotly charts + PNG export
```

## What Worked Well
- Team orchestration with parallel workers for React rebuild (3 layers)
- Autoconference with devil's advocate for formula validation
- Post-hoc V/E cap detection (no function signature change needed)
- Off-screen Plotly rendering for high-res PNG export

## What Didn't Work / Required Iteration
- **camelCase/snake_case mismatch**: vrCalculations.js returns camelCase but CycleInput initially used snake_case keys — caused Plotly crash with undefined data
- **Charts unmounting on tab switch**: Conditional rendering (`{activeTab === 1 && <Charts/>}`) killed refs. Had to keep Charts mounted with `display:none`
- **PNG export**: Went through 4 iterations — separate files → bundled canvas → small fonts → larger fonts
- **Table download buttons**: Initially placed below tables, invisible with many rows. Moved above with scrollable container.

## Deferred Work (Not Implemented)
These were identified in the autoconference but deferred by 3/4+ vote:

1. **MOD-03 (ROI includes pool)**: ROI calculation excludes pool balance. Needs product decision: show 1 or 2 ROI metrics.
2. **MOD-04 (Band code dedup)**: `calculate_bands()` and `calculate_adaptive_bands()` have duplicated logic. Needs test suite before safe refactoring.
3. **MOD-05 partial**: V/E cap indicator implemented in React, but app.py's `calculate_v_next()` still returns a simple float (no metadata). Post-hoc detection works but is a workaround.

## Deployment
- **Streamlit**: Auto-deploys from main branch via Streamlit Cloud
- **GitHub Pages**: Manual via `cd react_app && npm run build && npx gh-pages -d dist`
- **Pages config**: `build_type: legacy`, `source: gh-pages branch`

## Key Constants (must stay identical between app.py and React)
```
VR_VERSION = "3.1.2"
BASE_BAND_LOWER = 0.85
BASE_BAND_UPPER = 1.15
MIN_BAND_LOWER = 0.92
MAX_BAND_UPPER = 1.08
VE_DIVERGENCE_THRESHOLD = 0.05
VE_MAX_DIVERGENCE = 0.50
MAX_V_E_RATIO = 1.15
```

## Conference Artifacts
Located in `.omc/conference/`:
- `synthesis.md` — Final autoconference synthesis report
- `conference.md` — Conference configuration
- `researcher_{A,B,C,D}_log.md` — Per-researcher findings
