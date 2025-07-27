import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useVRContext } from '../App';
import { calculateNextV, calculateBands } from '../utils/vrCalculations';

export function CycleInput() {
  const {
    history,
    setHistory,
    viewCycleIndex,
    setViewCycleIndex,
    currentG,
    setCurrentG,
    defaultDeposit,
    setDefaultDeposit
  } = useVRContext();

  const activeState = history[viewCycleIndex];
  const inputCycleNum = activeState.cycle_num + 1;

  // Form state
  const [priceEnd, setPriceEnd] = useState(activeState.price_end);
  const [sharesEnd, setSharesEnd] = useState(activeState.shares_end);
  const [poolEnd, setPoolEnd] = useState(activeState.pool_end_before_deposit);
  const [depositNext, setDepositNext] = useState(defaultDeposit);
  const [gInput, setGInput] = useState(currentG);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateNext = () => {
    console.log('Calculate Next button clicked');
    console.log('Input values:', { priceEnd, sharesEnd, poolEnd, depositNext, gInput });
    console.log('Active state:', activeState);
    
    setIsCalculating(true);
    
    // Simulate brief calculation delay for UX
    setTimeout(() => {
      try {
        // Calculate next cycle values
        const E_calc = sharesEnd * priceEnd;
        const poolEndBeforeDeposit = poolEnd;
        const V_i_calc = activeState.V_target;
        
        console.log('Calculated values:', { E_calc, poolEndBeforeDeposit, V_i_calc });

        const V_next = calculateNextV(
          V_i_calc,
          poolEndBeforeDeposit,
          E_calc,
          gInput,
          depositNext
        );
        
        console.log('V_next calculated:', V_next);

        const { LBand: L_next, HBand: H_next } = calculateBands(V_next);
        
        console.log('Bands calculated:', { L_next, H_next });

        const newState = {
          cycle_num: inputCycleNum,
          price_end: priceEnd,
          shares_end: sharesEnd,
          pool_end_before_deposit: poolEnd,
          deposit_next: depositNext,
          G: gInput,
          V_target: V_next,
          E_end: E_calc,
          LBand: L_next,
          HBand: H_next,
          sellTargets: [],
          buyTargets: [],
          sellTable: [],
          buyTable: []
        };
        
        console.log('New state created:', newState);

        // Update history and move to view new cycle
        const newHistory = [...history, newState];
        console.log('New history:', newHistory);
        
        setHistory(newHistory);
        setViewCycleIndex(newHistory.length - 1);
        setCurrentG(gInput);
        setDefaultDeposit(depositNext);
        
        console.log('State updated successfully');

      } catch (error) {
        console.error('Calculation error:', error);
        alert('Error calculating next cycle. Please check your inputs.');
      } finally {
        setIsCalculating(false);
      }
    }, 500);
  };

  const isValid = priceEnd > 0 && sharesEnd >= 0 && poolEnd >= 0 && depositNext >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Cycle {inputCycleNum} Input
        </h2>
      </div>

      <div className="space-y-6">
        {/* Current Values Display */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Cycle Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Cycle:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">{activeState.cycle_num}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">V Target:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.V_target.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">L Band:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.LBand?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">H Band:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.HBand?.toFixed(2) || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Price ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={priceEnd}
              onChange={(e) => setPriceEnd(parseFloat(e.target.value) || 0)}
              min="0.01"
              step="0.01"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Final stock price at cycle end</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Shares <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={sharesEnd}
              onChange={(e) => setSharesEnd(parseFloat(e.target.value) || 0)}
              min="0.0"
              step="1.0"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Final number of shares held</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Pool ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={poolEnd}
              onChange={(e) => setPoolEnd(parseFloat(e.target.value) || 0)}
              min="0.0"
              step="0.01"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cash pool before next deposit</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Next Deposit ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={depositNext}
              onChange={(e) => setDepositNext(parseFloat(e.target.value) || 0)}
              min="0.0"
              step="0.01"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cash to add for next cycle</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Growth Factor (g) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={gInput}
              onChange={(e) => setGInput(parseFloat(e.target.value) || 0)}
              min="0.0"
              max="1.0"
              step="0.01"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Growth factor for V calculation (0.0 to 1.0, typically 0.05)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleCalculateNext}
            disabled={!isValid || isCalculating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Calculate Next Cycle
              </>
            )}
          </button>

          {!isValid && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <span>Please fill in all required fields with valid values</span>
            </div>
          )}
        </div>

        {/* Preview Calculation */}
        {isValid && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Preview Calculation
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <div>Equity Value (E): ${(sharesEnd * priceEnd).toLocaleString()}</div>
              <div>Total Pool + Deposit: ${(poolEnd + depositNext).toLocaleString()}</div>
              <div>Growth Factor: {(gInput * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
