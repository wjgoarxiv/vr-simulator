import { useState, useEffect } from 'react';
import {
  calculateNextV,
  detectVECapActivation,
  calculateAdaptiveBands,
  calculateBands,
  normalizeHistoryEntry,
} from '../utils/vrCalculations';
import { BASE_BAND_LOWER, BASE_BAND_UPPER } from '../constants';

export default function CycleInput({
  activeState,
  inputCycleNum,
  currentG,
  defaultDeposit,
  adaptiveBandEnabled,
  onSubmit,
}) {
  const [price, setPrice] = useState('');
  const [shares, setShares] = useState('');
  const [pool, setPool] = useState('');
  const [deposit, setDeposit] = useState('');
  const [g, setG] = useState('');

  // Sync defaults from activeState whenever it changes
  useEffect(() => {
    if (!activeState) return;
    setPrice(String(activeState.price_end ?? ''));
    setShares(String(Math.round(activeState.shares_end ?? 0)));
    setPool(String(activeState.pool_end_before_deposit ?? ''));
    setDeposit(String(defaultDeposit ?? 0));
    setG(String(currentG ?? activeState.G ?? 10));
  }, [activeState, currentG, defaultDeposit]);

  const priceNum = parseFloat(price) || 0;
  const sharesNum = Math.round(parseFloat(shares) || 0);
  const poolNum = parseFloat(pool) || 0;
  const depositNum = parseFloat(deposit) || 0;
  const gNum = parseFloat(g) || 10;

  const previewE = sharesNum * priceNum;
  const previewTotal = previewE + poolNum;

  function fmt(n, decimals = 2) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!activeState) return;

    const E_calc = sharesNum * priceNum;
    const V_i = activeState.V_target ?? 0;

    const V_next = calculateNextV(V_i, poolNum, E_calc, gNum, depositNum);
    const { capActive, uncappedV } = detectVECapActivation(V_next, E_calc, V_i, poolNum, gNum, depositNum);

    let LBand, HBand, adaptiveResult;
    if (adaptiveBandEnabled) {
      const result = calculateAdaptiveBands(V_next, E_calc);
      LBand = result.LBand;
      HBand = result.HBand;
      adaptiveResult = {
        compression_factor: result.compressionFactor,
        divergence_ratio: result.divergenceRatio,
        divergence_direction: result.divergenceDirection,
        band_lower_ratio: result.bandLowerRatio,
        band_upper_ratio: result.bandUpperRatio,
      };
    } else {
      const result = calculateBands(V_next, E_calc, false);
      LBand = result.LBand;
      HBand = result.HBand;
      const divRatio = E_calc > 0 ? Math.abs(V_next / E_calc - 1.0) : 0.0;
      adaptiveResult = {
        compression_factor: 1.0,
        divergence_ratio: divRatio,
        divergence_direction: 'neutral',
        band_lower_ratio: BASE_BAND_LOWER,
        band_upper_ratio: BASE_BAND_UPPER,
      };
    }

    const new_state = {
      cycle_num: inputCycleNum,
      V_target: V_next,
      V_i: V_i,
      LBand,
      HBand,
      shares_end: sharesNum,
      pool_end_before_deposit: poolNum,
      deposit_next: depositNum,
      price_end: priceNum,
      G: gNum,
      E_calc,
      adaptive_band_enabled: adaptiveBandEnabled,
      ve_divergence_ratio: adaptiveResult.divergenceRatio,
      ve_divergence_direction: adaptiveResult.divergenceDirection,
      band_compression_factor: adaptiveResult.compressionFactor,
      band_lower_ratio: adaptiveResult.bandLowerRatio,
      band_upper_ratio: adaptiveResult.bandUpperRatio,
      ve_cap_active: capActive,
      ve_cap_uncapped_v: uncappedV,
    };

    onSubmit(normalizeHistoryEntry(new_state));
  }

  const paddedNum = String(inputCycleNum).padStart(2, '0');

  return (
    <form onSubmit={handleSubmit} className="surface-panel space-y-3">

      {/* Title */}
      <div className="terminal-divider">
        <span className="terminal-divider-label">CYCLE {paddedNum} INPUT</span>
      </div>

      {/* All 5 inputs in one dense grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <div className="data-label mb-1">종료 가격 ($)</div>
          <input
            type="number"
            className="input-field"
            value={price}
            min="0.01"
            step="0.01"
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="data-label mb-1">보유 주식 수</div>
          <input
            type="number"
            className="input-field"
            value={shares}
            min="0"
            step="1"
            onChange={(e) => setShares(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="data-label mb-1">예수금 ($)</div>
          <input
            type="number"
            className="input-field"
            value={pool}
            min="0"
            step="0.01"
            onChange={(e) => setPool(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="data-label mb-1">다음 적립금 ($)</div>
          <input
            type="number"
            className="input-field"
            value={deposit}
            min="0"
            step="1"
            onChange={(e) => setDeposit(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="data-label mb-1">G 값</div>
          <input
            type="number"
            className="input-field"
            value={g}
            min="1"
            step="0.1"
            onChange={(e) => setG(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Preview bar */}
      <div className="bg-surface-0 border border-border-default rounded-sm px-3 py-2 font-mono text-xs">
        <span className="text-tx-muted">E =</span>{' '}
        <span className="text-accent-cyan">${fmt(previewE)}</span>
        <span className="text-tx-muted mx-2">|</span>
        <span className="text-tx-muted">총자산 =</span>{' '}
        <span className="text-accent-cyan">${fmt(previewTotal)}</span>
      </div>

      {/* Submit */}
      <button type="submit" className="btn-primary w-full font-mono uppercase tracking-wider">
        → 계산
      </button>
    </form>
  );
}
