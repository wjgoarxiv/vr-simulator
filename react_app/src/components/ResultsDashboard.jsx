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
        if (mod.exportChartAsPNG) {
          setChartExporter(() => mod.exportChartAsPNG);
        }
      })
      .catch(() => {
        // Charts component not yet available — chart tab shows placeholder
      });
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="card text-center text-vr-text2 text-sm py-8">
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
    <div className="flex flex-col gap-6">
      {/* Portfolio Summary Dashboard */}
      <div>
        <h3 className="section-title text-lg mb-4">포트폴리오 성과 대시보드</h3>

        {/* Row 1: 총 수익률, V 성장률, 완료 사이클, 보유 주식 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="metric-card">
            <div className="metric-label">총 수익률 (ROI)</div>
            <div className="metric-value">{fmt.currency(summary.currentE)}</div>
            <div className={summary.roi >= 0 ? 'metric-delta-up' : 'metric-delta-down'}>
              {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">V 성장률</div>
            <div className="metric-value">{summary.vGrowth.toFixed(1)}%</div>
            <div className={summary.vGrowth >= 0 ? 'metric-delta-up' : 'metric-delta-down'}>
              {summary.vGrowth >= 0 ? '+' : ''}{summary.vGrowth.toFixed(1)}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">완료 사이클</div>
            <div className="metric-value">{summary.totalCycles}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">보유 주식</div>
            <div className="metric-value">{summary.currentShares}주</div>
            <div className={summary.sharesChange >= 0 ? 'metric-delta-up' : 'metric-delta-down'}>
              {summary.sharesChange >= 0 ? '+' : ''}{summary.sharesChange}주
            </div>
          </div>
        </div>

        {/* Row 2: 총 투자금, 총 적립금, 평균 V/E 괴리율, 순이익 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="metric-card">
            <div className="metric-label">총 투자금</div>
            <div className="metric-value text-lg">
              ${(summary.initialE + summary.totalDeposits).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">총 적립금</div>
            <div className="metric-value text-lg">
              ${summary.totalDeposits.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">평균 V/E 괴리율</div>
            <div className="metric-value text-lg">{summary.avgDivergence.toFixed(1)}%</div>
            <div
              className={
                summary.avgDivergence < 5
                  ? 'metric-delta-up'
                  : summary.avgDivergence < 10
                  ? 'metric-delta-neutral'
                  : 'metric-delta-down'
              }
            >
              {divergenceStatus}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">순이익</div>
            <div className={`metric-value text-lg ${profitLoss >= 0 ? 'text-vr-green' : 'text-vr-red'}`}>
              ${profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={profitLoss >= 0 ? 'metric-delta-up' : 'metric-delta-down'}>
              {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}$
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-vr-border">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={i === activeTab ? 'tab-btn-active' : 'tab-btn-inactive'}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="card rounded-tl-none rounded-t-none border-t-0">
          {/* Tab 0: 상세 기록 */}
          {activeTab === 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {columns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={idx} className="table-row">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-2 text-vr-text whitespace-nowrap font-mono text-xs"
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

          {/* Tab 1: 차트 */}
          {activeTab === 1 && (
            <div>
              {ChartsComponent ? (
                <ChartsComponent history={history} />
              ) : (
                <div className="text-center text-vr-text2 text-sm py-12">
                  차트 컴포넌트가 아직 구현되지 않았습니다.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 다운로드 */}
          {activeTab === 2 && (
            <div className="flex flex-col gap-4">
              <h4 className="section-title text-base">데이터 다운로드</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-vr-bg flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-vr-text">CSV 데이터</p>
                    <p className="text-xs text-vr-text2 mt-1">
                      전체 사이클 기록을 CSV 파일로 다운로드합니다.
                    </p>
                  </div>
                  <button type="button" className="btn-primary w-full" onClick={handleCSVDownload}>
                    전체 기록 CSV 다운로드
                  </button>
                </div>

                <div className="card bg-vr-bg flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-vr-text">차트 이미지 (PNG)</p>
                    <p className="text-xs text-vr-text2 mt-1">
                      시뮬레이션 차트를 고해상도 PNG 이미지로 다운로드합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={handlePNGDownload}
                    disabled={!chartExporter}
                  >
                    {chartExporter ? '전체 차트 PNG 다운로드' : '차트 컴포넌트 미구현'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
