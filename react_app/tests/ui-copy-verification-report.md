# UI Copy Verification Report — Task 3

## Compact RALPLAN mini-plan
- **Result target:** lock the target-V safety notice to plain, Toss-like Korean across React and Streamlit.
- **Scope:** verification lane only; own `react_app/tests/ui-copy.test.mjs` and this report, without changing calculation behavior or adding dependencies.
- **Regression contract:** forbid formula-heavy/internal wording and require the same one-read copy on both app surfaces.
- **Validation path:** run `npm test`, `npm run qa:matrix`, `npm run e2e`, `npm run build`, `npm run smoke`, `python3 -m py_compile app.py generate_cover.py`, and a forbidden-copy scan over `app.py`, `react_app/src`, and `react_app/dist`.
- **Stop condition:** report pass/fail evidence and any integration blocker for the implementation lane.

## Required final copy contract
- Title: `목표를 안전하게 낮췄어요`
- Why: `현재 평가금보다 목표가 너무 높아지지 않도록 조정했어요.`
- Labels: `처음 계산된 목표`, `이번에 적용할 목표`
- User impact: `다음 사이클에 무리한 매수 주문이 나오지 않아요.`

## Forbidden user-facing copy
- Internal/formula wording: `V/E CAP ACTIVE`, `V/E 상한 적용됨`, `원래 V =`, `제한 V =`, `적립금 기여분`, `흡수`
- Superseded copy: `목표 V 자동 조정`, `계산된 목표가 현재 평가금보다 높아`, `안전 기준에 맞춰 낮췄습니다`, `과도한 매수 신호`, `안전장치`, `기준: 현재 평가금`, `의미: 다음 사이클`

## Verification evidence
- Pending: commands will be recorded after execution in this worker lane.
