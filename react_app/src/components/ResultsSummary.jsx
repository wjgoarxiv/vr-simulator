import React, { useRef } from 'react';
import { FileText, Download, BarChart3, Image, RotateCcw } from 'lucide-react';
import { useVRContext } from '../App';
import { downloadCSV } from '../utils/csvHandling';
import { ChartsDisplay } from './ChartsDisplay';
import { MatplotlibStyleCharts } from './MatplotlibStyleCharts';

export function ResultsSummary() {
      const { 
        history, 
        initialMoney, 
        setInitialMoney, 
        currentMoney,
        currentShares,
        currentAverageCost,
        totalCycles,
        setHistory, 
        currentSharesValue,
        setCurrentMoney,
        setCurrentShares,
        setCurrentAverageCost,
        setTotalCycles,
        setCurrentSharesValue,
        v3Enabled
    } = useVRContext();
  const chartsRef = useRef(null);
  const matplotlibChartsRef = useRef(null);

  const handleDownloadCharts = async () => {
    if (matplotlibChartsRef.current) {
      try {
        // Show loading state
        const button = document.querySelector('[data-download-charts]');
        if (button) {
          button.disabled = true;
          button.textContent = 'Generating...';
        }

        // Wait for charts to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get all Plotly charts
        const plotlyDivs = matplotlibChartsRef.current.querySelectorAll('[id$="-chart"]');
        
        console.log('Found Plotly charts:', plotlyDivs.length);
        
        if (plotlyDivs.length === 0) {
          throw new Error('차트를 찾을 수 없습니다. 시뮬레이션을 실행한 후 다시 시도해주세요.');
        }

        // Create a combined canvas for all charts
        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d');
        
        // Set high resolution
        const dpr = window.devicePixelRatio || 1;
        const chartWidth = 800;
        const chartHeight = 600;
        const padding = 40;
        const chartsPerRow = 2;
        
        const totalWidth = (chartWidth + padding) * chartsPerRow - padding;
        const totalHeight = Math.ceil(plotlyDivs.length / chartsPerRow) * (chartHeight + padding) - padding;
        
        combinedCanvas.width = totalWidth * dpr;
        combinedCanvas.height = totalHeight * dpr;
        combinedCanvas.style.width = totalWidth + 'px';
        combinedCanvas.style.height = totalHeight + 'px';
        ctx.scale(dpr, dpr);
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);
        
        // Export each Plotly chart and combine
        const { default: Plotly } = await import('plotly.js-dist-min');
        
        for (let i = 0; i < plotlyDivs.length; i++) {
          const plotlyDiv = plotlyDivs[i];
          
          try {
            // Export Plotly chart as image
            const imgData = await Plotly.toImage(plotlyDiv, {
              format: 'png',
              width: chartWidth,
              height: chartHeight,
              scale: 2 // High resolution
            });
            
            // Create image element
            const img = document.createElement('img');
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = imgData;
            });
            
            // Calculate position in grid
            const row = Math.floor(i / chartsPerRow);
            const col = i % chartsPerRow;
            const x = col * (chartWidth + padding);
            const y = row * (chartHeight + padding);
            
            // Draw image onto combined canvas
            ctx.drawImage(img, x, y, chartWidth, chartHeight);
            console.log(`Matplotlib chart ${i} drawn at position (${x}, ${y})`);
          } catch (plotlyError) {
            console.error(`Error exporting Plotly chart ${i}:`, plotlyError);
            // Continue with other charts
          }
        }

        // Create download link
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `vr_simulation_charts_${timestamp}.png`;
        link.href = combinedCanvas.toDataURL('image/png', 1.0);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Successfully downloaded Matplotlib-style charts with ${plotlyDivs.length} charts`);

        // Reset button state
        if (button) {
          button.disabled = false;
          button.textContent = '📊 Download Charts';
        }
      } catch (error) {
        console.error('Error capturing charts:', error);
        alert(`차트 다운로드 중 오류가 발생했습니다: ${error.message}`);
        
        // Reset button state
        const button = document.querySelector('[data-download-charts]');
        if (button) {
          button.disabled = false;
          button.textContent = '📊 Download Charts';
        }
      }
    } else {
      alert('차트 영역을 찾을 수 없습니다. 페이지를 새로고침한 후 다시 시도해주세요.');
    }
  };

  const handleDownloadCSV = () => {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    downloadCSV(history, `${yyyymmdd}_vr_simulation_history.csv`);
  };

  const handleResetSimulation = () => {
    if (window.confirm('모든 시뮬레이션 설정과 사이클을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetSimulation();
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
    portfolioValue: entry.E_calc || entry.E_end,
    nextDeposit: entry.deposit_next || entry.deposit || 0,
    appliedG: (entry.G || entry.g || 0),
    nextTargetV: entry.V_target,
    nextLBand: entry.LBand || entry.L_band || 0,
    nextHBand: entry.HBand || entry.H_band || 0,
    poolCapLimit: entry.pool_cap_limit,
    poolEffective: entry.pool_effective_for_v,
    resetLower: entry.band_reset_range_min,
    resetUpper: entry.band_reset_range_max,
    resetType: entry.band_reset_type || 'none',
    divergence: (entry.V_target && (entry.E_calc || entry.E_end)) 
      ? ((entry.V_target - (entry.E_calc || entry.E_end)) / (entry.E_calc || entry.E_end) * 100) 
      : 0
  }));

  // Calculate overall statistics
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
            data-download-charts
            className="btn-secondary flex items-center space-x-2"
          >
            <Image className="w-4 h-4" />
            <span>📊 Download Charts</span>
          </button>

          <button
            onClick={handleResetSimulation}
            className="btn-danger flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>🔄 Reset Simulation</span>
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pool Cap Limit
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pool Used for V
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reset Min (80%)
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reset Max (120%)
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reset Type
                </th>
                {v3Enabled && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 dark:text-purple-300 uppercase tracking-wider">
                    V/E Div (%)
                  </th>
                )}
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
                    {(row.appliedG || 0).toFixed(1)}
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
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.poolCapLimit || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.poolEffective || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.resetLower || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${(row.resetUpper || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm capitalize text-gray-900 dark:text-gray-100">
                    {row.resetType}
                  </td>
                  {v3Enabled && (
                    <td className={`px-3 py-4 whitespace-nowrap text-sm font-medium ${
                      Math.abs(row.divergence) > 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {row.divergence > 0 ? '+' : ''}{row.divergence.toFixed(2)}%
                    </td>
                  )}
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

      {/* Matplotlib Style Charts - Hidden but needed for download */}
      <div ref={matplotlibChartsRef} style={{ display: 'none' }}>
        <MatplotlibStyleCharts />
      </div>
    </div>
  );
}
