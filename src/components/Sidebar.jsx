import React, { useState, useEffect } from 'react';
import { Settings, BarChart3, HelpCircle, Clock, Globe, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useVRContext } from '../App';
import { useLanguage } from '../contexts/AppContext';
import { getMarketStatus } from '../utils/marketStatus';
import { getAssetInfo } from '../config/assets';

export function Sidebar() {
  const {
    currentG,
    setCurrentG,
    defaultDeposit,
    setDefaultDeposit,
    buyRatioForTable,
    setBuyRatioForTable,
    simulationStarted,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedAsset
  } = useVRContext();

  const { t } = useLanguage();

  const [marketStatus, setMarketStatus] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(getMarketStatus());
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={`fixed left-0 top-0 h-full transition-all duration-300 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 pt-20 overflow-y-auto ${
      sidebarCollapsed ? 'w-4' : 'w-80'
    }`}>
      
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed left-1 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hover:shadow-lg transition-all duration-200 z-20"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {sidebarCollapsed ? (
        /* Collapsed Sidebar - Empty */
        <div className="p-3">
          {/* Empty collapsed sidebar */}
        </div>
      ) : (
        <div className="p-6 space-y-8">
          
          {/* Selected Asset Information */}
          {selectedAsset && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📈 Selected Asset</h2>
              </div>
              
              {(() => {
                const assetInfo = getAssetInfo(selectedAsset);
                return assetInfo ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: assetInfo.color }}
                      >
                        {selectedAsset}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{assetInfo.name}</div>
                        <div className="text-xs text-gray-500">{assetInfo.category}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {assetInfo.description}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Leverage:</span>
                        <span className="ml-1 font-medium">{assetInfo.leverage}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">ER:</span>
                        <span className="ml-1 font-medium">{assetInfo.expense_ratio}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Volatility:</span>
                        <span className="ml-1 font-medium text-red-600">{assetInfo.volatility}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Volume:</span>
                        <span className="ml-1 font-medium">{assetInfo.avg_volume}</span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          
          {/* Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">⚙️ {t('simulationSettings')}</h2>
            </div>
            
            {!simulationStarted ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('initialGValue')}
                  </label>
                  <input
                    type="number"
                    value={currentG}
                    onChange={(e) => setCurrentG(parseFloat(e.target.value) || 10.0)}
                    min="1.0"
                    step="0.1"
                    className="input-field"
                    placeholder="Recommended: 10-20"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">VR formula stability coefficient (10-20 recommended)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('defaultDeposit')}
                  </label>
                  <input
                    type="number"
                    value={defaultDeposit}
                    onChange={(e) => setDefaultDeposit(parseFloat(e.target.value) || 50.0)}
                    min="0.0"
                    step="1.0"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default amount added after each cycle</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Base G Value:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{currentG}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Base Deposit:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${defaultDeposit.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('buyTablePoolRatio')}
              </label>
              <input
                type="range"
                value={buyRatioForTable}
                onChange={(e) => setBuyRatioForTable(parseFloat(e.target.value))}
                min="0.0"
                max="1.0"
                step="0.05"
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span className="font-medium">{Math.round(buyRatioForTable * 100)}%</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pool ratio used for detailed buy table calculations</p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600"></div>

          {/* Market Status Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📈 {t('usMarketInfo')}</h2>
            </div>
            
            {marketStatus && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{t('currentKoreaTime')}:</div>
                    <div className="text-gray-600 dark:text-gray-400">{marketStatus.currentTimeKST}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{t('usMarketStatus')}:</div>
                    <div className="text-gray-600 dark:text-gray-400">{marketStatus.marketStatus}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>{t('dst')}:</strong> {marketStatus.dstStatus}
                </div>
                
                <div className="space-y-2">
                  {marketStatus.isMarketOpen ? (
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">✔️ {t('regularTradingAvailable')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium">❌ {t('regularTradingUnavailable')}</span>
                    </div>
                  )}
                  
                  {marketStatus.isReservationPossible ? (
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">✔️ {t('reservationOrdersAvailable')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium">❌ {t('reservationOrdersUnavailable')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600"></div>

          {/* Help Section */}
          <div className="space-y-4">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">ℹ️ {t('helpAndFormula')}</span>
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                {showHelp ? '−' : '+'}
              </div>
            </button>
            
            {showHelp && (
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 animate-slide-up">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">How to Use:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                    <li><strong>Initial Setup</strong>: Enter initial shares, current price, and pool, or upload a previous CSV file. Set initial G value and default deposit.</li>
                    <li><strong>Start Simulation</strong>: Click 'Start/Reset Simulation' button.</li>
                    <li><strong>Cycle Navigation</strong>: Use '⏮️ Previous' / 'Next ⏭️' buttons to review past records.</li>
                    <li><strong>Next Cycle Progress (only on latest cycle)</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Check current cycle's target V, LBand/HBand, and recommended buy/sell prices.</li>
                        <li>Perform actual trading during the investment period.</li>
                        <li>After period ends, enter <strong>actual results</strong> (final price, shares, pool) and <strong>next cycle info</strong> (deposit, G value).</li>
                        <li>Click 'Calculate Next Cycle' to proceed.</li>
                      </ul>
                    </li>
                    <li><strong>Review Results</strong>: Check summary table and charts below, download records (CSV) and chart images (PNG).</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Value Rebalancing (VR) Formula (Modified):</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg font-mono text-xs">
                    V_f = V_i + (pool_prev / G) + ((E - V_i) / (2√G)) + deposit_next
                  </div>
                  <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                    <li><strong>V_f</strong>: Next cycle target value</li>
                    <li><strong>V_i</strong>: Previous cycle target value</li>
                    <li><strong>pool_prev</strong>: Previous cycle ending pool (before deposit)</li>
                    <li><strong>G</strong>: Gradient value (setting)</li>
                    <li><strong>E</strong>: Previous cycle ending portfolio value (shares × price)</li>
                    <li><strong>deposit_next</strong>: Next cycle starting deposit</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Buy Me a Coffee */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <a
              href="https://www.buymeacoffee.com/woojingo"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png"
                alt="Buy Me A Coffee"
                className="h-10 w-auto mx-auto hover:opacity-80 transition-opacity duration-200"
              />
            </a>
          </div>
          
        </div>
      )}
    </aside>
  );
}
