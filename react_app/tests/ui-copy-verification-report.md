# UI Copy Verification Report — Target Safety Notice

Scope: Streamlit `app.py`, React `react_app/src/components/CycleViewer.jsx`, and built React assets after `npm run build`.

## Required user-facing copy

- Title: `목표를 안전하게 낮췄어요`
- Why: `현재 평가금보다 목표가 너무 높아지지 않도록 조정했어요.`
- Labels: `처음 계산된 목표`, `이번에 적용할 목표`
- Impact: `다음 사이클에 무리한 매수 주문이 나오지 않아요.`
- Action: `따로 조치할 필요는 없어요.`

## Forbidden user-facing patterns

- Formula/internal wording: `V/E CAP ACTIVE`, `V/E 상한 적용됨`, `원래 V =`, `제한 V =`, `적립금 기여분`, `흡수`
- Superseded notice wording: `목표 V 자동 조정`, `계산된 목표가 현재 평가금보다 높아`, `안전 기준에 맞춰 낮췄습니다`, `과도한 매수 신호`, `기준: 현재 평가금`, `의미: 다음 사이클`

## Verification evidence

- `cd react_app && npm test` → pass, 17/17 tests.
- `cd react_app && npm run qa:matrix` → pass, 6/6 UltraQA tests.
- `cd react_app && npm run e2e` → pass, 3 adaptive cycles with finite bands, cap metadata, buy/sell tables.
- `cd react_app && npm run build` → pass; Vite built production assets. Pre-existing Plotly chunk-size warning remains.
- `cd react_app && npm run smoke` → pass; 4 built assets referenced from `react_app/dist/index.html`. Pre-existing Plotly chunk-size warning remains.
- `python3 -m py_compile app.py generate_cover.py` → pass.
- Forbidden-copy scan over `app.py`, `react_app/src`, and `react_app/dist` → pass.

## Notes

The test now scopes the forbidden-copy assertion to the actual target safety notice blocks, so internal comments or non-user-facing implementation terms do not cause false positives.
