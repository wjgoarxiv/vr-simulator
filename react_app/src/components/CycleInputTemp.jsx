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
    setIsCalculating(true);
    
    // Simulate brief calculation delay for UX
    setTimeout(() => {
      try {
        // Calculate next cycle values
        const E_calc = sharesEnd * priceEnd;
        const poolEndBeforeDeposit = poolEnd;
        const V_i_calc = activeState.V_target;

        const V_next = calculateNextV(
          V_i_calc,
          poolEndBeforeDeposit,
          E_calc,
          gInput,
          depositNext
        );

        const { LBand: L_next, HBand: H_next } = calculateBands(V_next);

        const newState = {
          cycle_num: inputCycleNum,
          price_end: priceEnd,
          shares_end: sharesEnd,
          pool_end_before_deposit: poolEnd,
          deposit: depositNext,
          g: gInput,
          V_target: V_next,
          E_end: E_calc,
          L_band: L_next,
          H_band: H_next,
          sellTargets: [],
          buyTargets: [],
          sellTable: [],
          buyTable: []
        };

        // Update history and move to view new cycle
        const newHistory = [...history, newState];
        setHistory(newHistory);
        setViewCycleIndex(newHistory.length - 1);
        setCurrentG(gInput);
        setDefaultDeposit(depositNext);

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
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.L_band.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">H Band:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.H_band.toFixed(2)}</div>
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
              onChange={(e) => setPriceEnd(parseFloat(e.target.value) || 10.0)}
              min="0.01"
              step="0.1"
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
              onChange={(e) => setSharesEnd(parseFloat(e.target.value) || 10.0)}
              min="1.0"
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
              onChange={(e) => setPoolEnd(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              step="0.1"
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
              onChange={(e) => setDepositNext(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cash to add for next cycle</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gradient Value (G) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={gInput}
              onChange={(e) => setGInput(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gradient value for VR formula stability coefficient (10-20 recommended)
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
  const { history, viewCycleIndex, buyRatioForTable } = useVRContext();
  const [showDetailedTables, setShowDetailedTables] = useState(false);
  const [showAllBuyRows, setShowAllBuyRows] = useState(false);
  const [showAllSellRows, setShowAllSellRows] = useState(false);

  if (!history || history.length === 0 || viewCycleIndex >= history.length) {
    return (
      <div className="alert-danger">
        Record index error occurred. Please reset the simulation.
      </div>
    );
  }

  const activeState = history[viewCycleIndex];
  const displayCycleNum = activeState.cycle_num + 1;

  // Calculate display values
  const V_i_display = activeState.V_target;
  const sharesStartDisplay = activeState.shares_end;
  const poolStartDisplay = activeState.pool_end_before_deposit + activeState.deposit_next;
  const LBandDisplay = activeState.LBand;
  const HBandDisplay = activeState.HBand;
  const GDisplay = activeState.G;
  const lastPriceDisplay = activeState.price_end;

  // Calculate buy/sell targets
  const { buyTargetPrice, sellTargetPrice } = calculateSimpleTargets(
    sharesStartDisplay,
    LBandDisplay,
    HBandDisplay
  );

  // Calculate detailed tables
  const { buyTable, sellTable } = calculateDetailedTables(
    LBandDisplay,
    HBandDisplay,
    sharesStartDisplay,
    poolStartDisplay,
    buyRatioForTable
  );

  // Check for Monday morning buy suggestion
  const priceDiffRatio = lastPriceDisplay > 0 ? 
    (lastPriceDisplay - buyTargetPrice) / lastPriceDisplay : 0;
  const shouldSuggestMondayBuy = buyTargetPrice > 0 && 
    priceDiffRatio > 0.20 && 
    displayCycleNum < 5;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Cycle Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">2. CYCLE {displayCycleNum} Review</h2>
        </div>
        
        <div className="alert-info">
          Currently viewing <strong>Cycle {activeState.cycle_num}</strong> end-of-period record. 
          (Starting information for Cycle {displayCycleNum})
        </div>
      </div>

      {/* Starting State and Targets */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📊 Cycle {displayCycleNum} Starting State & Target (Expected)
        </h3>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Starting Shares</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sharesStartDisplay.toFixed(2)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">shares</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Starting Pool</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${poolStartDisplay.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">USD</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target V</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${V_i_display.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">USD</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Applied G Value</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{GDisplay.toFixed(1)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">gradient</div>
          </div>
        </div>

        {/* Buy/Sell Targets */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">Buy/Sell Target Reference:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">LBand</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">${LBandDisplay.toLocaleString()}</div>
            </div>
            
            <div className="metric-card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">HBand</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">${HBandDisplay.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">Buy Target (+1 share)</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-400">${buyTargetPrice.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              {sellTargetPrice > 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-red-800 dark:text-red-300">Sell Target (-1 share)</div>
                      <div className="text-lg font-bold text-red-700 dark:text-red-400">${sellTargetPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      ⚠️ Sell not available (insufficient holdings or 1 share)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monday Morning Buy Suggestion */}
        {shouldSuggestMondayBuy && (
          <div className="mt-4 alert-warning">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium">Monday Morning Buy Consideration</div>
                <div className="text-sm mt-1">
                  ⚠️ Buy target price (${buyTargetPrice.toFixed(2)}) significantly differs from previous price (${lastPriceDisplay.toFixed(2)}). 
                  Consider market open purchase for the next trading day.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Buy/Sell Tables */}
      <div className="card">
        <button
          onClick={() => setShowDetailedTables(!showDetailedTables)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
        >
          <span className="font-medium text-gray-700 dark:text-gray-300">View Detailed Buy/Sell Tables</span>
          {showDetailedTables ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        
        {showDetailedTables && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            
            {/* Detailed Buy Table */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Detailed Buy Table</h4>
              {buyTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Target Shares
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Buy Price ($)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total Pool ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {(showAllBuyRows ? buyTable : buyTable.slice(0, 10)).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {row.targetShares}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.buyPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.totalPool.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {buyTable.length > 10 && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {showAllBuyRows 
                          ? `Showing all ${buyTable.length} entries` 
                          : `Showing first 10 of ${buyTable.length} entries`
                        }
                      </div>
                      <button
                        onClick={() => setShowAllBuyRows(!showAllBuyRows)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors duration-200"
                      >
                        {showAllBuyRows ? 'Show First 10' : 'Show All'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert-info">
                  No calculated buy targets available
                </div>
              )}
            </div>

            {/* Detailed Sell Table */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Detailed Sell Table</h4>
              {sellTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Target Shares
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Sell Price ($)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total Pool ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {(showAllSellRows ? sellTable : sellTable.slice(0, 10)).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {row.targetShares}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.sellPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.totalPool.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sellTable.length > 10 && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {showAllSellRows 
                          ? `Showing all ${sellTable.length} entries` 
                          : `Showing first 10 of ${sellTable.length} entries`
                        }
                      </div>
                      <button
                        onClick={() => setShowAllSellRows(!showAllSellRows)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors duration-200"
                      >
                        {showAllSellRows ? 'Show First 10' : 'Show All'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert-info">
                  No calculated sell targets available
                </div>
              )}
            </div>

            {/* Detailed Sell Table */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Detailed Sell Table</h4>
              {sellTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Target Shares
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Sell Price ($)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total Pool ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {(showAllSellRows ? sellTable : sellTable.slice(0, 10)).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {row.targetShares}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.sellPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ${row.totalPool.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sellTable.length > 10 && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {showAllSellRows 
                          ? `Showing all ${sellTable.length} entries` 
                          : `Showing first 10 of ${sellTable.length} entries`
                        }
                      </div>
                      <button
                        onClick={() => setShowAllSellRows(!showAllSellRows)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors duration-200"
                      >
                        {showAllSellRows ? 'Show First 10' : 'Show All'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert-info">
                  No calculated sell targets available
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
      
    </div>
  );
}
