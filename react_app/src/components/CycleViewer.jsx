import { useState } from 'react';
import { Info, TrendingDown, TrendingUp, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  calculateSimpleTargets,
  calculateBuyTable,
  calculateSellTable,
} from '../utils/vrCalculations';

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

  let buyVariant, buyMsg;
  if (canBuyNow) {
    buyVariant = 'success';
    buyMsg = '즉시 매수 가능!';
  } else if (buyGap <= 5) {
    buyVariant = 'warning';
    buyMsg = '매수 근접 (5% 이내)';
  } else {
    buyVariant = 'info';
    buyMsg = `가격 하락 대기 (${buyGap.toFixed(1)}%)`;
  }

  let sellVariant, sellMsg, sellGap;
  if (sellTargetPrice === 0) {
    sellVariant = 'disabled';
    sellMsg = '매도 불가 — 보유량 부족';
    sellGap = 0;
  } else {
    sellGap = lastPrice > 0 ? ((sellTargetPrice - lastPrice) / lastPrice) * 100 : 0;
    const canSellNow = lastPrice >= sellTargetPrice;
    if (canSellNow) {
      sellVariant = 'danger';
      sellMsg = '즉시 매도 가능!';
    } else if (sellGap <= 5) {
      sellVariant = 'warning';
      sellMsg = '매도 근접 (5% 이내)';
    } else {
      sellVariant = 'info';
      sellMsg = `가격 상승 대기 (${sellGap.toFixed(1)}%)`;
    }
  }

  // Adaptive band info
  const compressionFactor = activeState.band_compression_factor ?? 1.0;
  const divergenceRatio = activeState.ve_divergence_ratio ?? 0.0;
  const divergenceDirection = activeState.ve_divergence_direction ?? 'neutral';
  const lowerRatio = activeState.band_lower_ratio ?? 0.85;
  const upperRatio = activeState.band_upper_ratio ?? 1.15;
  const directionText = { over: '목표 > 실제', under: '실제 > 목표', neutral: '균형' }[divergenceDirection] ?? '균형';

  // Buy/sell tables
  const buyPool = poolStart;
  const buyTable = calculateBuyTable(LBand, sharesStart, buyPool, lastPrice);
  const sellTable = calculateSellTable(HBand, sharesStart, lastPrice, poolStart);

  // Signal card border/bg colors
  const signalStyle = (variant) => {
    const map = {
      success: { border: 'border-vr-green', bg: 'bg-vr-green/10', text: 'text-vr-green' },
      warning: { border: 'border-vr-yellow', bg: 'bg-vr-yellow/10', text: 'text-vr-yellow' },
      info: { border: 'border-vr-blue', bg: 'bg-vr-blue/10', text: 'text-vr-blue' },
      danger: { border: 'border-vr-red', bg: 'bg-vr-red/10', text: 'text-vr-red' },
      disabled: { border: 'border-vr-border', bg: 'bg-vr-accent/20', text: 'text-vr-text2' },
    };
    return map[variant] ?? map.info;
  };

  const buyStyle = signalStyle(buyVariant);
  const sellStyle = signalStyle(sellVariant);

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="section-title text-2xl">
        CYCLE {displayCycleNum} 조회
      </h2>
      <p className="text-vr-text2 text-sm">
        현재 <strong>Cycle {activeState.cycle_num}</strong> 의 종료 시점 기록을 보고 있습니다.
        (다음 사이클인 Cycle {displayCycleNum}의 시작 정보)
      </p>

      {/* 4 KPI metrics */}
      <div>
        <h3 className="text-base font-semibold text-vr-text mb-3">
          Cycle {displayCycleNum} 시작 상태 및 목표 (예상)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="metric-card">
            <div className="metric-value">{sharesStart} 주</div>
            <div className="metric-label">시작 주식 수</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">${fmt(poolStart)}</div>
            <div className="metric-label">시작 예수금</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">${fmt(V_i_display)}</div>
            <div className="metric-label">목표 V ($)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{G_display.toFixed(1)}</div>
            <div className="metric-label">적용 G 값</div>
          </div>
        </div>
      </div>

      {/* V/E Cap Indicator */}
      {veCapActive && veCapUncappedV !== null && (
        <div className="alert-info flex gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm">
            <strong>V/E 상한 적용됨</strong>: 원래 V = ${fmt(veCapUncappedV, 0)} → 제한 V = ${fmt(V_i_display, 0)} (E의 115% 상한).
            적립금 기여분의 약 {absorbedPct.toFixed(0)}%가 흡수되었습니다.
          </span>
        </div>
      )}

      {/* Band Display */}
      <div>
        <p className="text-sm font-medium text-vr-text mb-2">매수/매도 임계 참고:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card" title="Lower Band - 평가금이 이 값 이하로 떨어지면 매수 권장">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4 text-vr-green" />
              <span className="text-xs text-vr-text2">LBand ($)</span>
            </div>
            <div className="metric-value text-vr-green">${fmt(LBand)}</div>
          </div>
          <div className="metric-card" title="Higher Band - 평가금이 이 값 이상으로 오르면 매도 권장">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-vr-red" />
              <span className="text-xs text-vr-text2">HBand ($)</span>
            </div>
            <div className="metric-value text-vr-red">${fmt(HBand)}</div>
          </div>
        </div>
      </div>

      {/* Trade Signals */}
      <div>
        <h4 className="text-sm font-semibold text-vr-text mb-2">거래 신호</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Buy signal */}
          <div className={`rounded-xl p-4 border ${buyStyle.border} ${buyStyle.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className={`w-5 h-5 ${buyStyle.text}`} />
              <span className={`font-bold text-sm ${buyStyle.text}`}>매수 (+1주) {buyMsg}</span>
            </div>
            <div className="text-vr-text text-xl font-bold mb-1">${fmt(buyTargetPrice)}</div>
            <div className="text-vr-text2 text-xs">
              현재가 ${fmt(lastPrice)} | 괴리 {buyGap.toFixed(1)}%
            </div>
          </div>

          {/* Sell signal */}
          <div className={`rounded-xl p-4 border ${sellStyle.border} ${sellStyle.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-5 h-5 ${sellStyle.text}`} />
              <span className={`font-bold text-sm ${sellStyle.text}`}>
                {sellTargetPrice === 0 ? '매도 불가 — 보유량 부족' : `매도 (-1주) ${sellMsg}`}
              </span>
            </div>
            {sellTargetPrice > 0 ? (
              <>
                <div className="text-vr-text text-xl font-bold mb-1">${fmt(sellTargetPrice)}</div>
                <div className="text-vr-text2 text-xs">
                  현재가 ${fmt(lastPrice)} | 괴리 {sellGap.toFixed(1)}%
                </div>
              </>
            ) : (
              <div className="text-vr-text2 text-sm">보유량 부족 (1주 이하)</div>
            )}
          </div>
        </div>

        {/* V/E divergence sell warning */}
        {sellTargetPrice > 0 && sellGap > 20 && (
          <div className="alert-warning flex gap-2 mt-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm">
              매도 목표가(${fmt(sellTargetPrice)})가 현재가 대비 {sellGap.toFixed(1)}% 높습니다.
              V(${fmt(activeState.V_target ?? 0, 0)})가 E(${fmt(activeState.E_calc ?? 0, 0)})를 크게 초과하고 있습니다.
            </span>
          </div>
        )}
      </div>

      {/* Adaptive Band Status */}
      {(activeState.adaptive_band_enabled || adaptiveBandEnabled) && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-vr-text">적응형 밴드 상태:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="metric-card">
              <div className="metric-value text-lg">{(divergenceRatio * 100).toFixed(1)}%</div>
              <div className="metric-label">V/E 괴리율</div>
              <div className="metric-delta-neutral text-xs mt-1">{directionText}</div>
            </div>
            <div className="metric-card">
              <div className="metric-value text-lg">{((1 - compressionFactor) * 100).toFixed(1)}%</div>
              <div className="metric-label">압축률</div>
            </div>
            <div className="metric-card">
              <div className="metric-value text-lg">-{((1.0 - lowerRatio) * 100).toFixed(1)}%</div>
              <div className="metric-label">매수 범위</div>
            </div>
            <div className="metric-card">
              <div className="metric-value text-lg">+{((upperRatio - 1.0) * 100).toFixed(1)}%</div>
              <div className="metric-label">매도 범위</div>
            </div>
          </div>
        </div>
      )}

      {/* Buy/Sell Tables (collapsible) */}
      <div className="card">
        <button
          className="w-full flex items-center justify-between text-sm font-medium text-vr-text"
          onClick={() => setTableOpen((o) => !o)}
        >
          <span>상세 매수/매도 테이블 보기</span>
          {tableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {tableOpen && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Buy table */}
            <div>
              <p className="text-sm font-semibold text-vr-text mb-2">매수표 (하향 지정가)</p>
              {buyTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2 text-left">목표 주식수</th>
                        <th className="px-3 py-2 text-right">지정가 ($)</th>
                        <th className="px-3 py-2 text-right">남은 예수금 ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyTable.map((row) => (
                        <tr key={row.targetShares} className="table-row">
                          <td className="px-3 py-2 text-vr-text">{row.targetShares}</td>
                          <td className="px-3 py-2 text-right text-vr-green">${fmt(row.limitPrice)}</td>
                          <td className="px-3 py-2 text-right text-vr-text2">${fmt(row.remainingCash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert-info text-sm">매수 가능한 래더 없음</div>
              )}
            </div>

            {/* Sell table */}
            <div>
              <p className="text-sm font-semibold text-vr-text mb-2">매도표 (상향 지정가)</p>
              {sellTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2 text-left">목표 주식수</th>
                        <th className="px-3 py-2 text-right">지정가 ($)</th>
                        <th className="px-3 py-2 text-right">예상 예수금 ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellTable.map((row) => (
                        <tr key={row.targetShares} className="table-row">
                          <td className="px-3 py-2 text-vr-text">{row.targetShares}</td>
                          <td className="px-3 py-2 text-right text-vr-red">${fmt(row.threshold)}</td>
                          <td className="px-3 py-2 text-right text-vr-text2">${fmt(row.cumulativeProceeds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert-info text-sm">매도 가능한 래더 없음</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
