import {
  BASE_BAND_LOWER,
  BASE_BAND_UPPER,
  MIN_BAND_LOWER,
  MAX_BAND_UPPER,
  VE_DIVERGENCE_THRESHOLD,
  VE_MAX_DIVERGENCE,
  MAX_V_E_RATIO,
} from '../constants.js';

/**
 * Calculate next target value (V_f) using the VR formula.
 *
 * V_f = V_i + pool_prev/G + (E - V_i)/(2*sqrt(G)) + deposit_next
 *
 * @param {number} V_i - Current target value
 * @param {number} poolBeforeDeposit - Pool cash before deposit
 * @param {number} E_calc - Current evaluation (shares * price)
 * @param {number} G - Gradient coefficient
 * @param {number} depositNext - Next deposit amount
 * @returns {number} Next target value V_f
 */
export function calculateNextV(V_i, poolBeforeDeposit, E_calc, G, depositNext) {
  if (G <= 0) {
    return V_i;
  }

  const term1 = V_i;
  const term2 = poolBeforeDeposit / G;
  const term3 = (E_calc - V_i) / (2 * Math.sqrt(G));
  const term4 = depositNext;
  let V_f = term1 + term2 + term3 + term4;

  // V3.1.1: V growth cap - suppress V if it exceeds E excessively
  if (E_calc > 0 && V_f > E_calc * MAX_V_E_RATIO) {
    V_f = E_calc * MAX_V_E_RATIO;
  }

  return Math.max(V_f, 0.01);
}

/**
 * Calculate band compression factor based on V/E divergence ratio.
 *
 * @param {number} V_target - Target value
 * @param {number} E_calc - Current evaluation
 * @returns {{ compressionFactor: number, divergenceRatio: number, divergenceDirection: string }}
 */
export function calculateBandCompressionFactor(V_target, E_calc) {
  if (E_calc <= 0 || V_target <= 0) {
    return { compressionFactor: 1.0, divergenceRatio: 0.0, divergenceDirection: 'neutral' };
  }

  const ve_ratio = V_target / E_calc;
  const divergenceRatio = Math.abs(ve_ratio - 1.0);

  let divergenceDirection;
  if (ve_ratio > 1.0 + VE_DIVERGENCE_THRESHOLD) {
    divergenceDirection = 'over';
  } else if (ve_ratio < 1.0 - VE_DIVERGENCE_THRESHOLD) {
    divergenceDirection = 'under';
  } else {
    divergenceDirection = 'neutral';
  }

  let compressionFactor;
  if (divergenceRatio <= VE_DIVERGENCE_THRESHOLD) {
    compressionFactor = 1.0;
  } else {
    const excess = divergenceRatio - VE_DIVERGENCE_THRESHOLD;
    const max_excess = VE_MAX_DIVERGENCE - VE_DIVERGENCE_THRESHOLD;
    const normalized = max_excess > 0 ? Math.min(excess / max_excess, 1.0) : 1.0;
    compressionFactor = 1.0 - normalized;
  }

  return { compressionFactor, divergenceRatio, divergenceDirection };
}

/**
 * Calculate LBand and HBand (with adaptive band support).
 *
 * @param {number} V_target - Target value
 * @param {number|null} E_calc - Current evaluation (null for non-adaptive)
 * @param {boolean} useAdaptive - Whether to use adaptive bands
 * @returns {{ LBand: number, HBand: number }}
 */
export function calculateBands(V_target, E_calc = null, useAdaptive = false) {
  if (!useAdaptive || E_calc === null || E_calc <= 0) {
    return { LBand: BASE_BAND_LOWER * V_target, HBand: BASE_BAND_UPPER * V_target };
  }

  const { compressionFactor } = calculateBandCompressionFactor(V_target, E_calc);
  const compressed_lower = BASE_BAND_LOWER + (MIN_BAND_LOWER - BASE_BAND_LOWER) * (1 - compressionFactor);
  const compressed_upper = BASE_BAND_UPPER + (MAX_BAND_UPPER - BASE_BAND_UPPER) * (1 - compressionFactor);

  const anchor_sell = (E_calc !== null && E_calc > 0) ? Math.min(V_target, E_calc) : V_target;
  let LBand = compressed_lower * V_target;
  let HBand = compressed_upper * anchor_sell;

  // Inversion guard: fall back to symmetric V-based anchoring
  if (HBand <= LBand) {
    HBand = compressed_upper * V_target;
  }

  return { LBand, HBand };
}

