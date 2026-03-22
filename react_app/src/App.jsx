import { useState, useEffect, useCallback } from 'react';
import { VR_VERSION } from './constants';
import { calculateNextV, calculateBands, calculateAdaptiveBands, normalizeHistoryEntry } from './utils/vrCalculations';
import { BASE_BAND_LOWER, BASE_BAND_UPPER } from './constants';
import Sidebar from './components/Sidebar';
import InitialSetup from './components/InitialSetup';
import CycleViewer from './components/CycleViewer';
import CycleInput from './components/CycleInput';
import ResultsDashboard from './components/ResultsDashboard';

const STORAGE_KEY = 'vr-simulator-state-v3.1.2';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function App() {
  const saved = loadState();

  const [history, setHistory] = useState(saved?.history || []);
  const [currentG, setCurrentG] = useState(saved?.currentG ?? 10.0);
  const [defaultDeposit, setDefaultDeposit] = useState(saved?.defaultDeposit ?? 250.0);
  const [simulationStarted, setSimulationStarted] = useState(saved?.simulationStarted ?? false);
  const [viewCycleIndex, setViewCycleIndex] = useState(saved?.viewCycleIndex ?? 0);
  const [tickerName, setTickerName] = useState(saved?.tickerName ?? 'TQQQ');
  const [adaptiveBandEnabled, setAdaptiveBandEnabled] = useState(saved?.adaptiveBandEnabled ?? false);

  // Persist to localStorage
  useEffect(() => {
    const state = { history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, tickerName, adaptiveBandEnabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, tickerName, adaptiveBandEnabled]);

  // Start simulation (from InitialSetup)
  const handleStart = useCallback((config) => {
    if (config.fromCSV) {
      // CSV upload: history already loaded
      const lastEntry = config.history[config.history.length - 1];
      setHistory(config.history);
      setViewCycleIndex(config.history.length - 1);
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
    <div className="min-h-screen bg-vr-bg">
      {/* Header */}
      <header className="border-b border-vr-border bg-vr-bg2 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-vr-blue to-vr-purple bg-clip-text text-transparent">
              📊 VR 시뮬레이터
            </h1>
            <p className="text-sm text-vr-text2 mt-1">
              Value Rebalancing 투자 전략 시뮬레이터 V{VR_VERSION}
            </p>
          </div>
          {simulationStarted && (
            <button onClick={handleReset} className="btn-danger text-sm">
              시뮬레이션 초기화
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-80 flex-shrink-0">
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
          <main className="flex-1 min-w-0 space-y-6">
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
                        ← 이전 사이클
                      </button>
                      <span className="text-vr-text2 text-sm">
                        Cycle {displayCycleNum} / {history.length}
                      </span>
                      <button
                        onClick={goNext}
                        disabled={isLatestCycle}
                        className="btn-secondary text-sm"
                      >
                        다음 사이클 →
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
                  <ResultsDashboard
                    history={history}
                    adaptiveBandEnabled={adaptiveBandEnabled}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
