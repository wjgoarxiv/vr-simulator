import React, { useState } from 'react';
import { Upload, FileText, Play, RotateCcw } from 'lucide-react';
import { useVRContext } from '../App';
import { parseCSVFile, createInitialHistoryEntry } from '../utils/csvHandling';
import { AssetSelector } from './AssetSelector';
import { StockInfoDisplay } from './StockInfoDisplay';
import { getAssetInfo } from '../config/assets';

export function InitialSetup() {
  const {
    setHistory,
    setViewCycleIndex,
    setSimulationStarted,
    currentG,
    setCurrentG,
    defaultDeposit,
    setDefaultDeposit,
    selectedAsset,
    setSelectedAsset,
    resetSimulation
  } = useVRContext();

  const [useCSV, setUseCSV] = useState(false);
  const [initShares, setInitShares] = useState(1.0);
  const [initPrice, setInitPrice] = useState(() => {
    const assetInfo = getAssetInfo(selectedAsset);
    return assetInfo?.defaultPrice || 36.62;
  });
  const [initPool, setInitPool] = useState(13.36);
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update initial price when asset changes
  React.useEffect(() => {
    const assetInfo = getAssetInfo(selectedAsset);
    if (assetInfo) {
      setInitPrice(assetInfo.defaultPrice);
    }
  }, [selectedAsset]);

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError('');
    setCsvSuccess('');
    setIsLoading(true);

    try {
      const historyData = await parseCSVFile(file);
      setCsvSuccess(`${historyData.length} cycle records loaded successfully.`);
      
      // Set last entry values as defaults for G and deposit
      if (historyData.length > 0) {
        const lastEntry = historyData[historyData.length - 1];
        setCurrentG(lastEntry.G || currentG);
        setDefaultDeposit(lastEntry.deposit_next || defaultDeposit);
      }
    } catch (error) {
      setCsvError(error.message);
      setCsvFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSimulation = async () => {
    if (useCSV && csvFile) {
      // Load from CSV
      try {
        setIsLoading(true);
        const historyData = await parseCSVFile(csvFile);
        setHistory(historyData);
        setViewCycleIndex(historyData.length - 1);
        setSimulationStarted(true);
      } catch (error) {
        setCsvError(error.message);
      } finally {
        setIsLoading(false);
      }
    } else if (!useCSV) {
      // Create initial entry from manual input
      if (initPrice <= 0) {
        alert('Starting price must be greater than 0.');
        return;
      }

      const initialEntry = createInitialHistoryEntry(
        initShares,
        initPrice,
        initPool,
        currentG,
        defaultDeposit,
        selectedAsset
      );

      setHistory([initialEntry]);
      setViewCycleIndex(0);
      setSimulationStarted(true);
    } else {
      alert('Please upload a CSV file or uncheck the CSV option to enter initial values manually.');
    }
  };

  const handleResetSimulation = () => {
    if (confirm('Are you sure you want to reset the simulation? All current data will be lost.')) {
      // Use the global reset function
      resetSimulation();
      
      // Reset local component state
      setUseCSV(false);
      setCsvFile(null);
      setCsvError('');
      setCsvSuccess('');
      
      // Reset to default values
      const assetInfo = getAssetInfo(selectedAsset);
      setInitShares(1);
      setInitPrice(assetInfo?.defaultPrice || 36.62);
      setInitPool(300);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg">
          <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">1. 🌱 Initial Setup</h2>
      </div>

      <div className="space-y-6">
        {/* Asset Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            📊 Select Asset for Value Rebalancing
          </h3>
          <AssetSelector
            selectedAsset={selectedAsset}
            onAssetChange={setSelectedAsset}
          />
        </div>

        {/* Stock Information Display */}
        {selectedAsset && (
          <StockInfoDisplay symbol={selectedAsset} />
        )}

        {/* CSV Upload Option */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="use-csv"
            checked={useCSV}
            onChange={(e) => setUseCSV(e.target.checked)}
            className="w-5 h-5 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
          />
          <label htmlFor="use-csv" className="text-lg font-medium text-gray-700 dark:text-gray-300">
            📁 Use Previous Record CSV File
          </label>
        </div>

        {useCSV ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors duration-200">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Upload Cycle Record CSV File
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Click to select a CSV file with previous simulation history
                </div>
              </label>
            </div>

            {isLoading && (
              <div className="alert-info">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Processing CSV file...</span>
                </div>
              </div>
            )}

            {csvError && (
              <div className="alert-danger">
                <strong>Error:</strong> {csvError}
              </div>
            )}

            {csvSuccess && (
              <div className="alert-success">
                <strong>Success:</strong> {csvSuccess}
              </div>
            )}

            {!csvFile && !isLoading && (
              <div className="alert-info">
                ⚠️ If you don't have a previous record CSV, uncheck the option above and manually enter initial values.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Manual Initial Values Input:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial {selectedAsset} Shares
                </label>
                <input
                  type="number"
                  value={initShares}
                  onChange={(e) => setInitShares(parseFloat(e.target.value) || 0)}
                  min="0.0"
                  step="1.0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Starting Price for Simulation ($)
                </label>
                <input
                  type="number"
                  value={initPrice}
                  onChange={(e) => setInitPrice(parseFloat(e.target.value) || 0)}
                  min="0.01"
                  step="0.01"
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Reference price to begin the VR simulation (not real-time price)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Pool ($)
                </label>
                <input
                  type="number"
                  value={initPool}
                  onChange={(e) => setInitPool(parseFloat(e.target.value) || 0)}
                  min="0.0"
                  step="0.01"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={handleStartSimulation}
            disabled={isLoading || (useCSV && !csvFile)}
            className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 text-lg py-3 px-8"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>🚀 Start Simulation</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleResetSimulation}
            className="btn-secondary w-full md:w-auto flex items-center justify-center space-x-2 text-lg py-3 px-8 border border-gray-300 hover:bg-gray-50"
          >
            <RotateCcw className="w-5 h-5" />
            <span>🔄 Reset All Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
