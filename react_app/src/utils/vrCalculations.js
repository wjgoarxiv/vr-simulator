/**
 * Core Value Rebalancing (VR) calculation functions
 * Ported from Python Streamlit app to JavaScript
 */

export const POOL_CAP_RATIO = 0.5; // 최대 50%의 평가금만 풀로 사용
export const BAND_RESET_LOWER_FACTOR = 0.8;
export const BAND_RESET_UPPER_FACTOR = 1.2;

/**
 * Calculate next target value (V_f) using VR formula
 * V_f = V_i + (pool_prev / G) + ((E - V_i) / (2 * sqrt(G))) + deposit_next
 * 
 * @param {number} V_i - Previous cycle target value
 * @param {number} poolBeforeDeposit - Previous cycle pool before deposit
 * @param {number} E_calc - Previous cycle portfolio value (shares * price)
 * @param {number} G - Gradient value
 * @param {number} depositNext - Next deposit amount
 * @returns {number} Next target value
 */
export function calculateNextV(V_i, poolBeforeDeposit, E_calc, G, depositNext) {
  if (G <= 0) {
    return V_i;
  }
  
  try {
    const term1 = V_i;
    const term2 = poolBeforeDeposit / G;
    const term3 = G > 0 ? (E_calc - V_i) / (2 * Math.sqrt(G)) : 0;
    const term4 = depositNext;
    
    const V_f = term1 + term2 + term3 + term4;
    return V_f;
  } catch (error) {
    console.error('Error calculating V:', error);
    return V_i;
  }
}

/**
 * Calculate LBand and HBand values
 * @param {number} V_target - Target value
 * @returns {Object} {LBand, HBand}
 */
export function calculateBands(V_target) {
  const LBand = 0.85 * V_target;
  const HBand = 1.15 * V_target;
  return { LBand, HBand };
}

/**
 * Calculate simple buy/sell target prices (+/- 1 share basis)
 * @param {number} sharesStart - Starting number of shares
 * @param {number} LBand - Lower band value
 * @param {number} HBand - Upper band value
 * @returns {Object} {buyTargetPrice, sellTargetPrice}
 */
export function calculateSimpleTargets(sharesStart, LBand, HBand) {
  let buyTargetPrice = 0;
  if (sharesStart >= 0) {
    buyTargetPrice = (sharesStart + 1) > 0 ? LBand / (sharesStart + 1) : 0;
  }

  let sellTargetPrice = 0;
  if (sharesStart > 1) {
    sellTargetPrice = (sharesStart - 1) > 0 ? HBand / (sharesStart - 1) : 0;
  } else if (sharesStart === 1) {
    sellTargetPrice = sharesStart > 0 ? HBand / sharesStart : 0;
  }

  return {
    buyTargetPrice: Math.round(buyTargetPrice * 100) / 100,
    sellTargetPrice: Math.round(sellTargetPrice * 100) / 100
  };
}

export function enforcePoolCap(poolValue = 0, portfolioValue = 0, capRatio = POOL_CAP_RATIO) {
  const capLimit = Math.max(0, capRatio * portfolioValue);
  const effectivePool = Math.min(Math.max(poolValue, 0), capLimit || 0);
  return { effectivePool, capLimit };
}

export function applyBandReset(V_candidate, portfolioValue, poolValue, capLimit) {
  let adjustedV = V_candidate;
  let resetType = 'none';

  let lowerBound = BAND_RESET_LOWER_FACTOR * adjustedV;
  let upperBound = BAND_RESET_UPPER_FACTOR * adjustedV;

  if (BAND_RESET_LOWER_FACTOR > 0 && portfolioValue < lowerBound) {
    adjustedV = portfolioValue / BAND_RESET_LOWER_FACTOR;
    resetType = 'lower';
  } else if (
    BAND_RESET_UPPER_FACTOR > 0 &&
    capLimit > 0 &&
    poolValue >= capLimit &&
    portfolioValue > upperBound
  ) {
    adjustedV = portfolioValue / BAND_RESET_UPPER_FACTOR;
    resetType = 'upper';
  }

  if (resetType !== 'none') {
    lowerBound = BAND_RESET_LOWER_FACTOR * adjustedV;
    upperBound = BAND_RESET_UPPER_FACTOR * adjustedV;
  }

  return {
    V_adjusted: adjustedV,
    resetType,
    bandResetRangeMin: lowerBound,
    bandResetRangeMax: upperBound
  };
}

