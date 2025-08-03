import React, { useEffect, useRef } from 'react';
import { useVRContext } from '../App';

export function MatplotlibStyleCharts() {
  const { history } = useVRContext();
  const chartsContainerRef = useRef(null);

  useEffect(() => {
    if (!history || history.length === 0 || !chartsContainerRef.current) return;

    const loadPlotlyAndRender = async () => {
      try {
        // Dynamic import for better code splitting
        const Plotly = (await import('plotly.js-dist-min')).default;

        // Clear existing charts
        chartsContainerRef.current.innerHTML = '';

        // Prepare data
        const cycles = history.map((_, index) => index + 1);
        const targetValues = history.map(entry => entry.V_target || 0);
        const portfolioValues = history.map(entry => entry.E_end || 0);
        const poolValues = history.map(entry => entry.pool_end_before_deposit || 0);
        const shareValues = history.map(entry => entry.shares_end || 0);

        // Matplotlib-style configuration
        const matplotlibLayout = {
          font: {
            family: 'Arial, sans-serif',
            size: 12,
            color: '#333333'
          },
          plot_bgcolor: '#ffffff',
          paper_bgcolor: '#ffffff',
          margin: { l: 80, r: 50, t: 80, b: 60 },
          showlegend: true,
          legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#cccccc',
            borderwidth: 1
          },
          xaxis: {
            title: { text: 'Cycle', font: { size: 14, color: '#333333' } },
            gridcolor: '#e0e0e0',
            gridwidth: 1,
            linecolor: '#cccccc',
            linewidth: 2,
            tickcolor: '#cccccc',
            tickwidth: 1,
            showspikes: false
          },
          yaxis: {
            gridcolor: '#e0e0e0',
            gridwidth: 1,
            linecolor: '#cccccc',
            linewidth: 2,
            tickcolor: '#cccccc',
            tickwidth: 1,
            showspikes: false
          }
        };

        // Create chart containers
        const chartConfigs = [
          {
            id: 'target-value-chart',
            title: 'Target Value (V) Over Time',
            data: [{
              x: cycles,
              y: targetValues,
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Target Value (V)',
              line: { color: '#1f77b4', width: 2 },
              marker: { color: '#1f77b4', size: 6 }
            }],
            layout: {
              ...matplotlibLayout,
              title: { text: 'Target Value (V) Over Time', font: { size: 16, color: '#333333' } },
              yaxis: {
                ...matplotlibLayout.yaxis,
                title: { text: 'Value ($)', font: { size: 14, color: '#333333' } }
              }
            }
          },
          {
            id: 'portfolio-value-chart',
            title: 'Portfolio Value (E) Over Time',
            data: [{
              x: cycles,
              y: portfolioValues,
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Portfolio Value (E)',
              line: { color: '#ff7f0e', width: 2 },
              marker: { color: '#ff7f0e', size: 6 }
            }],
            layout: {
              ...matplotlibLayout,
              title: { text: 'Portfolio Value (E) Over Time', font: { size: 16, color: '#333333' } },
              yaxis: {
                ...matplotlibLayout.yaxis,
                title: { text: 'Value ($)', font: { size: 14, color: '#333333' } }
              }
            }
          },
          {
            id: 'pool-chart',
            title: 'Pool (Cash) Over Time',
            data: [{
              x: cycles,
              y: poolValues,
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Pool (Cash)',
              line: { color: '#2ca02c', width: 2 },
              marker: { color: '#2ca02c', size: 6 }
            }],
            layout: {
              ...matplotlibLayout,
              title: { text: 'Pool (Cash) Over Time', font: { size: 16, color: '#333333' } },
              yaxis: {
                ...matplotlibLayout.yaxis,
                title: { text: 'Amount ($)', font: { size: 14, color: '#333333' } }
              }
            }
          },
          {
            id: 'shares-chart',
            title: 'Shares Over Time',
            data: [{
              x: cycles,
              y: shareValues,
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Shares',
              line: { color: '#d62728', width: 2 },
              marker: { color: '#d62728', size: 6 }
            }],
            layout: {
              ...matplotlibLayout,
              title: { text: 'Shares Over Time', font: { size: 16, color: '#333333' } },
              yaxis: {
                ...matplotlibLayout.yaxis,
                title: { text: 'Number of Shares', font: { size: 14, color: '#333333' } }
              }
            }
          }
        ];

        // Create chart elements and render
        chartConfigs.forEach((config) => {
          const chartDiv = document.createElement('div');
          chartDiv.id = config.id;
          chartDiv.style.width = '100%';
          chartDiv.style.height = '400px';
          chartDiv.style.marginBottom = '20px';
          chartsContainerRef.current.appendChild(chartDiv);

          // Configure Plotly for high-quality export
          const plotConfig = {
            displayModeBar: false,
            responsive: true,
            toImageButtonOptions: {
              format: 'png',
              filename: `vr_chart_${config.id}`,
              height: 400,
              width: 600,
              scale: 2 // High resolution
            }
          };

          Plotly.newPlot(chartDiv, config.data, config.layout, plotConfig);
        });
      } catch (error) {
        console.error('Error loading Plotly or rendering charts:', error);
      }
    };

    loadPlotlyAndRender();
  }, [history]);

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📊 Matplotlib-Style Charts
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          High-quality charts for professional analysis
        </div>
      </div>
      <div ref={chartsContainerRef} id="matplotlib-charts-container"></div>
    </div>
  );
}
