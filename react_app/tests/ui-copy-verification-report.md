# UI Copy Verification Report — V3.2.1 Official VR Copy

Scope: Streamlit `app.py`, React `react_app/src/components/CycleViewer.jsx`, and built React assets after `npm run build`.

## Required user-facing copy

## Required final copy contract
- Title: `목표를 안전하게 낮췄어요`
- Why: `처음 계산한 목표가 지금 평가금보다 높아서, 이번 사이클에 적용할 목표를 낮췄어요.`
- Labels: `처음 계산된 목표`, `이번에 적용할 목표`
- User impact: `그래서 지금 당장 무리해서 사라는 신호가 줄어들어요.`

## Forbidden user-facing patterns

- Formula/internal wording: `V/E CAP ACTIVE`, `V/E 상한 적용됨`, `원래 V =`, `제한 V =`, `적립금 기여분`, `흡수`
- Superseded notice wording: `목표 V 자동 조정`, `계산된 목표가 현재 평가금보다 높아`, `안전 기준에 맞춰 낮췄습니다`, `과도한 매수 신호`, `기준: 현재 평가금`, `의미: 다음 사이클`

## Verification evidence

- `cd react_app && npm test` → pass, 21/21 tests after the final migration/withdrawal guards.
- `cd react_app && npm run qa:matrix` → pass, 6/6 UltraQA tests.
- `cd react_app && npm run e2e` → pass, 3 cycles with finite bands, official uncapped V, and buy/sell tables.
- `cd react_app && npm run build` → pass; Vite built production assets. Pre-existing Plotly chunk-size warning remains.
- `cd react_app && npm run smoke` → pass; 4 built assets referenced from `react_app/dist/index.html`. Pre-existing Plotly chunk-size warning remains.
- `python3 -m py_compile app.py generate_cover.py && python3 tests/streamlit_formula_static_test.py` → pass.
- Forbidden-copy scan over `app.py`, `react_app/src`, and `react_app/dist` → pass.

Re-run the command block above after any edit that changes copy, migration, or withdrawal validation.

## Notes

The test scopes the forbidden-copy assertion to the actual target safety notice blocks, so internal comments or non-user-facing implementation terms do not cause false positives.
