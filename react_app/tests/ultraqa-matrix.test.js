import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import {
  BASE_BAND_LOWER,
  BASE_BAND_UPPER,
  MIN_BAND_LOWER,
  MAX_BAND_UPPER,
  VE_DIVERGENCE_THRESHOLD,
  VE_MAX_DIVERGENCE,
  MAX_V_E_RATIO,
  VR_VERSION,
} from '../src/constants.js';
import {
  calculateAdaptiveBands,
  calculateBandCompressionFactor,
  calculateBands,
  calculateBuyTable,
  calculateNextV,
  calculateSellTable,
  calculateSimpleTargets,
  detectVECapActivation,
  normalizeHistoryEntry,
} from '../src/utils/vrCalculations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const FORMULA_CONSTANTS = {
  VR_VERSION,
  BASE_BAND_LOWER,
  BASE_BAND_UPPER,
  MIN_BAND_LOWER,
  MAX_BAND_UPPER,
  VE_DIVERGENCE_THRESHOLD,
  VE_MAX_DIVERGENCE,
  MAX_V_E_RATIO,
};

const ULTRAQA_MATRIX = [
  {
    name: 'baseline-balanced',
    V_i: 10000,
    pool: 2500,
    E: 10000,
    G: 10,
    deposit: 250,
    expectedDirection: 'neutral',
  },
  {
    name: 've-cap-overheated-target',
    V_i: 15000,
    pool: 12000,
    E: 8000,
    G: 2,
    deposit: 1000,
    expectedCapped: true,
    expectedDirection: 'over',
  },
  {
    name: 'negative-raw-floor',
    V_i: 100,
    pool: -5000,
    E: 0,
    G: 1,
    deposit: 0,
    expectedFloor: true,
    expectedDirection: 'neutral',
  },
  {
    name: 'zero-gradient-returns-current-target',
    V_i: 7777,
    pool: 500,
    E: 3000,
    G: 0,
    deposit: 250,
    expectedSameAsCurrent: true,
    expectedDirection: 'over',
  },
  {
    name: 'deep-undervaluation-compresses-to-min-band',
    V_i: 2000,
    pool: 100,
    E: 12000,
    G: 20,
    deposit: 0,
    expectedDirection: 'under',
  },
  {
    name: 'no-shares-cash-start',
    V_i: 5000,
    pool: 5000,
    E: 0,
    G: 10,
    deposit: 250,
    expectedDirection: 'neutral',
  },
];

function independentNextV({ V_i, pool, E, G, deposit }) {
  if (G <= 0) return V_i;
  const raw = V_i + pool / G + (E - V_i) / (2 * Math.sqrt(G)) + deposit;
  const capped = E > 0 && raw > E * MAX_V_E_RATIO ? E * MAX_V_E_RATIO : raw;
  return Math.max(capped, 0.01);
}

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

test('VR formula constants stay byte-aligned with app.py', () => {
  const appPy = readFileSync(resolve(repoRoot, 'app.py'), 'utf8');

  for (const [name, value] of Object.entries(FORMULA_CONSTANTS)) {
    const match = appPy.match(new RegExp(`^${name}\\s*=\\s*([^#\\n]+)`, 'm'));
    assert.ok(match, `${name} missing from app.py`);
    const pyValue = match[1].trim().replaceAll('"', '');
    assert.equal(String(value), pyValue, `${name} diverged between React and Streamlit`);
  }
});

test('UltraQA adversarial matrix preserves next-V formula behavior', () => {
  for (const row of ULTRAQA_MATRIX) {
    const actual = calculateNextV(row.V_i, row.pool, row.E, row.G, row.deposit);
    const expected = independentNextV(row);
    assertClose(actual, expected, 1e-9);

    if (row.expectedCapped) {
      assertClose(actual, row.E * MAX_V_E_RATIO, 1e-9);
    }
    if (row.expectedFloor) {
      assert.equal(actual, 0.01);
    }
    if (row.expectedSameAsCurrent) {
      assert.equal(actual, row.V_i);
    }
  }
});

