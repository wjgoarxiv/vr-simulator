# DESIGN.md — VR Simulator design language

## Direction

The product language is **VR 리밸런싱 보드**: a calm, data-dense board for checking official Value Rebalancing cycle state, order thresholds, and history.

## Naming rules

Use these terms in user-facing copy:

- `VR 리밸런싱 보드`
- `운용 설정`
- `사이클 상태`
- `공식 밴드`
- `체결 전 보유수 기준`
- `공식 LaTeX`

Avoid these terms in user-facing copy:

- `cockpit`
- `retrofuture`
- `HUD`
- `telemetry`
- `control deck`
- `SOTA`
- generic claims like `state-of-the-art`, `next-level`, `cutting-edge`

## Typography

- Korean/body/display: `IBM Plex Sans KR`, then `Noto Sans KR` fallback.
- Numbers and compact labels: `JetBrains Mono`.
- Avoid display fonts that distort `$`, `8`, or decimal figures in trading cards.

## Formula notation

Write the official VR formula as LaTeX on both surfaces:

$$
V_{2}=V_{1}+\frac{Pool}{G}+\frac{E-V_{1}}{2\sqrt{G}}+D_{2}
$$

Where:

- `V_1`: previous target value
- `V_2`: next target value
- `Pool`: cash before the next deposit/withdrawal
- `G`: gradient parameter
- `E`: ending evaluation value
- `D_2`: next deposit or withdrawal

## Motion

- Use at most ambient background motion and one state indicator motion.
- Always include `prefers-reduced-motion: reduce` on React and Streamlit styling.

## Visual restraint

- Dark surface, cyan/green/red as functional accents only.
- Cards are for interaction or state, not decoration.
- Labels should explain user action or current state; avoid ornamental English labels.
