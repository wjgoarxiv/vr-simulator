# AGENTS.md — VR Simulator local instructions

These instructions apply to this project root and all child paths.

## First action in this repo
- Before inspecting or editing anything else, read `./HANDOFF.md` first.
- Treat `HANDOFF.md` as the continuation entry point, then verify its claims with `git status --short --branch` and the commands listed inside it.

## Dual app surfaces
- This repo has two user-facing apps:
  - Streamlit app: `app.py`
  - React/Vite app: `react_app/`
- Keep formula constants and user-visible simulator behavior aligned between both surfaces unless the user explicitly asks for divergence.

## Versioning rule for future improvements
- When making functional improvements, bug fixes that change behavior, or QA/reliability enhancements, consider a patch version bump before editing.
- If bumping version, update all synchronized version surfaces together:
  - `app.py` `VR_VERSION`
  - `react_app/src/constants.js` `VR_VERSION`
  - `react_app/package.json` `version`
  - `react_app/package-lock.json` root/package version entries
  - visible docs such as `README.md` or `HANDOFF.md` if they mention the current version
- Do not bump version for purely local handoff/process notes unless the user asks.

## Verification baseline
- React changes: run `cd react_app && npm test` and `cd react_app && npm run build`.
- QA-sensitive React changes: also run `npm run qa:matrix`, `npm run e2e`, and `npm run smoke` from `react_app/`.
- Streamlit/Python changes: run `python3 -m py_compile app.py generate_cover.py` from the repo root.

## Deployment / external side effects
- Do not deploy, publish, or push unless the user asks.
- GitHub Pages deploy remains manual from `react_app/`.
