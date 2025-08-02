import React, { useState, useEffect, createContext, useContext } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InitialSetup } from './components/InitialSetup';
import { CycleNavigation } from './components/CycleNavigation';
import { CycleDisplay } from './components/CycleDisplay';
import { CycleInput } from './components/CycleInputNew';
import { ResultsSummary } from './components/ResultsSummary';
import { LanguageProvider, ThemeProvider } from './contexts/AppContext';

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
  const [selectedAsset, setSelectedAsset] = useState('TQQQ'); // Default to TQQQ for backward compatibility

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('vr-simulator-state');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Only load if version matches, otherwise reset
        if (parsedState.version === '3.0.0') {
          setHistory(parsedState.history || []);
          setCurrentG(parsedState.currentG || 10.0);
          setDefaultDeposit(parsedState.defaultDeposit || 250.0); // Keep 250 as default
          setSimulationStarted(parsedState.simulationStarted || false);
          setViewCycleIndex(parsedState.viewCycleIndex || 0);
          setBuyRatioForTable(parsedState.buyRatioForTable || 0.75);
          setSidebarCollapsed(parsedState.sidebarCollapsed || true); // Default to collapsed
          setSelectedAsset(parsedState.selectedAsset || 'TQQQ');
        } else {
          // Clear old version data
          localStorage.removeItem('vr-simulator-state');
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
        localStorage.removeItem('vr-simulator-state'); // Clear corrupted data
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const stateToSave = {
      version: '3.0.0', // Add version to prevent compatibility issues
      history,
      currentG,
      defaultDeposit,
      simulationStarted,
      viewCycleIndex,
      buyRatioForTable,
      sidebarCollapsed,
      selectedAsset
    };
    localStorage.setItem('vr-simulator-state', JSON.stringify(stateToSave));
  }, [history, currentG, defaultDeposit, simulationStarted, viewCycleIndex, buyRatioForTable, sidebarCollapsed, selectedAsset]);

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
    setSelectedAsset
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
              <main className={`flex-1 p-6 transition-all duration-300 ${
                sidebarCollapsed ? 'ml-4' : 'ml-80'
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
}export default App;
