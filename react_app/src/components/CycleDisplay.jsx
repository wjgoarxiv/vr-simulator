import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useVRContext } from '../App';
import { useLanguage } from '../contexts/AppContext';
import {
  calculateSimpleTargets,
  calculateDetailedTables,
  POOL_CAP_RATIO,
  BAND_RESET_LOWER_FACTOR,
  BAND_RESET_UPPER_FACTOR
} from '../utils/vrCalculations';

export function CycleDisplay() {
  const { history, viewCycleIndex, buyRatioForTable, selectedAsset } = useVRContext();
  const { t } = useLanguage();  const [showDetailedTables, setShowDetailedTables] = useState(false);
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
  const sharesStartDisplay = activeState.shares_end || 0;
  const poolStartDisplay = (activeState.pool_end_before_deposit || 0) + (activeState.deposit_next || 0);
  const LBandDisplay = activeState.LBand || 0;
  const HBandDisplay = activeState.HBand || 0;
  const GDisplay = activeState.G || 0;
  const lastPriceDisplay = activeState.price_end || 0;
  const poolCapLimitDisplay = activeState.pool_cap_limit ?? (POOL_CAP_RATIO * (activeState.E_calc || 0));
  const poolEffectiveDisplay = activeState.pool_effective_for_v ?? Math.min(activeState.pool_end_before_deposit || 0, poolCapLimitDisplay || 0);
  const bandResetRangeMin = activeState.band_reset_range_min ?? (BAND_RESET_LOWER_FACTOR * V_i_display);
  const bandResetRangeMax = activeState.band_reset_range_max ?? (BAND_RESET_UPPER_FACTOR * V_i_display);
  const resetFlag = activeState.band_reset_type ?? 'none';
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const downloadTableCSV = (rows, columns, filename) => {
    if (!rows || rows.length === 0) return;
    const header = columns.map(col => col.label).join(',');
    const csvRows = rows.map(row => columns.map(col => row[col.key]).join(','));
    const csvString = [header, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buyTableColumns = [
    { key: 'targetShares', label: 'targetShares' },
    { key: 'buyPrice', label: 'buyPrice' },
    { key: 'totalPool', label: 'totalPool' }
  ];

  const sellTableColumns = [
    { key: 'targetShares', label: 'targetShares' },
    { key: 'sellPrice', label: 'sellPrice' },
    { key: 'totalPool', label: 'totalPool' }
  ];

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">2. CYCLE {displayCycleNum} {t('cycleReview')}</h2>
        </div>
        
        <div className="alert-info">
          {t('currentlyViewing')} <strong>Cycle {activeState.cycle_num}</strong> {t('endOfPeriodRecord')}. 
          (Starting information for Cycle {displayCycleNum})
        </div>
      </div>

      {/* Starting State and Targets */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📊 Cycle {displayCycleNum} {t('startingStateAndTarget')}
        </h3>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('startingShares')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sharesStartDisplay.toFixed(2)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('shares')}</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('startingPool')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${poolStartDisplay.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('usd')}</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('targetV')}</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${V_i_display.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('usd')}</div>
          </div>
          
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('appliedGValue')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{GDisplay.toFixed(1)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('gradient')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('nextResetLower')} (80%)</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">${bandResetRangeMin.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('nextResetUpper')} (120%)</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">${bandResetRangeMax.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('poolCapLimitLabel')}: ${poolCapLimitDisplay.toFixed(2)} / {t('poolEffectiveLabel')}: ${poolEffectiveDisplay.toFixed(2)}
        </div>

        {resetFlag !== 'none' && (
          <div className="alert-warning mb-4">
            {resetFlag === 'lower' ? t('bandResetLowerMsg') : t('bandResetUpperMsg')}
          </div>
        )}

        {/* Buy/Sell Targets */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('buysellTargetReference')}:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{	('lBand')}</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">${LBandDisplay.toLocaleString()}</div>
            </div>
            
            <div className="metric-card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{	('hBand')}</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">${HBandDisplay.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">{t('buyTarget')}</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-400">${buyTargetPrice.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              {sellTargetPrice > 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-red-800 dark:text-red-300">{t('sellTarget')}</div>
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
                <div className="font-medium">{t('mondayMorningBuy')}</div>
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
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('viewDetailedTables')}</span>
          {showDetailedTables ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        
        {showDetailedTables && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            
            {/* {t('detailedBuyTable')} */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('detailedBuyTable')}</h4>
                {buyTable.length > 0 && (
                  <button
                    onClick={() => downloadTableCSV(buyTable, buyTableColumns, `${todayStr}_buy_ladder.csv`)}
                    className="btn-secondary text-xs flex items-center gap-1 px-3 py-1"
                  >
                    <Download className="w-3 h-3" />
                    {t('downloadCSV')}
                  </button>
                )}
              </div>
              {buyTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('targetShares')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('buyPrice')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('totalPool')}
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
                          : `${t('showingFirst')} 10 ${t('of')} ${buyTable.length} ${t('entries')}`
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

            {/* {t('detailedSellTable')} */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('detailedSellTable')}</h4>
                {sellTable.length > 0 && (
                  <button
                    onClick={() => downloadTableCSV(sellTable, sellTableColumns, `${todayStr}_sell_ladder.csv`)}
                    className="btn-secondary text-xs flex items-center gap-1 px-3 py-1"
                  >
                    <Download className="w-3 h-3" />
                    {t('downloadCSV')}
                  </button>
                )}
              </div>
              {sellTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('targetShares')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('sellPrice')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('totalPool')}
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
                          : `${t('showingFirst')} 10 ${t('of')} ${buyTable.length} ${t('entries')}`
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

          </div>
        )}
      </div>
      
    </div>
  );
}
