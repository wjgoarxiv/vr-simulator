import React, { useRef } from 'react';
import { FileText, Download, BarChart3, Image } from 'lucide-react';
import { useVRContext } from '../App';
import { downloadCSV } from '../utils/csvHandling';
import { ChartsDisplay } from './ChartsDisplay';

export function ResultsSummary() {
  const { history } = useVRContext();
  const chartsRef = useRef(null);

  const handleDownloadCSV = () => {
    downloadCSV(history, 'vr_simulation_history.csv');
  };

  const handleDownloadCharts = () => {
    if (chartsRef.current) {
      // Create a canvas element to capture the charts
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get the charts container
      const chartsContainer = chartsRef.current;
      const rect = chartsContainer.getBoundingClientRect();
      
      canvas.width = rect.width * 2; // Higher resolution
      canvas.height = rect.height * 2;
      
      // Use html2canvas library for better chart capture (would need to be installed)
      // For now, show a simple alert
      alert('Chart download feature would require additional libraries like html2canvas. This is a placeholder implementation.');
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="card">
        <div className="alert-info">
          Simulation results summary will appear here once you start the simulation.
        </div>
      </div>
    );
  }

  // Prepare display data
  const displayData = history.map((entry, index) => ({
    cycle: entry.cycle_num + 1,
    startTargetV: entry.V_i || entry.V_target,
    endPrice: entry.price_end,
    endShares: entry.shares_end,
    endPool: entry.pool_end_before_deposit,
    portfolioValue: entry.E_end,
    nextDeposit: entry.deposit_next || entry.deposit || 0,
    appliedG: (entry.G || entry.g || 0) * 100,
    nextTargetV: entry.V_target,
    nextLBand: entry.LBand || entry.L_band || 0,
    nextHBand: entry.HBand || entry.H_band || 0,
  }));

  // Calculate overall statistics
  const totalCycles = history.length;
  const initialValue = history[0]?.V_target || 0;
  const finalValue = history[history.length - 1]?.V_target || 0;
  const totalGrowth = initialValue > 0 ? ((finalValue - initialValue) / initialValue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Simulation Results Summary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Total Cycles</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCycles}</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-200">Initial V</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${initialValue.toLocaleString()}</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200">Final V</h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">${finalValue.toLocaleString()}</p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-orange-900 dark:text-orange-200">Growth</h4>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalGrowth.toFixed(1)}%</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleDownloadCSV}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>📄 Download CSV</span>
          </button>
            
          <button
            onClick={handleDownloadCharts}
            className="btn-secondary flex items-center space-x-2"
          >
            <Image className="w-4 h-4" />
            <span>📊 Download Charts</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Simulation History Table</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cycle
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Start V (V_i)
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  End Price
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  End Shares
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  End Pool
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Portfolio (E)
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next Deposit
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Applied G
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next V (Target)
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next LBand
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next HBand
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {displayData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {row.cycle}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.startTargetV || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.endPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {(row.endShares || 0).toFixed(0)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.endPool || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.portfolioValue || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.nextDeposit || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {(row.appliedG || 0).toFixed(1)}%
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                    ${(row.nextTargetV || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    ${(row.nextLBand || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                    ${(row.nextHBand || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Display */}
      <div ref={chartsRef}>
        <ChartsDisplay />
      </div>
    </div>
  );
}
