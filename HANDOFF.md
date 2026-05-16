# HANDOFF.md — VR Simulator continuation packet

## Task
Continue development of the VR Simulator with both surfaces in mind: the React/Vite web app in `react_app/` and the Streamlit app in `app.py`. Recent work focused on reliability/UltraQA coverage, CSV hardening, React robustness, and making adaptive bands ON by default.

## Current State
- Last completed functional change before this handoff update: confusing target-V safety copy was redesigned in both `react_app/src/components/CycleViewer.jsx` and `app.py`; version surfaces were bumped to `3.1.4`.
- Current branch state at handoff creation: `git status --short --branch` showed `## main...origin/main` before this handoff/AGENTS update was written.
- Current version is `3.1.4` in `app.py`, `react_app/src/constants.js`, `react_app/package.json`, and `react_app/package-lock.json`.
- OMX team run `enhance-vr-simulator-db33a401` was completed and shut down. Evidence from `omx team status enhance-vr-simulator-db33a401 --json --tail-lines 240`: `phase=complete`, `tasks.completed=5`, `pending=0`, `in_progress=0`, `failed=0`; after shutdown, status returned `missing`, which is expected.
- No deployment was performed after the code changes. The latest push was to `https://github.com/wjgoarxiv/vr-simulator.git`, branch `main`.

## What Was Done
- `react_app/src/App.jsx`
  - Added safer saved-state loading/sanitization and localStorage write guarding during the OMX team run.
  - Changed `DEFAULT_STATE.adaptiveBandEnabled` from `false` to `true`.
  - Changed saved-state fallback so missing old saved values default to `true`, while explicit user-saved `false` remains respected.
  - Evidence: commit `1aeba7c`; verification commands below passed.
- `app.py`
  - Changed initial `st.session_state.adaptive_band_enabled` default from `False` to `True`.
  - Changed `calculate_bands(..., use_adaptive=None)` fallback from `False` to `True`.
  - Evidence: commit `1aeba7c`; `python3 -m py_compile app.py` passed.
- `react_app/src/utils/csvHandling.js` and `react_app/src/utils/csvHandling.test.js`
  - Hardened CSV parsing/export around required columns, malformed row shape, strict numeric/boolean typing, domain constraints, and escaping commas/quotes/newlines.
  - Evidence: commit `95956e1 Harden CSV import/export against malformed user files`; `cd react_app && npm test` passed with 15 tests.
- `react_app/src/utils/vrCalculations.js`, `react_app/tests/vrCalculations.test.mjs`, and `react_app/tests/ultraqa-matrix.test.js`
  - Added regression coverage for formula constants, next-V behavior, adaptive band bounds/inversion guard, table finite/monotonic edge cases, V/E cap detection, and history metadata normalization.
  - Evidence: `npm test` passed with 15 tests; `npm run qa:matrix` passed with 6 tests in the completed team run.
- `react_app/scripts/e2e-cycle-harness.mjs` and `react_app/scripts/smoke-dist.mjs`
  - Added no-browser Node E2E cycle simulation and built-dist smoke validation.
  - Evidence: `npm run e2e` reported `E2E PASS: simulated 3 adaptive cycles...`; `npm run smoke` reported `SMOKE PASS: 4 built assets referenced...`.
- `react_app/package.json`
  - Added scripts: `test`, `qa:matrix`, `e2e`, and `smoke`.
  - Evidence: `node -e "const p=require('./react_app/package.json'); console.log(JSON.stringify(p.scripts,null,2))"` showed the scripts.
- `react_app/src/components/CycleInput.jsx`, `CycleViewer.jsx`, `InitialSetup.jsx`, and `ResultsDashboard.jsx`
  - Improved adaptive metadata flow and display resilience as part of the team run.
  - Evidence: team worker completion messages and passing React test/build commands.
- `react_app/src/components/CycleViewer.jsx` and `app.py`
  - Replaced formula-heavy user-facing copy such as “V/E 상한 적용됨 / 원래 V / 제한 V / 적립금 기여분 흡수” with Toss-like plain Korean copy: “목표를 안전하게 낮췄어요”, “처음 계산된 목표”, and “이번에 적용할 목표”.
  - Evidence: implementation lane preserved calculation code and aligned the React/Streamlit message contract; verification lane should update `react_app/tests/ui-copy.test.mjs` accordingly.
- `react_app/tests/ui-copy.test.mjs`
  - Added regression coverage to prevent confusing cap/absorption wording from reappearing in user-facing copy.
- Version surfaces
  - Bumped `3.1.3` to `3.1.4` in `app.py`, `react_app/src/constants.js`, `react_app/package.json`, and `react_app/package-lock.json`; updated `README.md` visible version references.
- `HANDOFF.md`
  - Updated to include the V3.1.4 Toss-like UI-copy cleanup and version bump.
