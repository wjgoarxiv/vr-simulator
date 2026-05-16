import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { BASE_BAND_LOWER, BASE_BAND_UPPER, VR_VERSION } from './constants';
import { calculateAdaptiveBands, normalizeHistoryEntry } from './utils/vrCalculations';
import Sidebar from './components/Sidebar';
import InitialSetup from './components/InitialSetup';
import CycleViewer from './components/CycleViewer';
import CycleInput from './components/CycleInput';

const ResultsDashboard = lazy(() => import('./components/ResultsDashboard'));

const STORAGE_KEY = 'vr-simulator-state-v3.1.2';

const DEFAULT_STATE = {
  history: [],
  currentG: 10.0,
  defaultDeposit: 250.0,
  simulationStarted: false,
  viewCycleIndex: 0,
  tickerName: 'TQQQ',
  adaptiveBandEnabled: false,
};

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeSavedState(candidate) {
  if (!candidate || typeof candidate !== 'object') return DEFAULT_STATE;

  const history = Array.isArray(candidate.history)
    ? candidate.history.map((entry) => normalizeHistoryEntry(entry)).filter(Boolean)
    : [];
  const maxIndex = Math.max(history.length - 1, 0);
  const requestedIndex = Number.isInteger(candidate.viewCycleIndex) ? candidate.viewCycleIndex : 0;

  return {
    history,
    currentG: Math.max(1, toFiniteNumber(candidate.currentG, DEFAULT_STATE.currentG)),
    defaultDeposit: Math.max(0, toFiniteNumber(candidate.defaultDeposit, DEFAULT_STATE.defaultDeposit)),
    simulationStarted: Boolean(candidate.simulationStarted && history.length > 0),
    viewCycleIndex: Math.min(Math.max(requestedIndex, 0), maxIndex),
    tickerName: typeof candidate.tickerName === 'string' && candidate.tickerName.trim()
      ? candidate.tickerName.trim()
      : DEFAULT_STATE.tickerName,
    adaptiveBandEnabled: Boolean(candidate.adaptiveBandEnabled),
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? sanitizeSavedState(JSON.parse(saved)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export default function App() {
  const [saved] = useState(loadState);

  const [history, setHistory] = useState(saved.history);
  const [currentG, setCurrentG] = useState(saved.currentG);
  const [defaultDeposit, setDefaultDeposit] = useState(saved.defaultDeposit);
  const [simulationStarted, setSimulationStarted] = useState(saved.simulationStarted);
  const [viewCycleIndex, setViewCycleIndex] = useState(saved.viewCycleIndex);
  const [tickerName, setTickerName] = useState(saved.tickerName);
  const [adaptiveBandEnabled, setAdaptiveBandEnabled] = useState(saved.adaptiveBandEnabled);

  // Persist to localStorage
  useEffect(() => {
    const state = { history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, tickerName, adaptiveBandEnabled };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Keep the simulator usable if browser storage is unavailable or full.
    }
  }, [history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, tickerName, adaptiveBandEnabled]);

  useEffect(() => {
    if (!history.length) {
      setViewCycleIndex(0);
      return;
    }
    setViewCycleIndex((index) => Math.min(Math.max(index, 0), history.length - 1));
  }, [history.length]);

  // Start simulation (from InitialSetup)
  const handleStart = useCallback((config) => {
    if (config.fromCSV) {
      // CSV upload: history already loaded
      const normalizedHistory = Array.isArray(config.history)
        ? config.history.map((entry) => normalizeHistoryEntry(entry)).filter(Boolean)
        : [];
      if (!normalizedHistory.length) return;
      const lastEntry = normalizedHistory[normalizedHistory.length - 1];
      setHistory(normalizedHistory);
      setViewCycleIndex(normalizedHistory.length - 1);
      setCurrentG(lastEntry?.G ?? 10.0);
      setDefaultDeposit(lastEntry?.deposit_next ?? 250.0);
      setSimulationStarted(true);
      return;
    }

    // Manual start
    const { shares, price, pool } = config;
    let V0;
    if (shares === 0 && pool > 0) {
      V0 = pool;
    } else {
      V0 = shares * price;
    }

    const E0 = shares * price;
    let L0, H0, adaptiveResult;

    if (adaptiveBandEnabled && E0 > 0) {
      adaptiveResult = calculateAdaptiveBands(V0, E0);
      L0 = adaptiveResult.LBand;
      H0 = adaptiveResult.HBand;
    } else {
      L0 = BASE_BAND_LOWER * V0;
      H0 = BASE_BAND_UPPER * V0;
      adaptiveResult = {
        compressionFactor: 1.0,
        divergenceRatio: 0.0,
        divergenceDirection: 'neutral',
        bandLowerRatio: BASE_BAND_LOWER,
        bandUpperRatio: BASE_BAND_UPPER,
      };
    }

    const initialState = normalizeHistoryEntry({
      cycle_num: 0,
      V_target: V0,
      V_i: V0,
      LBand: L0,
      HBand: H0,
      shares_end: shares,
      pool_end_before_deposit: pool,
      deposit_next: defaultDeposit,
      price_end: price,
      G: currentG,
      E_calc: E0,
      adaptive_band_enabled: adaptiveBandEnabled,
      ve_divergence_ratio: adaptiveResult.divergenceRatio ?? 0,
      ve_divergence_direction: adaptiveResult.divergenceDirection ?? 'neutral',
      band_compression_factor: adaptiveResult.compressionFactor ?? 1.0,
      band_lower_ratio: adaptiveResult.bandLowerRatio ?? BASE_BAND_LOWER,
      band_upper_ratio: adaptiveResult.bandUpperRatio ?? BASE_BAND_UPPER,
    });

    setHistory([initialState]);
    setViewCycleIndex(0);
    setSimulationStarted(true);
  }, [adaptiveBandEnabled, currentG, defaultDeposit]);

  // Add new cycle
  const handleCycleSubmit = useCallback((newState) => {
    setHistory((prev) => [...prev, newState]);
    setViewCycleIndex((prev) => prev + 1);
  }, []);

  // Navigation
  const goPrevious = () => setViewCycleIndex((i) => Math.max(0, i - 1));
  const goNext = () => setViewCycleIndex((i) => Math.min(history.length - 1, i + 1));

  // Reset
  const handleReset = () => {
    setHistory([]);
    setSimulationStarted(false);
    setViewCycleIndex(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const activeState = history[viewCycleIndex] || null;
  const displayCycleNum = activeState ? activeState.cycle_num + 1 : 0;
  const isLatestCycle = viewCycleIndex === history.length - 1;

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border-default px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-mono text-h3 uppercase tracking-wider text-accent-cyan">
              VR SIMULATOR
            </h1>
            <span className="font-mono text-xs text-tx-muted">v{VR_VERSION}</span>
          </div>
          {simulationStarted && (
            <button onClick={handleReset} className="btn-danger">
              시뮬레이션 초기화
            </button>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar */}
          <aside className="lg:w-[260px] flex-shrink-0">
            <Sidebar
              simulationStarted={simulationStarted}
              tickerName={tickerName}
              setTickerName={setTickerName}
              currentG={currentG}
              setCurrentG={setCurrentG}
              defaultDeposit={defaultDeposit}
              setDefaultDeposit={setDefaultDeposit}
              adaptiveBandEnabled={adaptiveBandEnabled}
              setAdaptiveBandEnabled={setAdaptiveBandEnabled}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-4">
            {!simulationStarted ? (
              /* Section 1: Initial Setup */
              <InitialSetup onStart={handleStart} tickerName={tickerName} />
            ) : (
              <>
                {/* Section 2: Cycle Viewer */}
                {activeState && (
                  <div className="space-y-4">
                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={goPrevious}
                        disabled={viewCycleIndex === 0}
                        className="btn-secondary text-sm"
                      >
                        &larr; 이전 사이클
                      </button>
                      <span className="font-mono text-xs uppercase tracking-wider text-tx-muted">
                        CYCLE {displayCycleNum} / {history.length}
                      </span>
                      <button
                        onClick={goNext}
                        disabled={isLatestCycle}
                        className="btn-secondary text-sm"
                      >
                        다음 사이클 &rarr;
                      </button>
                    </div>

                    <CycleViewer
                      activeState={activeState}
                      displayCycleNum={displayCycleNum}
                      tickerName={tickerName}
                      adaptiveBandEnabled={adaptiveBandEnabled}
                    />
                  </div>
                )}

                {/* Cycle Input (only on latest cycle) */}
                {isLatestCycle && activeState && (
                  <CycleInput
                    activeState={activeState}
                    inputCycleNum={activeState.cycle_num + 1}
                    currentG={currentG}
                    defaultDeposit={defaultDeposit}
                    adaptiveBandEnabled={adaptiveBandEnabled}
                    onSubmit={handleCycleSubmit}
                  />
                )}

                {/* Section 3: Results Dashboard */}
                {history.length > 0 && (
                  <Suspense
                    fallback={
                      <div className="surface-panel text-center text-tx-muted font-mono text-sm py-8">
                        결과 대시보드 로딩 중...
                      </div>
                    }
                  >
                    <ResultsDashboard
                      history={history}
                      adaptiveBandEnabled={adaptiveBandEnabled}
                    />
                  </Suspense>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