test('adaptive bands retain inversion guard and documented compression bounds', () => {
  for (const row of ULTRAQA_MATRIX) {
    const V = calculateNextV(row.V_i, row.pool, row.E, row.G, row.deposit);
    const adaptive = calculateAdaptiveBands(V, row.E);
    const simple = calculateBands(V, row.E, false);
    const compression = calculateBandCompressionFactor(V, row.E);

    assert.equal(compression.divergenceDirection, row.expectedDirection, row.name);
    assert.ok(adaptive.HBand > adaptive.LBand, `${row.name} inverted bands`);
    assert.ok(adaptive.bandLowerRatio >= BASE_BAND_LOWER && adaptive.bandLowerRatio <= MIN_BAND_LOWER);
    assert.ok(adaptive.bandUpperRatio <= BASE_BAND_UPPER && adaptive.bandUpperRatio >= MAX_BAND_UPPER);
    assertClose(simple.LBand, BASE_BAND_LOWER * V);
    assertClose(simple.HBand, BASE_BAND_UPPER * V);
  }
});

test('targets and tables are finite and monotonic under edge inputs', () => {
  const bands = calculateAdaptiveBands(10000, 7200);
  const targets = calculateSimpleTargets(3.8, bands.LBand, bands.HBand);
  assert.ok(Number.isFinite(targets.buyTargetPrice));
  assert.ok(Number.isFinite(targets.sellTargetPrice));

  const buys = calculateBuyTable(bands.LBand, 3.8, 50000, 100, 8);
  assert.ok(buys.length > 0);
  for (let i = 1; i < buys.length; i += 1) {
    assert.ok(buys[i].targetShares > buys[i - 1].targetShares);
    assert.ok(buys[i].remainingCash < buys[i - 1].remainingCash);
  }

  const sells = calculateSellTable(bands.HBand, 5.1, 100, 250, 8);
  assert.ok(sells.length > 0);
  for (let i = 1; i < sells.length; i += 1) {
    assert.ok(sells[i].targetShares < sells[i - 1].targetShares);
    assert.ok(sells[i].cumulativeProceeds > sells[i - 1].cumulativeProceeds);
  }
});

test('history normalization backfills snake_case and camelCase adaptive metadata', () => {
  const normalizedFromSnake = normalizeHistoryEntry({
    V_target: 9200,
    E_calc: 8000,
    adaptive_band_enabled: true,
    ve_divergence_ratio: 0.15,
    ve_divergence_direction: 'over',
    band_compression_factor: 0.8,
    band_lower_ratio: 0.864,
    band_upper_ratio: 1.136,
  });

  assert.equal(normalizedFromSnake.adaptiveBandEnabled, true);
  assert.equal(normalizedFromSnake.veDivergenceRatio, 0.15);
  assert.equal(normalizedFromSnake.bandCompressionFactor, 0.8);

  const normalizedFromCamel = normalizeHistoryEntry({
    V_target: 7500,
    E_calc: 10000,
    adaptiveBandEnabled: true,
    veDivergenceRatio: 0.25,
    veDivergenceDirection: 'under',
    bandCompressionFactor: 0.5,
    bandLowerRatio: 0.885,
    bandUpperRatio: 1.115,
  });

  assert.equal(normalizedFromCamel.adaptive_band_enabled, true);
  assert.equal(normalizedFromCamel.ve_divergence_ratio, 0.25);
  assert.equal(normalizedFromCamel.band_compression_factor, 0.5);

  const computed = normalizeHistoryEntry({ V_target: 9200, E_calc: 8000 });
  assert.equal(computed.ve_divergence_direction, 'over');
  assert.equal(computed.veDivergenceDirection, 'over');
});

test('V/E cap detection reports only capped formula outputs', () => {
  const cappedInput = ULTRAQA_MATRIX.find((row) => row.expectedCapped);
  const cappedV = calculateNextV(cappedInput.V_i, cappedInput.pool, cappedInput.E, cappedInput.G, cappedInput.deposit);
  const capped = detectVECapActivation(cappedV, cappedInput.E, cappedInput.V_i, cappedInput.pool, cappedInput.G, cappedInput.deposit);
  assert.equal(capped.capActive, true);
  assert.ok(capped.uncappedV > cappedV);

  const base = ULTRAQA_MATRIX[0];
  const baseV = calculateNextV(base.V_i, base.pool, base.E, base.G, base.deposit);
  assert.equal(detectVECapActivation(baseV, base.E, base.V_i, base.pool, base.G, base.deposit).capActive, false);
});