- `AGENTS.md`
  - Added local instructions requiring future agents to read `HANDOFF.md` first and keep version fields synchronized when functional improvements are made.

## Key Decisions
- Preserve explicit user preference for adaptive bands in React localStorage. New/missing values default to ON, but if a user previously saved OFF, the app keeps OFF to avoid surprising existing browser sessions.
- Keep Streamlit and React defaults aligned. `app.py` session default and React `DEFAULT_STATE` now both default adaptive bands to ON.
- Future functional improvements should normally bump version consistently across all version surfaces: `app.py` `VR_VERSION`, `react_app/src/constants.js` `VR_VERSION`, `react_app/package.json`, and `react_app/package-lock.json`. Also update visible docs such as `README.md` if they mention the version.
- Do not deploy automatically. GitHub Pages deploy remains manual via `cd react_app && npm run build && npx gh-pages -d dist`; Streamlit Cloud auto-deploys from `main` if configured externally.
- Keep React and Streamlit formula constants aligned. Existing tests include a React-side constant parity check against `app.py`.

## Open Issues
- Vite still emits a large chunk warning for the Plotly chunk during `npm run build` / `npm run smoke`:
  - Evidence: build output includes `Charts-*.js` around `4,815.84 kB` and Vite warning `Some chunks are larger than 500 kB after minification`.
  - Status: not failing; consider deeper Plotly code-splitting only if load performance becomes a user-visible problem.
- No ESLint configuration/script exists.
  - Evidence: worker-2 reported lint no-op / absent script; `react_app/package.json` has no `lint` script.
- Streamlit app does not yet have the same automated regression test harness as React.
  - Evidence: verification used `python3 -m py_compile app.py`, not behavioral Streamlit tests.

## Next Steps
1. Start every new session by reading this file first: `sed -n '1,240p' HANDOFF.md`.
2. Check state before editing:
   ```bash
   git status --short --branch
   git log -3 --oneline
   ```
3. If making any functional improvement, decide version first. For a patch-level improvement, update all of:
   - `app.py` `VR_VERSION`
   - `react_app/src/constants.js` `VR_VERSION`
   - `react_app/package.json` `version`
   - `react_app/package-lock.json` root/package version entries
   - any README/HANDOFF visible version mentions if applicable
4. For React changes, run at minimum:
   ```bash
   cd react_app && npm test
   cd react_app && npm run build
   ```
5. For QA-sensitive React changes, also run:
   ```bash
   cd react_app && npm run qa:matrix
   cd react_app && npm run e2e
   cd react_app && npm run smoke
   ```
6. For Streamlit/app.py changes, run:
   ```bash
   python3 -m py_compile app.py generate_cover.py
   ```
7. Do not deploy or push unless the user asks. If committing, use the Lore commit protocol from the higher-level AGENTS instructions.

## Context for Continuation
- Project root: `/Users/woojin/Desktop/02_Areas/01_Codes_automation/03_vr-simulator-dev`.
- React app root: `react_app/`.
- Streamlit app: `app.py`.
- Current remote: `origin https://github.com/wjgoarxiv/vr-simulator.git`.
- Recent pushed code commit before this local work: `1aeba7c Prefer adaptive bands for new simulator sessions`.
- Last known push output: `To https://github.com/wjgoarxiv/vr-simulator.git`, `f5bf106..1aeba7c main -> main`.
- Team state root from the completed run: `/Users/woojin/.omx-runs/run-20260516074304-5b4b/.omx/state/team/enhance-vr-simulator-db33a401`.
- Existing conference artifacts from the older V3.1.2 validation remain under `.omc/conference/`.

## Verification Commands
Use these commands to confirm the handoff still matches the repo:
```bash
git status --short --branch
git log -5 --oneline
node -e "const p=require('./react_app/package.json'); console.log(p.version, p.scripts)"
grep -RIn "VR_VERSION\|목표를 안전하게 낮췄어요\|adaptiveBandEnabled: true\|adaptive_band_enabled = True" app.py react_app/src/constants.js react_app/src/App.jsx react_app/src/components/CycleViewer.jsx react_app/package.json | head -n 80
cd react_app && npm test
cd react_app && npm run build
python3 -m py_compile app.py generate_cover.py
```

## Resumability Audit
- Where am I? Current state names the last completed functional commit `1aeba7c` and current branch state before this document update.
- What was done? Changed files and evidence are listed in `What Was Done`.
- What failed or blocked? Large Plotly chunk warning, absent lint script, and Streamlit behavioral test gap are listed in `Open Issues`.
- What remains? Ordered `Next Steps` give the first commands and versioning policy.
- How do I verify? `Verification Commands` are included.
- What don't I know? No unresolved unknowns are currently known; future drift should be re-verified with the commands above.