export function normalizeHistoryEntry(entry = {}) {
  const normalized = { ...entry };
  const E_calc = Number(normalized.E_calc ?? normalized.E_end ?? 0);
  const pool = Number(normalized.pool_end_before_deposit ?? 0);
  const V_target = Number(normalized.V_target ?? normalized.V_i ?? 0);

  const capLimit = normalized.pool_cap_limit ?? (POOL_CAP_RATIO * E_calc);
  normalized.pool_cap_limit = capLimit || 0;
  normalized.pool_cap_ratio_used = normalized.pool_cap_ratio_used ?? POOL_CAP_RATIO;
  normalized.pool_effective_for_v = normalized.pool_effective_for_v ?? Math.min(pool, capLimit || 0);
  normalized.band_reset_range_min = normalized.band_reset_range_min ?? (BAND_RESET_LOWER_FACTOR * V_target);
  normalized.band_reset_range_max = normalized.band_reset_range_max ?? (BAND_RESET_UPPER_FACTOR * V_target);
  normalized.band_reset_type = normalized.band_reset_type ?? 'none';

  return normalized;
}

/**
 * Calculate detailed buy/sell tables
 * @param {number} LBand - Lower band value
 * @param {number} HBand - Upper band value
 * @param {number} currentShares - Current number of shares
 * @param {number} pool - Current pool amount
 * @param {number} buyRatio - Ratio of pool to use for buy calculations
 * @returns {Object} {buyTable, sellTable}
 */
export function calculateDetailedTables(LBand, HBand, currentShares, pool, buyRatio) {
  const buyTable = [];
  const allocatedCash = pool * buyRatio;
  let remainingCash = allocatedCash;
  let tempShares = currentShares;
  const maxIterations = 1000;
  let iterations = 0;

  // Calculate buy table
  while (remainingCash > 0 && tempShares >= 0 && iterations < maxIterations) {
    iterations++;
    tempShares += 1;
    const buyPrice = tempShares > 0 ? LBand / tempShares : 0;
    
    if (buyPrice <= 0 || buyPrice > remainingCash) {
      break;
    }
    
    remainingCash -= buyPrice;
    buyTable.push({
      targetShares: tempShares,
      buyPrice: Math.round(buyPrice * 100) / 100,
      totalPool: Math.round((pool - (allocatedCash - remainingCash)) * 100) / 100
    });
  }

  // Calculate sell table
  const sellTable = [];
  let tempSellShares = currentShares;
  iterations = 0;
  
  while (tempSellShares > 0 && iterations < maxIterations) {
    iterations++;
    const sharesToSell = 1;
    const targetSharesAfterSell = tempSellShares - sharesToSell;
    
    if (targetSharesAfterSell < 0) {
      break;
    }
    
    const sellPrice = targetSharesAfterSell > 0 ? HBand / targetSharesAfterSell : HBand;
    const accumulatedPool = pool + (sellPrice * sharesToSell);
    
    sellTable.push({
      targetShares: targetSharesAfterSell,
      sellPrice: Math.round(sellPrice * 100) / 100,
      totalPool: Math.round(accumulatedPool * 100) / 100
    });
    
    tempSellShares -= sharesToSell;
    
    if (targetSharesAfterSell === 0) {
      break;
    }
  }

  return { buyTable, sellTable };
}
