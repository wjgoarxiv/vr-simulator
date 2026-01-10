import React, { useState, useEffect, createContext, useContext } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InitialSetup } from './components/InitialSetup';
import { CycleNavigation } from './components/CycleNavigation';
import { CycleDisplay } from './components/CycleDisplay';
import { CycleInput } from './components/CycleInputNew';
import { ResultsSummary } from './components/ResultsSummary';
import { LanguageProvider, ThemeProvider } from './contexts/AppContext';
import { normalizeHistoryEntry } from './utils/vrCalculations';

// Create context for global state management
const VRContext = createContext();

export function useVRContext() {
  const context = useContext(VRContext);
  if (!context) {
    throw new Error('useVRContext must be used within VRProvider');
  }
  return context;
}

function App() {
  // Global state
  const [history, setHistory] = useState([]);
  const [currentG, setCurrentG] = useState(10.0);
  const [defaultDeposit, setDefaultDeposit] = useState(250.0);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [viewCycleIndex, setViewCycleIndex] = useState(0);
  const [buyRatioForTable, setBuyRatioForTable] = useState(0.75);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState('TQQQ');
  
  // V3.0 State
  const [v3Enabled, setV3Enabled] = useState(true);
  const [tradeFriendlyEnabled, setTradeFriendlyEnabled] = useState(true);
  const [enableMomentumFilter, setEnableMomentumFilter] = useState(true);
  const [enableRiskManagement, setEnableRiskManagement] = useState(true);

  // Load saved state on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldReset = urlParams.get('reset') === 'true';
    const shouldResume = urlParams.get('resume') === 'true';

    if (shouldReset) {
      localStorage.removeItem('vr-simulator-state');
      localStorage.removeItem('vr-simulator-visited');
      localStorage.removeItem('vr-simulator-language');
      localStorage.removeItem('vr-simulator-theme');
      localStorage.removeItem('vr-simulator-theme-version');
      console.log('localStorage cleared due to reset parameter');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    const savedState = localStorage.getItem('vr-simulator-state');

    if (shouldResume && savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState.version === '3.2.0') {
          const normalizedHistory = (parsedState.history || []).map(normalizeHistoryEntry);
          setHistory(normalizedHistory);
          setCurrentG(parsedState.currentG || 10.0);
          setDefaultDeposit(parsedState.defaultDeposit || 250.0);
          setSimulationStarted(parsedState.simulationStarted || false);
          setViewCycleIndex(parsedState.viewCycleIndex || 0);
          setBuyRatioForTable(parsedState.buyRatioForTable || 0.75);
          setSidebarCollapsed(parsedState.sidebarCollapsed || true);
          setSelectedAsset(parsedState.selectedAsset || 'TQQQ');
          
          if (parsedState.v3Enabled !== undefined) setV3Enabled(parsedState.v3Enabled);
          if (parsedState.v3Enabled !== undefined) setV3Enabled(parsedState.v3Enabled);
          if (parsedState.tradeFriendlyEnabled !== undefined) setTradeFriendlyEnabled(parsedState.tradeFriendlyEnabled);
          if (parsedState.enableMomentumFilter !== undefined) setEnableMomentumFilter(parsedState.enableMomentumFilter);
          if (parsedState.enableRiskManagement !== undefined) setEnableRiskManagement(parsedState.enableRiskManagement);
        } else {
          localStorage.removeItem('vr-simulator-state');
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
        localStorage.removeItem('vr-simulator-state');
      }
    } else {
      localStorage.removeItem('vr-simulator-state');
      setHistory([]);
      setSimulationStarted(false);
      setViewCycleIndex(0);
      console.log('Starting with fresh state (cache ignored)');
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const stateToSave = {
      version: '3.2.0',
      history: history.map(normalizeHistoryEntry),
      currentG,
      defaultDeposit,
      simulationStarted,
      viewCycleIndex,
      buyRatioForTable,
      sidebarCollapsed,
      selectedAsset,
      v3Enabled,
      tradeFriendlyEnabled,
      enableMomentumFilter,
      enableRiskManagement
    };
    localStorage.setItem('vr-simulator-state', JSON.stringify(stateToSave));
  }, [history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, buyRatioForTable, sidebarCollapsed, selectedAsset, v3Enabled, tradeFriendlyEnabled, enableMomentumFilter, enableRiskManagement]);

  // Reset function to clear all state
  const resetSimulation = () => {
    setHistory([]);
    setCurrentG(10.0);
    setDefaultDeposit(250.0);
    setSimulationStarted(false);
    setViewCycleIndex(0);
    setBuyRatioForTable(0.75);
    setSelectedAsset('TQQQ');
    setV3Enabled(true);
    setTradeFriendlyEnabled(true);
    setEnableMomentumFilter(true);
    setEnableRiskManagement(true);
    // Clear localStorage
    localStorage.removeItem('vr-simulator-state');
    console.log('Simulation reset to initial state');
  };

  // Context value
  const contextValue = {
    history,
    setHistory,
    currentG,
    setCurrentG,
    defaultDeposit,
    setDefaultDeposit,
    simulationStarted,
    setSimulationStarted,
    viewCycleIndex,
    setViewCycleIndex,
    buyRatioForTable,
    setBuyRatioForTable,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedAsset,
    setSelectedAsset,
    resetSimulation,
    // V3.0
    v3Enabled,
    setV3Enabled,
    tradeFriendlyEnabled,
    setTradeFriendlyEnabled,
    enableMomentumFilter,
    setEnableMomentumFilter,
    enableRiskManagement,
    setEnableRiskManagement,
    priceHistory: history.map(h => h.price_end), // Derived full history for volatility
    // Missing derived values for ResultsSummary
    totalCycles: history.length,
    initialMoney: history.length > 0 ? (history[0].V_target || 0) : 0, 
    // Note: initialMoney logic might need refinement if it tracks actual cash + stock. 
    // For now, map to V_target of first cycle or similar proxy if simpler.
    // Better: Derived from history.
    currentMoney: history.length > 0 ? (history[history.length-1].pool_end_before_deposit || 0) : 0,
    currentShares: history.length > 0 ? (history[history.length-1].shares_end || 0) : 0,
    currentSharesValue: history.length > 0 ? ((history[history.length-1].shares_end || 0) * (history[history.length-1].price_end || 0)) : 0,
    currentAverageCost: 0, // Not explicitly tracked in simple history yet, fallback to 0 or implement calc
    setCurrentMoney: () => {}, // No-op setters/Legacy compatibility
    setCurrentShares: () => {},
    setCurrentAverageCost: () => {},
    setInitialMoney: () => {},
    setTotalCycles: () => {},
    setCurrentSharesValue: () => {},
  };

  // Navigation functions
  const goToPrevious = () => {
    if (viewCycleIndex > 0) {
      setViewCycleIndex(viewCycleIndex - 1);
    }
  };

  const goToNext = () => {
    if (viewCycleIndex < history.length - 1) {
      setViewCycleIndex(viewCycleIndex + 1);
    }
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <VRContext.Provider value={contextValue}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <Header />
            
            <div className="flex">
              {/* Sidebar */}
              <Sidebar />
              
              {/* Main Content */}
              <main className={`flex-1 p-4 sm:p-6 transition-all duration-300 ${
                sidebarCollapsed ? 'md:ml-4 ml-0' : 'md:ml-80 ml-0'
              }`}>
                <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Initial Setup */}
              {!simulationStarted && (
                <div className="animate-fade-in">
                  <InitialSetup />
                </div>
              )}
              
              {/* Simulation Interface */}
              {simulationStarted && history.length > 0 && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Cycle Navigation */}
                  <CycleNavigation 
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                    canGoPrevious={viewCycleIndex > 0}
                    canGoNext={viewCycleIndex < history.length - 1}
                  />
                  
                  {/* Current Cycle Display */}
                  <CycleDisplay />
                  
                  {/* Cycle Input Form (only on latest cycle) */}
                  {viewCycleIndex === history.length - 1 && (
                    <CycleInput />
                  )}
                  
                  {/* Results Summary */}
                  <ResultsSummary />
                  
                </div>
              )}
              
              </div>
            </main>
          </div>
        </div>
        </VRContext.Provider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
