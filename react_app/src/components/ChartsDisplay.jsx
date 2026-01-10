import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useVRContext } from '../App';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ChartsDisplay() {
  const { history } = useVRContext();

  if (!history || history.length < 2) {
    return (
      <div className="alert-info">
        Insufficient data for chart display. At least 2 data points are required.
      </div>
    );
  }

  // Prepare chart data
  const cycles = history.map(entry => entry.cycle_num + 1);
  const targetValues = history.map(entry => entry.V_target);
  const lBands = history.map(entry => entry.LBand);
  const hBands = history.map(entry => entry.HBand);
  const portfolioValues = history.map(entry => entry.E_calc);
  const poolBalances = history.map(entry => entry.pool_end_before_deposit + entry.deposit_next);
  const sharesHeld = history.map(entry => entry.shares_end);

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for better chart capture
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Cycle Number'
        }
      }
    }
  };

  // 1. Value Band Tracking Chart
  const valueBandData = {
    labels: cycles,
    datasets: [
      {
        label: 'Target Value (V)',
        data: targetValues,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.1
      },
      {
        label: 'Lower Band (LBand)',
        data: lBands,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.1
      },
      {
        label: 'Upper Band (HBand)',
        data: hBands,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.1,
        fill: '-1'
      }
    ]
  };

  // 2. Portfolio Value vs Target Chart
  const portfolioVsTargetData = {
    labels: cycles,
    datasets: [
      {
        label: 'Portfolio Value (E)',
        data: portfolioValues,
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(147, 51, 234)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.1
      },
      {
        label: 'Target Value (V)',
        data: targetValues,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.1
      }
    ]
  };

  // 3. Pool Balance Chart
  const poolBalanceData = {
    labels: cycles,
    datasets: [
      {
        label: 'Pool Balance (Start of Cycle)',
        data: poolBalances,
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        borderColor: 'rgb(14, 165, 233)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  // 4. Shares Held Chart
  const sharesHeldData = {
    labels: cycles,
    datasets: [
      {
        label: 'Shares Held',
        data: sharesHeld,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.1
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Value Band Tracking */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">Value Band Tracking</h4>
        <div className="h-80">
          <Line 
            data={valueBandData} 
            options={{
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  title: {
                    display: true,
                    text: 'Value ($)'
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Portfolio Value vs Target */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">Portfolio Value (E) vs Target (V)</h4>
        <div className="h-80">
          <Line 
            data={portfolioVsTargetData} 
            options={{
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  title: {
                    display: true,
                    text: 'Value ($)'
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Pool Balance */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">Pool Balance (Start of Cycle)</h4>
        <div className="h-80">
          <Bar 
            data={poolBalanceData} 
            options={{
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  title: {
                    display: true,
                    text: 'Pool ($)'
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Shares Held */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">Shares Held Trend</h4>
        <div className="h-80">
          <Line 
            data={sharesHeldData} 
            options={{
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  title: {
                    display: true,
                    text: 'Number of Shares'
                  }
                }
              }
            }} 
          />
        </div>
      </div>
      
    </div>
  );
}
