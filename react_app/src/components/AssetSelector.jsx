import React, { useState } from 'react';
import { ChevronDown, TrendingUp, DollarSign, BarChart3, AlertTriangle, Info } from 'lucide-react';
import { SUPPORTED_ASSETS, ASSET_CATEGORIES, getAssetInfo } from '../config/assets';

export function AssetSelector({ selectedAsset, onAssetChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Technology');

  const handleAssetSelect = (symbol) => {
    onAssetChange(symbol);
    setIsOpen(false);
  };

  const selectedAssetInfo = selectedAsset ? getAssetInfo(selectedAsset) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Current Selection Display */}
      <div 
        className="card cursor-pointer hover:border-blue-300 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedAssetInfo ? (
              <>
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: selectedAssetInfo.color }}
                >
                  {selectedAsset}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedAssetInfo.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedAssetInfo.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {selectedAssetInfo.leverage}
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedAssetInfo.underlying}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Select an Asset
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a leveraged ETF for Value Rebalancing
                  </p>
                </div>
              </div>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          
          {/* Category Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {Object.entries(ASSET_CATEGORIES).map(([category, info]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {info.name}
                </button>
              ))}
            </div>
          </div>

          {/* Asset List */}
          <div className="max-h-64 overflow-y-auto">
            {/* Category Description */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {ASSET_CATEGORIES[selectedCategory].description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      Risk: {ASSET_CATEGORIES[selectedCategory].risk}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets in Category */}
            {ASSET_CATEGORIES[selectedCategory].assets.map(symbol => {
              const assetInfo = SUPPORTED_ASSETS[symbol];
              
              return (
                <div
                  key={symbol}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onClick={() => handleAssetSelect(symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: assetInfo.color }}
                      >
                        {symbol}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {assetInfo.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {assetInfo.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            {assetInfo.leverage}
                          </span>
                          <span className="text-xs text-gray-500">
                            Vol: {assetInfo.avg_volume}
                          </span>
                          <span className="text-xs text-gray-500">
                            ER: {assetInfo.expense_ratio}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {assetInfo.volatility} Risk
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {assetInfo.category}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Warning */}
      {selectedAssetInfo && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Leveraged ETF Risk Warning
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {selectedAssetInfo.leverage} leveraged ETFs are designed for short-term trading and can experience significant volatility. 
                Value Rebalancing helps manage this risk but requires careful monitoring.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
