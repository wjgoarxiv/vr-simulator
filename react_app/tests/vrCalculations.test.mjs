import assert from 'node:assert/strict';

import {
  calculateNextV,
  calculateBandCompressionFactor,
  calculateBands,
  calculateAdaptiveBands,
  calculateSimpleTargets,
  calculateBuyTable,
  calculateSellTable,
  normalizeHistoryEntry,
  calculatePortfolioSummary,
  detectVECapActivation,
} from '../src/utils/vrCalculations.js';

const round2 = (value) => Math.round(value * 100) / 100;
const nearlyEqual = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to equal ${expected} within ${tolerance}`,
  );
};

function testCalculateNextVFormulaAndCap() {
  const uncapped = calculateNextV(1000, 300, 2000, 9, 250);
  nearlyEqual(uncapped, 1000 + 300 / 9 + (2000 - 1000) / (2 * Math.sqrt(9)) + 250);

  const capped = calculateNextV(1000, 2000, 100, 1, 0);
  nearlyEqual(capped, 115);
  assert.deepEqual(detectVECapActivation(capped, 100, 1000, 2000, 1, 0), {
    capActive: true,
    uncappedV: 2550,
  });

  assert.equal(calculateNextV(123, 999, 456, 0, 111), 123);
  assert.equal(calculateNextV(-100, 0, 0, 1, 0), 0.01);
}

function testBandCompressionAndAdaptiveBands() {
  assert.deepEqual(calculateBandCompressionFactor(100, 100), {
    compressionFactor: 1,
    divergenceRatio: 0,
    divergenceDirection: 'neutral',
  });

  const over = calculateBandCompressionFactor(130, 100);
  nearlyEqual(over.divergenceRatio, 0.3);
  assert.equal(over.divergenceDirection, 'over');
  nearlyEqual(over.compressionFactor, 1 - ((0.3 - 0.05) / (0.5 - 0.05)));

  const plainBands = calculateBands(1000, 100, false);
  assert.deepEqual(plainBands, { LBand: 850, HBand: 1150 });

  const adaptive = calculateAdaptiveBands(130, 100);
  nearlyEqual(adaptive.bandLowerRatio, 0.85 + (0.92 - 0.85) * (1 - over.compressionFactor));
  nearlyEqual(adaptive.bandUpperRatio, 1.15 + (1.08 - 1.15) * (1 - over.compressionFactor));
  nearlyEqual(adaptive.LBand, adaptive.bandLowerRatio * 130);
  nearlyEqual(adaptive.HBand, adaptive.bandUpperRatio * 130); // inversion guard falls back to V anchor
}

function testTablesAndTargets() {
  assert.deepEqual(calculateSimpleTargets(3.9, 850, 1150), {
    buyTargetPrice: round2(850 / 4),
    sellTargetPrice: round2(1150 / 2),
  });
  assert.deepEqual(calculateSimpleTargets(1, 850, 1150), {
    buyTargetPrice: 425,
    sellTargetPrice: 1150,
  });

  assert.deepEqual(calculateBuyTable(300, 1, 500, 100, 3), [
    { targetShares: 2, limitPrice: 150, remainingCash: 350 },
    { targetShares: 3, limitPrice: 100, remainingCash: 250 },
    { targetShares: 4, limitPrice: 75, remainingCash: 175 },
  ]);

  assert.deepEqual(calculateSellTable(300, 2, 90, 10, 3), [
    { targetShares: 1, threshold: 300, cumulativeProceeds: 100 },
    { targetShares: 0, threshold: 300, cumulativeProceeds: 190 },
  ]);
}

function testNormalizeHistoryUsesPythonCompatibleSnakeCase() {
  const normalized = normalizeHistoryEntry({
    cycle_num: 1,
    V_target: 130,
    V_i: 100,
    LBand: 0,
    HBand: 0,
    shares_end: 1,
    pool_end_before_deposit: 10,
    deposit_next: 20,
    price_end: 100,
    G: 10,
    E_calc: 100,
    ve_divergence_ratio: undefined,
    band_compression_factor: undefined,
  });

  assert.equal(normalized.adaptive_band_enabled, false);
  nearlyEqual(normalized.ve_divergence_ratio, 0.3);
  assert.equal(normalized.ve_divergence_direction, 'over');
  nearlyEqual(normalized.band_compression_factor, 1 - ((0.3 - 0.05) / (0.5 - 0.05)));
  assert.equal(normalized.veDivergenceRatio, normalized.ve_divergence_ratio);
  assert.equal(normalized.bandCompressionFactor, normalized.band_compression_factor);
}

function testPortfolioSummaryUsesSnakeCaseDivergence() {
  const summary = calculatePortfolioSummary([
    { E_calc: 1000, V_target: 1000, deposit_next: 100, shares_end: 10, ve_divergence_ratio: 0.1 },
    { E_calc: 1250, V_target: 1200, deposit_next: 100, shares_end: 12, ve_divergence_ratio: 0.2 },
  ]);

  assert.equal(summary.totalCycles, 2);
  assert.equal(summary.totalDeposits, 200);
  nearlyEqual(summary.roi, ((1250 - 1200) / 1200) * 100);
  nearlyEqual(summary.vGrowth, 20);
  nearlyEqual(summary.avgDivergence, 15);
  assert.equal(summary.sharesChange, 2);
}

const tests = [
  testCalculateNextVFormulaAndCap,
  testBandCompressionAndAdaptiveBands,
  testTablesAndTargets,
  testNormalizeHistoryUsesPythonCompatibleSnakeCase,
  testPortfolioSummaryUsesSnakeCaseDivergence,
];

for (const test of tests) {
  test();
}

console.log(`PASS ${tests.length} vrCalculations regression groups`);
