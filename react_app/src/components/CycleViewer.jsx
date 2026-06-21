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

const OFFICIAL_VR_LATEX = String.raw`V_{2}=V_{1}+\frac{Pool}{G}+\frac{E-V_{1}}{2\sqrt{G}}+D_{2}`;

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
  // Trade signals
  const { buyTargetPrice, sellTargetPrice } = calculateSimpleTargets(sharesStart, LBand, HBand);
  const buyGap = lastPrice > 0 ? ((lastPrice - buyTargetPrice) / lastPrice) * 100 : 0;
  const canBuyNow = lastPrice <= buyTargetPrice;

  let buySignalClass, buyStatusText;
  if (canBuyNow) {
    buySignalClass = 'signal-buy-active';
    buyStatusText = '지금 매수 가능';
  } else if (buyGap <= 5) {
    buySignalClass = 'signal-buy-near';
    buyStatusText = '매수에 가까워졌어요';
  } else {
    buySignalClass = 'signal-buy-wait';
    buyStatusText = '기다리는 중';
  }

  let sellSignalClass, sellStatusText, sellGap, canSellNow = false;
  if (sellTargetPrice === 0) {
    sellSignalClass = 'signal-disabled';
    sellStatusText = '보유량 부족';
    sellGap = 0;
  } else {
    sellGap = lastPrice > 0 ? ((sellTargetPrice - lastPrice) / lastPrice) * 100 : 0;
    canSellNow = lastPrice >= sellTargetPrice;
    if (canSellNow) {
      sellSignalClass = 'signal-sell-active';
      sellStatusText = '지금 매도 가능';
    } else if (sellGap <= 5) {
      sellSignalClass = 'signal-sell-near';
      sellStatusText = '매도에 가까워졌어요';
    } else {
      sellSignalClass = 'signal-sell-wait';
      sellStatusText = '기다리는 중';
    }
  }

  // Adaptive band info
  const compressionFactor = activeState.band_compression_factor ?? 1.0;
  const divergenceRatio = activeState.ve_divergence_ratio ?? 0.0;
  const divergenceDirection = activeState.ve_divergence_direction ?? 'neutral';
  const lowerRatio = activeState.band_lower_ratio ?? 0.85;
  const upperRatio = activeState.band_upper_ratio ?? 1.15;
  const directionText = { over: '목표>평가금', under: '평가금>목표', neutral: '균형' }[divergenceDirection] ?? '균형';
  const cycleAdaptiveBandEnabled = Boolean(activeState.adaptive_band_enabled);
  const officialMode = !cycleAdaptiveBandEnabled;
  const noImmediateTrade = !canBuyNow && !canSellNow;
  const triggerSpan = sellTargetPrice > buyTargetPrice ? sellTargetPrice - buyTargetPrice : 0;
  const triggerPosition = triggerSpan > 0
    ? Math.min(Math.max(((lastPrice - buyTargetPrice) / triggerSpan) * 100, 0), 100)
    : 50;
  const cycleStatus = canBuyNow
    ? '매수 구간 진입'
    : canSellNow
    ? '매도 구간 진입'
    : '밴드 안쪽 대기';
  const cycleStatusTone = canBuyNow ? 'text-accent-green' : canSellNow ? 'text-accent-red' : 'text-accent-cyan';
  const waitMessage = sellTargetPrice > 0
    ? '현재가는 첫 매수·첫 매도 지정가 사이에 있어 이번 사이클은 대기 상태입니다.'
    : '현재가는 첫 매수 지정가보다 위에 있고, 매도 기준은 보유 주식이 생긴 뒤 표시됩니다.';
  const buyDistanceText = canBuyNow ? '매수 조건 충족' : `${Math.max(buyGap, 0).toFixed(1)}% 하락 시 첫 매수`;
  const sellDistanceText = sellTargetPrice > 0
    ? (canSellNow ? '매도 조건 충족' : `${Math.max(sellGap, 0).toFixed(1)}% 상승 시 첫 매도`)
    : '보유량 부족';

  // Buy/sell tables
  const buyPool = poolStart;
  const buyTable = calculateBuyTable(LBand, sharesStart, buyPool, lastPrice);
  const sellTable = calculateSellTable(HBand, sharesStart, lastPrice, poolStart);

  const paddedNum = String(displayCycleNum).padStart(2, '0');

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="data-label">사이클 상태</div>
          <h2 className="font-display text-5xl font-bold uppercase leading-none tracking-[-0.04em] text-accent-cyan md:text-7xl">
            CYCLE {paddedNum}
          </h2>
        </div>
        <div className="rounded-full border border-accent-cyan/20 bg-surface-1/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.26em] text-tx-secondary">
          {tickerName} · G {G_display.toFixed(1)} · {officialMode ? 'OFFICIAL ±15%' : 'ADVANCED BAND'}
        </div>
      </div>

      {/* KPI Strip — shares, pool, target V, G, LBand, HBand */}
      <div className="metric-strip rounded-[24px]">
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

      {/* Official VR status board */}
      <div className="hero-board overflow-hidden border-accent-cyan/20">
        <div className="grid gap-5 lg:grid-cols-[1fr_210px] lg:items-center">
          <div className="space-y-4">
            <div className="data-label mb-1">이번 사이클 상태</div>
            <div className={`font-display text-4xl font-bold uppercase tracking-[-0.03em] md:text-6xl ${cycleStatusTone}`}>{cycleStatus}</div>
            <div className="mt-1 text-xs leading-relaxed text-tx-secondary">
              {noImmediateTrade
                ? waitMessage
                : '현재가가 공식 VR 지정가 조건에 닿았습니다. 실제 주문 가능 여부는 증권사와 예약 주문 상태를 확인하세요.'}
            </div>

            <div>
              <div className="mb-2 flex justify-between font-mono text-[11px] text-tx-muted">
                <span>BUY ${fmt(buyTargetPrice)}</span>
                <span>LAST ${fmt(lastPrice)}</span>
                <span>SELL {sellTargetPrice > 0 ? `$${fmt(sellTargetPrice)}` : '—'}</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-surface-0 ring-1 ring-accent-cyan/15">
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-accent-green/25 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent-red/25 to-transparent" />
                <div
                  className="absolute top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-accent-cyan shadow-glow-cyan"
                  style={{ left: `${triggerPosition}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-sans text-xs text-tx-secondary">
                <div className="rounded-2xl border border-accent-green/20 bg-accent-green/5 px-3 py-2">
                  <span className="text-accent-green">매수 거리</span> · {buyDistanceText}
                </div>
                <div className="rounded-2xl border border-accent-red/20 bg-accent-red/5 px-3 py-2 text-right">
                  <span className="text-accent-red">매도 거리</span> · {sellDistanceText}
                </div>
              </div>
            </div>
          </div>
          <div className="motion-safe-float hidden lg:block">
            <div className="orbit-gauge">
              <div className="text-center">
                <div className={`font-display text-2xl font-bold ${cycleStatusTone}`}>{noImmediateTrade ? '대기' : canBuyNow ? '매수' : '매도'}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-tx-muted">VR 상태</div>
              </div>
            </div>
          </div>
        </div>

        <div className="formula-panel">
          <div className="data-label">공식 LaTeX</div>
          <code className="formula-latex">{OFFICIAL_VR_LATEX}</code>
          <div className="mt-2 font-sans text-xs leading-relaxed text-tx-muted">
            공식 밴드: LBand = 0.85V, HBand = 1.15V · 첫 주문가 = Band ÷ 현재 보유주식
          </div>
        </div>
      </div>

      {/* Target V safety adjustment notice */}
      {veCapActive && veCapUncappedV !== null && (
        <div className="alert-warning flex-col items-start gap-2">
          <div className="font-sans text-sm font-semibold text-tx-primary">목표를 안전하게 낮췄어요</div>
          <div className="font-sans text-xs leading-relaxed text-tx-secondary">
            현재 평가금보다 목표가 너무 높아지지 않도록 조정했어요.
          </div>
          <div className="grid w-full grid-cols-2 gap-2 font-sans text-xs">
            <div className="rounded border border-border-subtle/70 bg-surface-inset px-2 py-1">
              <div className="data-label">처음 계산된 목표</div>
              <div className="font-mono text-accent-amber">${fmt(veCapUncappedV, 0)}</div>
            </div>
            <div className="rounded border border-border-subtle/70 bg-surface-inset px-2 py-1">
              <div className="data-label">이번에 적용할 목표</div>
              <div className="font-mono text-accent-amber">${fmt(V_i_display, 0)}</div>
            </div>
          </div>
          <div className="font-sans text-xs leading-relaxed text-tx-muted">
            다음 사이클에 무리한 매수 주문이 나오지 않아요. 따로 조치할 필요는 없어요.
          </div>
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

      {/* Sell gap warning */}
      {sellTargetPrice > 0 && sellGap > 20 && (
        <div className="alert-warning">
          <span className="font-sans text-xs font-semibold">매도까지 아직 거리가 있어요.</span>
          <span className="font-sans text-xs ml-2">
            매도 목표가는 현재가보다 <span className="font-mono text-accent-amber">{sellGap.toFixed(1)}%</span> 높고,
            목표와 평가금 차이가 커진 상태예요.
          </span>
        </div>
      )}

      {/* Adaptive Band Status */}
      {cycleAdaptiveBandEnabled && (
        <div className="surface-panel">
          <div className="data-label mb-2">적응형 밴드 상태</div>
          <div className="metric-strip">
            <div className="metric-cell">
              <div className="data-value-sm font-mono">{(divergenceRatio * 100).toFixed(1)}%</div>
              <div className="data-label">목표-평가금 차이</div>
              <div className="text-xs text-tx-muted font-mono mt-0.5">{directionText}</div>
            </div>
            <div className="metric-cell">
              <div className="data-value-sm font-mono">{((1 - compressionFactor) * 100).toFixed(1)}%</div>
              <div className="data-label">조건 조정</div>
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