/**
 * Calculate adaptive bands with full metadata.
 *
 * @param {number} V_target - Target value
 * @param {number} E_calc - Current evaluation
 * @returns {{ LBand: number, HBand: number, compressionFactor: number, divergenceRatio: number, divergenceDirection: string, bandLowerRatio: number, bandUpperRatio: number }}
 */
export function calculateAdaptiveBands(V_target, E_calc) {
  const { compressionFactor, divergenceRatio, divergenceDirection } =
    calculateBandCompressionFactor(V_target, E_calc);

  const compressed_lower = BASE_BAND_LOWER + (MIN_BAND_LOWER - BASE_BAND_LOWER) * (1 - compressionFactor);
  const compressed_upper = BASE_BAND_UPPER + (MAX_BAND_UPPER - BASE_BAND_UPPER) * (1 - compressionFactor);

  // V3.1.1: Asymmetric anchoring
  // Buy (LBand): anchored to V (preserving buy targets)
  // Sell (HBand): anchored to min(V, E) (making sell targets realistic)
  const anchor_sell = E_calc > 0 ? Math.min(V_target, E_calc) : V_target;
  let LBand = compressed_lower * V_target;
  let HBand = compressed_upper * anchor_sell;

  // Safety: inversion guard (symmetric fallback on extreme V/E divergence)
  if (HBand <= LBand) {
    LBand = compressed_lower * V_target;
    HBand = compressed_upper * V_target;
  }

  return {
    LBand,
    HBand,
    compressionFactor,
    divergenceRatio,
    divergenceDirection,
    bandLowerRatio: compressed_lower,
    bandUpperRatio: compressed_upper,
  };
}

/**
 * Calculate simple buy/sell target prices (+/- 1 share basis).
 *
 * @param {number} sharesStart - Current number of shares
 * @param {number} LBand - Lower band value
 * @param {number} HBand - Upper band value
 * @returns {{ buyTargetPrice: number, sellTargetPrice: number }}
 */
export function calculateSimpleTargets(sharesStart, LBand, HBand) {
  const s = Math.max(0, Math.floor(sharesStart));
  const buyTargetPrice = (s + 1) > 0 ? LBand / (s + 1) : 0;

  let sellTargetPrice = 0;
  if (s > 1) {
    sellTargetPrice = HBand / (s - 1);
  } else if (s === 1) {
    sellTargetPrice = s > 0 ? HBand / s : 0;
  }

  return {
    buyTargetPrice: Math.round(buyTargetPrice * 100) / 100,
    sellTargetPrice: Math.round(sellTargetPrice * 100) / 100,
  };
}

/**
 * Generate buy table.
 *
 * @param {number} LBand - Lower band value
 * @param {number} currentShares - Current number of shares
 * @param {number} pool - Available cash
 * @param {number} currentPrice - Current price per share
 * @param {number} maxLevels - Maximum number of buy levels
 * @returns {Array<{ targetShares: number, limitPrice: number, remainingCash: number }>}
 */
export function calculateBuyTable(LBand, currentShares, pool, currentPrice, maxLevels = 50) {
  const buyTable = [];
  let s = Math.max(0, Math.floor(currentShares));
  let remainingCash = pool;

  if (currentPrice <= 0) {
    return buyTable;
  }

  for (let i = 0; i < maxLevels; i++) {
    const nextShares = s + 1;
    const limitPrice = nextShares > 0 ? LBand / nextShares : 0;
    if (limitPrice <= 0 || remainingCash < limitPrice) {
      break;
    }
    remainingCash -= limitPrice;
    s = nextShares;
    buyTable.push({
      targetShares: s,
      limitPrice: Math.round(limitPrice * 100) / 100,
      remainingCash: Math.round(remainingCash * 100) / 100,
    });
  }

  return buyTable;
}

