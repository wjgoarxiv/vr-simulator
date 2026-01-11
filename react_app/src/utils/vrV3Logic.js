/**
 * VR V3.0 Core Logic Module
 * Ported from vr_v3_core.py
 */

export const VR_VERSION = "3.0";

// =============================================================================
// Enums and Constants
// =============================================================================

export const AssetType = {
  TQQQ: "tqqq",
  UPRO: "upro",
  SOXL: "soxl",
  SPY: "spy",
  QQQ: "qqq",
  CUSTOM: "custom"
};

export const MomentumState = {
  STRONG_BULLISH: "strong_bullish",
  BULLISH: "bullish",
  NEUTRAL: "neutral",
  BEARISH: "bearish",
  STRONG_BEARISH: "strong_bearish"
};

export const RiskLevel = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  CRITICAL: "critical"
};

export const ASSET_PRESETS = {
  'TQQQ': {
    name: 'ProShares UltraPro QQQ',
    leverage: 3.0,
    base_volatility: 0.045,
    band_multiplier: 1.0,
    trailing_stop_pct: 0.15,
    max_position_pct: 0.30,
    momentum_lookback: 20,
    description: '3x Leveraged NASDAQ-100 ETF'
  },
  'UPRO': {
    name: 'ProShares UltraPro S&P500',
    leverage: 3.0,
    base_volatility: 0.035,
    band_multiplier: 0.9,
    trailing_stop_pct: 0.12,
    max_position_pct: 0.35,
    momentum_lookback: 20,
    description: '3x Leveraged S&P 500 ETF'
  },
  'SOXL': {
    name: 'Direxion Semiconductor Bull 3X',
    leverage: 3.0,
    base_volatility: 0.055,
    band_multiplier: 1.2,
    trailing_stop_pct: 0.18,
    max_position_pct: 0.25,
    momentum_lookback: 15,
    description: '3x Leveraged Semiconductor ETF'
  },
  'SPY': {
    name: 'SPDR S&P 500 ETF',
    leverage: 1.0,
    base_volatility: 0.012,
    band_multiplier: 0.5,
    trailing_stop_pct: 0.08,
    max_position_pct: 0.50,
    momentum_lookback: 30,
    description: 'S&P 500 Index ETF'
  },
  'QQQ': {
    name: 'Invesco QQQ Trust',
    leverage: 1.0,
    base_volatility: 0.015,
    band_multiplier: 0.6,
    trailing_stop_pct: 0.10,
    max_position_pct: 0.45,
    momentum_lookback: 25,
    description: 'NASDAQ-100 Index ETF'
  },
  'CUSTOM': {
    name: 'Custom Asset',
    leverage: 1.0,
    base_volatility: 0.02,
    band_multiplier: 1.0,
    trailing_stop_pct: 0.10,
    max_position_pct: 0.40,
    momentum_lookback: 20,
    description: 'User-defined asset settings'
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

function calculateRollingVolatility(priceHistory, lookback, baseVolatility) {
  if (!priceHistory || priceHistory.length < 2) {
    return baseVolatility;
  }

  const prices = priceHistory.length >= lookback ? priceHistory.slice(-lookback) : priceHistory;
  const returns = [];

  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (returns.length < 2) {
    return baseVolatility;
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  return Math.max(volatility, 0.001);
}

function getVolatilityRegime(volatility, baseVol) {
  const ratio = volatility / baseVol;
  if (ratio < 0.5) return 'low';
  else if (ratio < 1.5) return 'normal';
  else if (ratio < 2.5) return 'high';
  else return 'extreme';
}

function calculateAdaptiveMultiplier(volatility, baseVol, baseMult) {
  const volRatio = volatility / baseVol;
  let adjustment;

  if (volRatio > 1.0) {
    adjustment = 1.0 + (volRatio - 1.0) * 0.5;
  } else {
    adjustment = 0.8 + volRatio * 0.2;
  }

  return baseMult * adjustment;
}

// =============================================================================
// Main Logic Functions
// =============================================================================

/**
 * Calculate Volatility-Adaptive Bands
 * @param {number} V_target 
 * @param {number} E_calc 
 * @param {Array<number>} priceHistory 
 * @param {string} assetPresetKey 
 * @returns {Object} { LBand, HBand, info }
 */
export function calculateAdaptiveBands(V_target, E_calc, priceHistory, assetPresetKey = 'TQQQ') {
  const config = ASSET_PRESETS[assetPresetKey] || ASSET_PRESETS['CUSTOM'];
  const lookback = config.momentum_lookback || 20;

  const rollingVol = calculateRollingVolatility(priceHistory, lookback, config.base_volatility);
  const regime = getVolatilityRegime(rollingVol, config.base_volatility);
  const adaptiveMult = calculateAdaptiveMultiplier(rollingVol, config.base_volatility, config.band_multiplier);

  const baseBandWidth = rollingVol * adaptiveMult * config.leverage;

  const minBandWidth = 0.02;
  const maxBandWidth = 0.25;
  const bandWidthPct = Math.max(minBandWidth, Math.min(maxBandWidth, baseBandWidth));

  let LBand, HBand;

  if (E_calc > 0) {
    LBand = V_target * (1 - bandWidthPct);
    HBand = V_target * (1 + bandWidthPct);
  } else {
    LBand = V_target * 0.95;
    HBand = V_target * 1.05;
  }

  return {
    LBand,
    HBand,
    info: {
      rollingVolatility: rollingVol,
      volatilityRegime: regime,
      adaptiveMultiplier: adaptiveMult,
      bandWidthPct: bandWidthPct
    }
  };
}

/**
 * Calculate Trade Friendly Bands (V2.5/3.0 Logic)
 * Ensures min trade size and range around current price
 */
export function calculateTradeFriendlyBounds(currentPrice, LBand, HBand, shares, minTradeShares = 2) {
  if (!currentPrice || currentPrice <= 0 || !shares || shares <= 0) return { minPrice: LBand, maxPrice: HBand };

  // Calculate current Total Value (E)
  const currentTotalValue = currentPrice * shares;

  // Guaranteed range: +/- 5% around current Total Value
  // This ensures that the LBand/HBand (which are Value thresholds) do not deviate too far from current Value,
  // preventing "impossible to trade" scenarios or extreme divergences.
  const guaranteedMinVal = currentTotalValue * 0.95;
  const guaranteedMaxVal = currentTotalValue * 1.05;


  let wasAdjusted = false;

  // Trade Friendly Logic:
  // We want to ensure the bands are "reachable" or "reasonable" relative to current price.
  // Converting the logic to Value terms:

  // If LBand is lower than guaranteedMinVal, raise it. (Buying is triggered when Value < LBand. If LBand is too low, it's hard to buy. Raising it makes it easier.)
  if (LBand < guaranteedMinVal) {
    friendlyL = guaranteedMinVal;
    wasAdjusted = true;
  } else {
    friendlyL = LBand;
  }

  // If HBand is higher than guaranteedMaxVal, lower it. (Selling is triggered when Value > HBand. If HBand is too high, it's hard to sell. Lowering it makes it easier.)
  if (HBand > guaranteedMaxVal) {
    friendlyH = guaranteedMaxVal;
    wasAdjusted = true;
  } else {
    friendlyH = HBand;
  }

  // [Advanced] Min Tradable Shares Logic
  // Ensure that if we are close to the band, we allow at least minTradeShares to be traded.
  // Python Logic: target_buy_shares = s + MIN_TRADABLE_SHARES, min_LBand = P * target_buy * 0.98
  if (minTradeShares > 0 && shares > 0) {
    const targetBuyShares = shares + minTradeShares;
    const minLBandForTrade = currentPrice * targetBuyShares * 0.98; // 2% margin
    if (friendlyL < minLBandForTrade) {
      friendlyL = minLBandForTrade;
      wasAdjusted = true;
    }

    // Python Logic: target_sell_shares = max(0, s - MIN_TRADABLE_SHARES)
    // max_HBand = P * target_sell * 1.02
    const targetSellShares = Math.max(0, shares - minTradeShares);
    if (targetSellShares > 0) {
      const maxHBandForTrade = currentPrice * targetSellShares * 1.02; // 2% margin
      if (friendlyH > maxHBandForTrade) {
        friendlyH = maxHBandForTrade;
        wasAdjusted = true;
      }
    }
  }

  // [Safety Buffer] Minimum Band Width Logic
  // Prevent bands from becoming too narrow (e.g. ensure +/- 2% gap from current value)
  // This overrides the "Min Tradable Shares" logic if it forces the bands too close to price.
  const MIN_WIDTH_PERCENT = 0.02;
  const safetyL = currentTotalValue * (1 - MIN_WIDTH_PERCENT);
  const safetyH = currentTotalValue * (1 + MIN_WIDTH_PERCENT);

  // If friendlyL is too high (too close to current value from below), cap it.
  // (Only enforce this if we haven't already forced a specific trade-friendly level)
  if (!wasAdjusted && friendlyL > safetyL) {
    friendlyL = safetyL;
    wasAdjusted = true;
  }

  // If friendlyH is too low (too close to current value from above), floor it.
  // (Only enforce this if we haven't already forced a specific trade-friendly level)
  if (!wasAdjusted && friendlyH < safetyH) {
    friendlyH = safetyH;
    wasAdjusted = true;
  }

  return {
    LBand: friendlyL,
    HBand: friendlyH,
    isAdjusted: wasAdjusted
  };
}

/**
 * Calculate Momentum Info
 */
export function calculateMomentum(priceHistory, assetPresetKey = 'TQQQ') {
  const config = ASSET_PRESETS[assetPresetKey] || ASSET_PRESETS['CUSTOM'];
  const lookback = config.momentum_lookback || 20;

  if (!priceHistory || priceHistory.length < 3) {
    return {
      state: MomentumState.NEUTRAL,
      score: 0.0,
      recommendation: "Insufficient data"
    };
  }

  const prices = priceHistory.length >= lookback ? priceHistory.slice(-lookback) : priceHistory;

  // Simple Momentum Score similar to python
  const shortMaLen = Math.min(5, prices.length);
  const shortMa = prices.slice(-shortMaLen).reduce((a, b) => a + b, 0) / shortMaLen;
  const longMa = prices.reduce((a, b) => a + b, 0) / prices.length;

  const trendScore = longMa > 0 ? (shortMa - longMa) / longMa : 0;

  let score = Math.max(-1.0, Math.min(1.0, trendScore * 10)); // Simplified scoring

  let state;
  if (score > 0.5) state = MomentumState.STRONG_BULLISH;
  else if (score > 0.2) state = MomentumState.BULLISH;
  else if (score > -0.2) state = MomentumState.NEUTRAL;
  else if (score > -0.5) state = MomentumState.BEARISH;
  else state = MomentumState.STRONG_BEARISH;

  return {
    state,
    score,
    recommendation: score > 0.2 ? "Bullish" : (score < -0.2 ? "Bearish" : "Neutral")
  };
}
