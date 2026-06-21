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

function testCalculateNextVFormula() {
  const V_i = 1000;
  const pool = 300;
  const E = 1100;
  const G = 9;
  const deposit = 250;
  const actual = calculateNextV(V_i, pool, E, G, deposit);
  const expected = V_i + pool / G + (E - V_i) / (2 * Math.sqrt(G)) + deposit;
  nearlyEqual(actual, expected);

  const highTargetResult = calculateNextV(1000, 2000, 100, 1, 0);
  nearlyEqual(highTargetResult, 2550);
  assert.deepEqual(detectVECapActivation(highTargetResult, 100, 1000, 2000, 1, 0), {
    capActive: false,
    uncappedV: null,
  });

  assert.equal(calculateNextV(123, 999, 456, 0, 111), 123);
  assert.equal(calculateNextV(-100, 0, 0, 1, 0), 0.01);
}

function testResourceGoldenFormula() {
  const V_i = 1166.58;
  const pool = 418.83;
  const E = 1022.70;
  const G = 10;
  const deposit = 100;

  nearlyEqual(round2(calculateNextV(V_i, pool, E, G, deposit)), 1285.71);
  const bands = calculateBands(1285.71, E, false);
  nearlyEqual(round2(bands.LBand), 1092.85);
  nearlyEqual(round2(bands.HBand), 1478.57);

  assert.deepEqual(calculateSimpleTargets(14, 1092.85, 1478.57), {
    buyTargetPrice: 78.06,
    sellTargetPrice: 105.61,
  });
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
    buyTargetPrice: round2(850 / 3),
    sellTargetPrice: round2(1150 / 3),
  });
  assert.deepEqual(calculateSimpleTargets(1, 850, 1150), {
    buyTargetPrice: 850,
    sellTargetPrice: 1150,
  });

  assert.deepEqual(calculateBuyTable(300, 1, 500, 100, 3), [
    { targetShares: 2, limitPrice: 300, remainingCash: 200 },
    { targetShares: 3, limitPrice: 150, remainingCash: 50 },
  ]);

  assert.deepEqual(calculateSellTable(300, 2, 90, 10, 3), [
    { targetShares: 1, threshold: 150, cumulativeProceeds: 160 },
    { targetShares: 0, threshold: 300, cumulativeProceeds: 460 },
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
  nearlyEqual(summary.initialAccountValue, 1100);
  nearlyEqual(summary.currentAccountValue, 1350);
  nearlyEqual(summary.roi, ((1350 - 1200) / 1200) * 100);
  nearlyEqual(summary.vGrowth, 20);
  nearlyEqual(summary.avgDivergence, 15);
  assert.equal(summary.sharesChange, 2);
}

const tests = [
  testCalculateNextVFormula,
  testResourceGoldenFormula,
  testBandCompressionAndAdaptiveBands,
  testTablesAndTargets,
  testNormalizeHistoryUsesPythonCompatibleSnakeCase,
  testPortfolioSummaryUsesSnakeCaseDivergence,
];

for (const test of tests) {
  test();
}

console.log(`PASS ${tests.length} vrCalculations regression groups`);