/**
 * Generate sell table (with cumulative proceeds).
 *
 * @param {number} HBand - Upper band value
 * @param {number} currentShares - Current number of shares
 * @param {number} currentPrice - Current price per share
 * @param {number} pool - Current pool cash
 * @param {number} maxLevels - Maximum number of sell levels
 * @returns {Array<{ targetShares: number, threshold: number, cumulativeProceeds: number }>}
 */
export function calculateSellTable(HBand, currentShares, currentPrice, pool, maxLevels = 50) {
  const sellTable = [];
  let s = Math.max(0, Math.floor(currentShares));
  let cumulativeProceeds = pool; // Start from current pool

  if (s === 0) {
    return sellTable;
  }

  const levels = Math.min(s, maxLevels);
  for (let i = 0; i < levels; i++) {
    const targetAfterSell = s - 1;
    const threshold = targetAfterSell === 0 ? HBand : HBand / targetAfterSell;
    // Sell proceeds estimated at current price (actual sale at threshold or above)
    const sellProceeds = currentPrice > 0 ? currentPrice : threshold;
    cumulativeProceeds += sellProceeds;
    sellTable.push({
      targetShares: targetAfterSell,
      threshold: Math.round(threshold * 100) / 100,
      cumulativeProceeds: Math.round(cumulativeProceeds * 100) / 100,
    });
    s = targetAfterSell;
    if (s <= 0) {
      break;
    }
  }

  return sellTable;
}

/**
 * Normalize a history entry, ensuring all adaptive band metadata fields exist.
 *
 * @param {Object} entry - Cycle history entry
 * @returns {Object} Normalized entry with all metadata fields
 */
export function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  // Deep clone
  const normalized = JSON.parse(JSON.stringify(entry));

  const E_val = parseFloat(normalized.E_calc ?? 0.0);
  const V_target = parseFloat(normalized.V_target ?? normalized.V_i ?? 0.0);

  const existingDivergenceRatio = normalized.ve_divergence_ratio ?? normalized.veDivergenceRatio;
  const existingDivergenceDirection = normalized.ve_divergence_direction ?? normalized.veDivergenceDirection;
  const existingCompressionFactor = normalized.band_compression_factor ?? normalized.bandCompressionFactor;
  const existingLowerRatio = normalized.band_lower_ratio ?? normalized.bandLowerRatio;
  const existingUpperRatio = normalized.band_upper_ratio ?? normalized.bandUpperRatio;

  let divergenceRatio = existingDivergenceRatio;
  let divergenceDirection = existingDivergenceDirection;
  let compressionFactor = existingCompressionFactor;
  let bandLowerRatio = existingLowerRatio;
  let bandUpperRatio = existingUpperRatio;

  if (
    divergenceRatio === undefined ||
    divergenceDirection === undefined ||
    compressionFactor === undefined ||
    bandLowerRatio === undefined ||
    bandUpperRatio === undefined
  ) {
    if (E_val > 0 && V_target > 0) {
      const factorResult = calculateBandCompressionFactor(V_target, E_val);
      const adaptiveResult = calculateAdaptiveBands(V_target, E_val);
      normalized.ve_divergence_ratio = factorResult.divergenceRatio;
      normalized.ve_divergence_direction = factorResult.divergenceDirection;
      normalized.band_compression_factor = factorResult.compressionFactor;
      normalized.band_lower_ratio = adaptiveResult.bandLowerRatio;
      normalized.band_upper_ratio = adaptiveResult.bandUpperRatio;
    } else {
      divergenceRatio = divergenceRatio ?? 0.0;
      divergenceDirection = divergenceDirection ?? 'neutral';
      compressionFactor = compressionFactor ?? 1.0;
      bandLowerRatio = bandLowerRatio ?? BASE_BAND_LOWER;
      bandUpperRatio = bandUpperRatio ?? BASE_BAND_UPPER;
    }
  }

  const adaptiveBandEnabled = Boolean(normalized.adaptive_band_enabled ?? normalized.adaptiveBandEnabled ?? false);

  // Keep both current snake_case history fields and older camelCase fields populated.
  normalized.adaptive_band_enabled = adaptiveBandEnabled;
  normalized.adaptiveBandEnabled = adaptiveBandEnabled;
  normalized.ve_divergence_ratio = Number.isFinite(Number(divergenceRatio)) ? Number(divergenceRatio) : 0.0;
  normalized.veDivergenceRatio = normalized.ve_divergence_ratio;
  normalized.ve_divergence_direction = divergenceDirection ?? 'neutral';
  normalized.veDivergenceDirection = normalized.ve_divergence_direction;
  normalized.band_compression_factor = Number.isFinite(Number(compressionFactor)) ? Number(compressionFactor) : 1.0;
  normalized.bandCompressionFactor = normalized.band_compression_factor;
  normalized.band_lower_ratio = Number.isFinite(Number(bandLowerRatio)) ? Number(bandLowerRatio) : BASE_BAND_LOWER;
  normalized.bandLowerRatio = normalized.band_lower_ratio;
  normalized.band_upper_ratio = Number.isFinite(Number(bandUpperRatio)) ? Number(bandUpperRatio) : BASE_BAND_UPPER;
  normalized.bandUpperRatio = normalized.band_upper_ratio;

  // Backward-compatible aliases for any older React-only consumers.
  normalized.adaptiveBandEnabled = normalized.adaptive_band_enabled;
  normalized.veDivergenceRatio = normalized.ve_divergence_ratio;
  normalized.veDivergenceDirection = normalized.ve_divergence_direction;
  normalized.bandCompressionFactor = normalized.band_compression_factor;
  normalized.bandLowerRatio = normalized.band_lower_ratio;
  normalized.bandUpperRatio = normalized.band_upper_ratio;

  return normalized;
}

