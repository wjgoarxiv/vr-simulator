# Modified Files for GitHub Upload

The following files have been modified during this session to align the React app with V3.0 logic and fix the HBand calculation bug:

## 1. Core Logic & State Management

- **`react_app/src/App.jsx`**
  - Added global state for **Momentum Filter** & **Risk Management**.
  - Enabled `Trade Friendly Band` by default.
  - Updated `resetSimulation` logic.

## 2. User Interface

- **`react_app/src/components/InitialSetup.jsx`**
  - Removed the confusing "Asset Preset" dropdown.
  - Added checkboxes for **Momentum Filter** and **Risk Management**.
  - Aligned UI options with `app.py`.

## 3. Calculation & Logic

- **`react_app/src/utils/vrV3Logic.js`**

  - **CRITICAL FIX**: Fixed "Trade Friendly" unit mismatch bug (Price vs Value comparison).
  - Added "Min Tradable Shares" (2 shares) logic to match Python backend accuracy.

- **`react_app/src/components/CycleInputNew.jsx`**
  - Updated calculation call to pass `sharesEnd` to `calculateTradeFriendlyBounds`.

---

**Note to User:**
It appears that the `react_app` directory is currently **untracked** in your git repository (based on `git status`). You may need to add the entire `react_app` folder if this is a new structure.
