# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **PRIORITY**: Focus is on **`app.py`** first. After `app.py` is fully finalized, other output formats (e.g., HTML) will follow.

## Project Overview

VR (Value Rebalancing) Simulator for leveraged ETF investment strategies. A Streamlit-based Python app (`app.py`) that simulates cycle-by-cycle VR trading with adaptive bands, trade-friendly adjustments, and V3.1.1 volatility-adaptive features.

**Live deployments:**
- Web (React V3.2): https://wjgoarxiv.github.io/vr-simulator/
- Streamlit (V3.1.1): https://vr-simulator.streamlit.app/

## Commands

```bash
# Run the Streamlit app locally
streamlit run app.py

# Install dependencies
pip install -r requirements.txt
# Dependencies: scipy, numpy, matplotlib, streamlit, pandas, pytz, plotly

# React app (secondary, in react_app/)
cd react_app && npm install && npm run dev
```

No test suite exists. Verify changes by running `streamlit run app.py` and testing cycle progression manually.

## Architecture

### Core Files (Python/Streamlit)

| File | Lines | Role |
|------|-------|------|
| `app.py` | ~1160 | **Main application** - Streamlit UI + VR calculation logic + charts (self-contained) |

### app.py Internal Structure

The file is a single monolithic Streamlit app organized in sequential sections:

1. **Constants & Parameters** (lines 12-22): VR formula constants, band parameters
2. **CSS Theme** (lines 26-208): Bloomberg-style dark theme via `inject_custom_css()`
3. **Core Calculation Functions** (lines 214-306):
   - `calculate_v_next()` - VR formula with V/E ratio cap (`MAX_V_E_RATIO`)
   - `calculate_bands()` / `calculate_adaptive_bands()` - LBand/HBand with V/E divergence compression and E-based anchoring
   - `calculate_simple_targets()` - Buy/sell target prices
4. **Buy/Sell Tables** (lines 309-400): `calculate_buy_table()` / `calculate_sell_table()`
5. **Market Status** (lines 402-450): US market hours in KST via pytz
6. **Charting** (lines 452-600): Plotly interactive charts + Matplotlib PNG export
7. **Streamlit UI** (lines 600-1160): Sidebar settings, cycle viewer, input form, result dashboard with tabs

### Key Domain Concepts

- **V (Target Value)**: System's target position size in dollars
- **E (Evaluation)**: Current shares x current price = actual portfolio value
- **G (Gradient)**: Stability coefficient in VR formula (recommended 10-20)
- **LBand / HBand**: Lower/upper thresholds triggering buy/sell signals
- **Pool**: Cash reserve for rebalancing
- **V/E Ratio Cap** (V3.1.1): V is capped at 115% of E to prevent deposit-driven divergence
- **E-based Anchoring** (V3.1.1): Bands anchor to min(V,E) instead of V, preventing unreachable sell targets
- **Adaptive Band**: Compresses band width when V/E divergence exceeds 5%
- **Cycle**: One iteration of the VR rebalancing process; user inputs end-of-cycle data, system computes next cycle's targets

### Session State Keys

Critical `st.session_state` keys: `history` (list of cycle dicts), `simulation_started`, `view_cycle_index`, `current_G`, `default_deposit`, `ticker_name`, `adaptive_band_enabled`

### CSV Schema

Cycle history records contain: `cycle_num`, `V_target`, `V_i`, `LBand`, `HBand`, `shares_end`, `pool_end_before_deposit`, `deposit_next`, `price_end`, `G`, `E_calc`, plus metadata fields for adaptive band state.

## Coding Conventions

- All UI text is in **Korean**; code comments mix Korean and English
- Currency values use USD with `$` prefix and `,.2f` formatting
- The app uses `st.rerun()` after state mutations
- Streamlit config in `.streamlit/config.toml` (dark theme, port 8501)

## Important Constants (app.py top-level)

| Constant | Value | Purpose |
|----------|-------|---------|
| `BASE_BAND_LOWER/UPPER` | 0.85 / 1.15 | Default +/-15% band |
| `MIN_BAND_LOWER/MAX_BAND_UPPER` | 0.92 / 1.08 | Max compression +/-8% |
| `VE_DIVERGENCE_THRESHOLD` | 0.05 | Compression starts at 5% V/E gap |
| `VE_MAX_DIVERGENCE` | 0.50 | Max divergence for full compression |
| `MAX_V_E_RATIO` | 1.15 | V/E ratio cap: V cannot exceed 115% of E |