/**
 * Calculate portfolio summary from cycle history.
 *
 * @param {Array<Object>} history - Array of cycle history entries
 * @returns {Object|null} Portfolio summary or null if history is empty
 */
export function calculatePortfolioSummary(history) {
  if (!history || history.length < 1) {
    return null;
  }

  const first = history[0];
  const last = history[history.length - 1];

  const initialE = first.E_calc ?? 0;
  const currentE = last.E_calc ?? 0;
  const initialV = first.V_target ?? 0;
  const currentV = last.V_target ?? 0;
  const totalDeposits = history.reduce((sum, h) => sum + (h.deposit_next ?? 0), 0);

  const totalInvested = initialE + totalDeposits;
  const roi = totalInvested > 0 ? ((currentE - totalInvested) / totalInvested) * 100 : 0;
  const vGrowth = initialV > 0 ? ((currentV - initialV) / initialV) * 100 : 0;

  let avgDivergence = 0;
  const divergenceValues = history
    .map((h) => h.ve_divergence_ratio)
    .filter((v) => v !== undefined && v !== null);
  if (divergenceValues.length > 0) {
    avgDivergence = (divergenceValues.reduce((sum, v) => sum + v, 0) / divergenceValues.length) * 100;
  }

  const initialShares = first.shares_end ?? 0;
  const currentShares = last.shares_end ?? 0;

  return {
    totalCycles: history.length,
    initialE,
    currentE,
    totalDeposits,
    roi,
    vGrowth,
    avgDivergence,
    initialShares,
    currentShares,
    sharesChange: currentShares - initialShares,
  };
}

/**
 * Detect whether the V/E ratio cap was activated for a given V calculation.
 *
 * @param {number} V_next - The capped V value (output of calculateNextV)
 * @param {number} E_calc - Current evaluation
 * @param {number} V_i - Previous target value
 * @param {number} pool - Pool before deposit
 * @param {number} G - Gradient coefficient
 * @param {number} deposit - Deposit amount
 * @returns {{ capActive: boolean, uncappedV: number|null }}
 */
export function detectVECapActivation(V_next, E_calc, V_i, pool, G, deposit) {
  const capActive = E_calc > 0 && Math.abs(V_next - E_calc * MAX_V_E_RATIO) < 0.01;

  let uncappedV = null;
  if (capActive && G > 0) {
    uncappedV = V_i + pool / G + (E_calc - V_i) / (2 * Math.sqrt(G)) + deposit;
  }

  return { capActive, uncappedV };
}
