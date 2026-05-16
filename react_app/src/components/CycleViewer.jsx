import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  calculateSimpleTargets,
  calculateBuyTable,
  calculateSellTable,
} from '../utils/vrCalculations';
import { serializeTableCSV } from '../utils/csvHandling';

function downloadTableCSV(rows, columns, filename) {
  const csv = serializeTableCSV(rows, columns);
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function CycleViewer({ activeState, displayCycleNum, tickerName, adaptiveBandEnabled }) {
  const [tableOpen, setTableOpen] = useState(false);

  if (!activeState) return null;

  const sharesStart = Math.round(activeState.shares_end ?? 0);
  const poolStart = (activeState.pool_end_before_deposit ?? 0) + (activeState.deposit_next ?? 0);
  const V_i_display = activeState.V_target ?? 0;
  const LBand = activeState.LBand ?? 0;
  const HBand = activeState.HBand ?? 0;
  const G_display = activeState.G ?? 0;
  const lastPrice = activeState.price_end ?? 0;

  // V/E cap info
  const veCapActive = activeState.ve_cap_active ?? false;
  const veCapUncappedV = activeState.ve_cap_uncapped_v ?? null;
  const absorbedPct = veCapActive && veCapUncappedV
    ? (1 - V_i_display / veCapUncappedV) * 100
    : 0;

  // Trade signals
  const { buyTargetPrice, sellTargetPrice } = calculateSimpleTargets(sharesStart, LBand, HBand);
  const buyGap = lastPrice > 0 ? ((lastPrice - buyTargetPrice) / lastPrice) * 100 : 0;
  const canBuyNow = lastPrice <= buyTargetPrice;

  let buySignalClass, buyStatusText;
  if (canBuyNow) {
    buySignalClass = 'signal-buy-active';
    buyStatusText = '즉시 매수 가능';
  } else if (buyGap <= 5) {
    buySignalClass = 'signal-buy-near';
    buyStatusText = '매수 근접';
  } else {
    buySignalClass = 'signal-buy-wait';
    buyStatusText = '대기중';
  }

  let sellSignalClass, sellStatusText, sellGap;
  if (sellTargetPrice === 0) {
    sellSignalClass = 'signal-disabled';
    sellStatusText = '보유량 부족';
    sellGap = 0;
  } else {
    sellGap = lastPrice > 0 ? ((sellTargetPrice - lastPrice) / lastPrice) * 100 : 0;
    const canSellNow = lastPrice >= sellTargetPrice;
    if (canSellNow) {
      sellSignalClass = 'signal-sell-active';
      sellStatusText = '즉시 매도 가능';
    } else if (sellGap <= 5) {
      sellSignalClass = 'signal-sell-near';
      sellStatusText = '매도 근접';
    } else {
      sellSignalClass = 'signal-sell-wait';
      sellStatusText = '대기중';
    }
  }

  // Adaptive band info
  const compressionFactor = activeState.band_compression_factor ?? 1.0;
  const divergenceRatio = activeState.ve_divergence_ratio ?? 0.0;
  const divergenceDirection = activeState.ve_divergence_direction ?? 'neutral';
  const lowerRatio = activeState.band_lower_ratio ?? 0.85;
  const upperRatio = activeState.band_upper_ratio ?? 1.15;
  const directionText = { over: '목표>실제', under: '실제>목표', neutral: '균형' }[divergenceDirection] ?? '균형';

  // Buy/sell tables
  const buyPool = poolStart;
  const buyTable = calculateBuyTable(LBand, sharesStart, buyPool, lastPrice);
  const sellTable = calculateSellTable(HBand, sharesStart, lastPrice, poolStart);

  const paddedNum = String(displayCycleNum).padStart(2, '0');

  return (
    <div className="space-y-3">

      {/* Header */}
      <h2 className="font-mono text-h2 text-accent-cyan uppercase tracking-wider">
        CYCLE {paddedNum}
      </h2>

      {/* KPI Strip — shares, pool, target V, G, LBand, HBand */}
      <div className="metric-strip">
        <div className="metric-cell">
          <div className="data-value-md font-mono">{sharesStart}</div>
          <div className="data-label">주식 수</div>
        </div>
        <div className="metric-cell">
          <div className="data-value-md font-mono">${fmt(poolStart)}</div>
          <div className="data-label">예수금</div>
        </div>
        <div className="metric-cell">
          <div className="data-value-md font-mono">${fmt(V_i_display)}</div>
          <div className="data-label">목표 V</div>
        </div>
        <div className="metric-cell">
          <div className="data-value-md font-mono">{G_display.toFixed(1)}</div>
          <div className="data-label">G 값</div>
        </div>
        <div className="metric-cell">
          <div className="data-value-md font-mono text-accent-green">${fmt(LBand)}</div>
          <div className="data-label">LBand</div>
        </div>
        <div className="metric-cell">
          <div className="data-value-md font-mono text-accent-red">${fmt(HBand)}</div>
          <div className="data-label">HBand</div>
        </div>
      </div>

      {/* V/E Cap Indicator */}
      {veCapActive && veCapUncappedV !== null && (
        <div className="alert-warning">
          <span className="font-mono text-xs">V/E CAP ACTIVE</span>
          <span className="font-sans text-xs ml-2">
            원래 V = <span className="font-mono text-accent-amber">${fmt(veCapUncappedV, 0)}</span>
            {' → '}제한 V = <span className="font-mono text-accent-amber">${fmt(V_i_display, 0)}</span>
            {' '}(E의 115% 상한, 적립금 기여분 <span className="font-mono text-accent-amber">{absorbedPct.toFixed(0)}%</span> 흡수)
          </span>
        </div>
      )}

      {/* Trade Signals — full width side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Buy signal */}
        <div className={`signal-card ${buySignalClass} p-3`}>
          <div className="data-label uppercase mb-1">{buyStatusText}</div>
          <div className={`data-value font-mono ${canBuyNow ? 'text-accent-green' : buyGap <= 5 ? 'text-accent-amber' : 'text-tx-primary'}`}>
            ${fmt(buyTargetPrice)}
          </div>
          <div className="text-xs text-tx-muted font-mono mt-1">
            매수 +1주 | 괴리 {buyGap.toFixed(1)}%
          </div>
        </div>

        {/* Sell signal */}
        <div className={`signal-card ${sellSignalClass} p-3`}>
          <div className="data-label uppercase mb-1">{sellStatusText}</div>
          {sellTargetPrice > 0 ? (
            <>
              <div className={`data-value font-mono ${lastPrice >= sellTargetPrice ? 'text-accent-red' : sellGap <= 5 ? 'text-accent-amber' : 'text-tx-primary'}`}>
                ${fmt(sellTargetPrice)}
              </div>
              <div className="text-xs text-tx-muted font-mono mt-1">
                매도 -1주 | 괴리 {sellGap.toFixed(1)}%
              </div>
            </>
          ) : (
            <div className="data-value-sm font-mono text-tx-muted">—</div>
          )}
        </div>
      </div>

      {/* V/E divergence sell warning */}
      {sellTargetPrice > 0 && sellGap > 20 && (
        <div className="alert-warning">
          <span className="font-mono text-xs">SELL GAP WARNING</span>
          <span className="font-sans text-xs ml-2">
            매도 목표가(<span className="font-mono text-accent-amber">${fmt(sellTargetPrice)}</span>)가 현재가 대비{' '}
            <span className="font-mono text-accent-amber">{sellGap.toFixed(1)}%</span> 높음.
            V(<span className="font-mono">${fmt(activeState.V_target ?? 0, 0)}</span>)가
            E(<span className="font-mono">${fmt(activeState.E_calc ?? 0, 0)}</span>)를 크게 초과.
          </span>
        </div>
      )}

      {/* Adaptive Band Status */}
      {(activeState.adaptive_band_enabled || adaptiveBandEnabled) && (
        <div className="surface-panel">
          <div className="data-label mb-2">적응형 밴드 상태</div>
          <div className="metric-strip">
            <div className="metric-cell">
              <div className="data-value-sm font-mono">{(divergenceRatio * 100).toFixed(1)}%</div>
              <div className="data-label">V/E 괴리율</div>
              <div className="text-xs text-tx-muted font-mono mt-0.5">{directionText}</div>
            </div>
            <div className="metric-cell">
              <div className="data-value-sm font-mono">{((1 - compressionFactor) * 100).toFixed(1)}%</div>
              <div className="data-label">압축률</div>
            </div>
            <div className="metric-cell">
              <div className="data-value-sm font-mono text-accent-green">-{((1.0 - lowerRatio) * 100).toFixed(1)}%</div>
              <div className="data-label">매수 범위</div>
            </div>
            <div className="metric-cell">
              <div className="data-value-sm font-mono text-accent-red">+{((upperRatio - 1.0) * 100).toFixed(1)}%</div>
              <div className="data-label">매도 범위</div>
            </div>
          </div>
        </div>
      )}

      {/* Buy/Sell Tables (collapsible) */}
      <div className="surface-panel">
        <button
          className="w-full flex items-center justify-between font-mono text-xs uppercase text-tx-muted tracking-wider"
          onClick={() => setTableOpen((o) => !o)}
        >
          <span>상세 매수/매도 테이블</span>
          {tableOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <div
          className={`overflow-hidden transition-[max-height] duration-300 ${tableOpen ? 'max-h-[1000px]' : 'max-h-0'}`}
        >
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Buy table */}
            <div>
              <div className="terminal-divider">
                <span className="terminal-divider-label">매수표 (하향 지정가)</span>
              </div>
              {buyTable.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary text-xs mb-2 w-full"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                      downloadTableCSV(buyTable, [
                        { label: '목표 주식수', value: (r) => r.targetShares },
                        { label: '지정가 ($)', value: (r) => r.limitPrice.toFixed(2) },
                        { label: '잔여 예수금 ($)', value: (r) => r.remainingCash.toFixed(2) },
                      ], `${today}_buy_table.csv`);
                    }}
                  >
                    매수표 CSV 다운로드 ({buyTable.length}행)
                  </button>
                  <div className="overflow-y-auto max-h-[400px] overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="table-header-cell">목표 주식수</th>
                          <th className="table-header-cell text-right">지정가 ($)</th>
                          <th className="table-header-cell text-right">잔여 예수금 ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyTable.map((row) => (
                          <tr key={row.targetShares} className="table-row-zebra">
                            <td className="table-cell">{row.targetShares}</td>
                            <td className="table-cell text-right text-accent-green">${fmt(row.limitPrice)}</td>
                            <td className="table-cell text-right text-tx-secondary">${fmt(row.remainingCash)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="alert-info text-xs font-mono">매수 가능한 래더 없음</div>
              )}
            </div>

            {/* Sell table */}
            <div>
              <div className="terminal-divider">
                <span className="terminal-divider-label">매도표 (상향 지정가)</span>
              </div>
              {sellTable.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary text-xs mb-2 w-full"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                      downloadTableCSV(sellTable, [
                        { label: '목표 주식수', value: (r) => r.targetShares },
                        { label: '지정가 ($)', value: (r) => r.threshold.toFixed(2) },
                        { label: '예상 예수금 ($)', value: (r) => r.cumulativeProceeds.toFixed(2) },
                      ], `${today}_sell_table.csv`);
                    }}
                  >
                    매도표 CSV 다운로드 ({sellTable.length}행)
                  </button>
                  <div className="overflow-y-auto max-h-[400px] overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="table-header-cell">목표 주식수</th>
                          <th className="table-header-cell text-right">지정가 ($)</th>
                          <th className="table-header-cell text-right">예상 예수금 ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellTable.map((row) => (
                          <tr key={row.targetShares} className="table-row-zebra">
                            <td className="table-cell">{row.targetShares}</td>
                            <td className="table-cell text-right text-accent-red">${fmt(row.threshold)}</td>
                            <td className="table-cell text-right text-tx-secondary">${fmt(row.cumulativeProceeds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="alert-info text-xs font-mono">매도 가능한 래더 없음</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
