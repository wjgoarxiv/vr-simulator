import { useState, useEffect, useRef } from 'react';
import { calculatePortfolioSummary } from '../utils/vrCalculations';
import { exportCSV, downloadBlob } from '../utils/csvHandling';

const fmt = {
  currency: (v) =>
    v == null ? '-' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  integer: (v) => (v == null ? '-' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })),
  percent: (v) => (v == null ? '-' : `${(Number(v) * 100).toFixed(1)}%`),
  number1: (v) => (v == null ? '-' : Number(v).toFixed(1)),
};

const TABS = ['상세 기록', '차트', '다운로드'];

export default function ResultsDashboard({ history, adaptiveBandEnabled }) {
  const [activeTab, setActiveTab] = useState(0);
  const [ChartsComponent, setChartsComponent] = useState(null);
  const [chartExporter, setChartExporter] = useState(null);

  useEffect(() => {
    import('./Charts')
      .then((mod) => {
        setChartsComponent(() => mod.default);
      })
      .catch(() => {
        // Charts component not yet available
      });
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="surface-panel text-center text-tx-muted font-mono text-sm py-8">
        시뮬레이션을 시작하면 결과 요약이 여기에 표시됩니다.
      </div>
    );
  }

  const summary = calculatePortfolioSummary(history);
  if (!summary) return null;

  const profitLoss = summary.currentE - (summary.initialE + summary.totalDeposits);
  const divergenceStatus =
    summary.avgDivergence < 5 ? '정상' : summary.avgDivergence < 10 ? '주의' : '위험';

  const baseColumns = [
    { key: 'cycle_num', label: '사이클', format: (v) => v + 1 },
    { key: 'V_i', label: '시작 V', format: fmt.currency },
    { key: 'price_end', label: '종료 가격', format: fmt.currency },
    { key: 'shares_end', label: '종료 주식수', format: (v) => `${Number(v).toFixed(0)}주` },
    { key: 'pool_end_before_deposit', label: '종료 예수금', format: fmt.currency },
    { key: 'E_calc', label: '평가금(E)', format: fmt.currency },
    { key: 'deposit_next', label: '다음 적립금', format: fmt.currency },
    { key: 'G', label: '적용 G', format: fmt.number1 },
    { key: 'V_target', label: '다음 V', format: fmt.currency },
    { key: 'LBand', label: '다음 LBand', format: fmt.currency },
    { key: 'HBand', label: '다음 HBand', format: fmt.currency },
  ];

  const adaptiveColumns = [
    { key: 've_divergence_ratio', label: 'V/E 괴리율', format: fmt.percent },
    { key: 'band_compression_factor', label: '밴드 압축률', format: fmt.percent },
    { key: 'band_lower_ratio', label: 'LBand 비율', format: fmt.percent },
    { key: 'band_upper_ratio', label: 'HBand 비율', format: fmt.percent },
  ];

  const columns = adaptiveBandEnabled
    ? [...baseColumns, ...adaptiveColumns]
    : baseColumns;

  const handleCSVDownload = () => {
    const { blob, filename } = exportCSV(history);
    downloadBlob(blob, filename);
  };

  const handlePNGDownload = () => {
    if (chartExporter) {
      chartExporter();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Performance KPI Section */}
      <div>
        <div className="terminal-divider">
          <span className="terminal-divider-label">PERFORMANCE</span>
        </div>

        {/* Row 1: ROI, V Growth, Cycles, Shares */}
        <div className="metric-strip mb-px">
          <div className="metric-cell">
            <div className={`data-value-md ${summary.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
            </div>
            <div className="data-label mt-1">ROI</div>
          </div>

          <div className="metric-cell">
            <div className={`data-value-md ${summary.vGrowth >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {summary.vGrowth >= 0 ? '+' : ''}{summary.vGrowth.toFixed(1)}%
            </div>
            <div className="data-label mt-1">V GROWTH</div>
          </div>

          <div className="metric-cell">
            <div className="data-value-md">{summary.totalCycles}</div>
            <div className="data-label mt-1">CYCLES</div>
          </div>

          <div className="metric-cell">
            <div className="data-value-md">{summary.currentShares}주</div>
            <div className={`text-xs mt-0.5 ${summary.sharesChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {summary.sharesChange >= 0 ? '+' : ''}{summary.sharesChange}주
            </div>
            <div className="data-label mt-1">SHARES</div>
          </div>
        </div>

        {/* Row 2: Total Invested, Deposits, Avg Divergence, Net P&L */}
        <div className="metric-strip">
          <div className="metric-cell">
            <div className="data-value-md">
              ${(summary.initialE + summary.totalDeposits).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="data-label mt-1">TOTAL INVESTED</div>
          </div>

          <div className="metric-cell">
            <div className="data-value-md">
              ${summary.totalDeposits.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="data-label mt-1">DEPOSITS</div>
          </div>

          <div className="metric-cell">
            <div className={`data-value-md ${
              summary.avgDivergence < 5
                ? 'text-accent-green'
                : summary.avgDivergence < 10
                ? 'text-accent-amber'
                : 'text-accent-red'
            }`}>
              {summary.avgDivergence.toFixed(1)}%
            </div>
            <div className={`text-xs mt-0.5 ${
              summary.avgDivergence < 5
                ? 'text-accent-green'
                : summary.avgDivergence < 10
                ? 'text-accent-amber'
                : 'text-accent-red'
            }`}>
              {divergenceStatus}
            </div>
            <div className="data-label mt-1">AVG DIVERGENCE</div>
          </div>

          <div className="metric-cell">
            <div className={`data-value-md ${profitLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={`text-xs mt-0.5 ${profitLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}$
            </div>
            <div className="data-label mt-1">NET P&amp;L</div>
          </div>
        </div>
      </div>

      {/* Tab System */}
      <div>
        <div className="tab-strip">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={i === activeTab ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="surface-panel mt-0 rounded-t-none border-t-0">
          <div className="transition-opacity duration-150">
            {/* Tab 0: 상세 기록 */}
            {activeTab === 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {columns.map((col, i) => (
                        <th
                          key={col.key}
                          className={`table-header-cell whitespace-nowrap${i === 0 ? ' sticky left-0 bg-surface-3' : ''}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, idx) => (
                      <tr key={idx} className="table-row-zebra">
                        {columns.map((col, i) => (
                          <td
                            key={col.key}
                            className={`table-cell whitespace-nowrap font-mono${i === 0 ? ' sticky left-0 bg-surface-3' : ''}`}
                          >
                            {col.format(row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 1: 차트 (always mounted, hidden when inactive to preserve refs for PNG export) */}
            <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
              {ChartsComponent ? (
                <ChartsComponent history={history} onExportReady={(fn) => setChartExporter(() => fn)} />
              ) : (
                <div className="flex items-center justify-center h-40 text-tx-muted font-mono text-sm">
                  차트 로딩 중...
                </div>
              )}
            </div>

            {/* Tab 2: 다운로드 */}
            {activeTab === 2 && (
              <div className="flex gap-3">
                <button type="button" className="btn-primary flex-1" onClick={handleCSVDownload}>
                  전체 기록 CSV 다운로드
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={handlePNGDownload}
                  disabled={!chartExporter}
                >
                  {chartExporter ? '전체 차트 PNG 다운로드' : '차트 컴포넌트 미구현'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
