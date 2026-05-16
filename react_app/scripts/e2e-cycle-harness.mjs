#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  calculateAdaptiveBands,
  calculateBuyTable,
  calculateNextV,
  calculateSellTable,
  detectVECapActivation,
  normalizeHistoryEntry,
} from '../src/utils/vrCalculations.js';

const scenarios = [
  { label: 'balanced-start', price: 100, shares: 100, pool: 1500, deposit: 250, G: 10 },
  { label: 'drawdown-over-target', price: 62, shares: 100, pool: 5000, deposit: 250, G: 8 },
  { label: 'rebound-under-target', price: 145, shares: 112, pool: 750, deposit: 250, G: 12 },
  { label: 'cap-pressure', price: 40, shares: 40, pool: 25000, deposit: 1000, G: 2 },
];

let active = normalizeHistoryEntry({
  cycle_num: 0,
  V_target: scenarios[0].price * scenarios[0].shares,
  V_i: scenarios[0].price * scenarios[0].shares,
  E_calc: scenarios[0].price * scenarios[0].shares,
  LBand: 0,
  HBand: 0,
  shares_end: scenarios[0].shares,
  pool_end_before_deposit: scenarios[0].pool,
  deposit_next: scenarios[0].deposit,
  price_end: scenarios[0].price,
  G: scenarios[0].G,
  adaptive_band_enabled: true,
});

const rows = [];
for (let i = 1; i < scenarios.length; i += 1) {
  const scenario = scenarios[i];
  const E = scenario.price * scenario.shares;
  const V_next = calculateNextV(active.V_target, scenario.pool, E, scenario.G, scenario.deposit);
  const bands = calculateAdaptiveBands(V_next, E);
  const cap = detectVECapActivation(V_next, E, active.V_target, scenario.pool, scenario.G, scenario.deposit);
  const buys = calculateBuyTable(bands.LBand, scenario.shares, scenario.pool, scenario.price, 12);
  const sells = calculateSellTable(bands.HBand, scenario.shares, scenario.price, scenario.pool, 12);

  active = normalizeHistoryEntry({
    cycle_num: i,
    V_target: V_next,
    V_i: active.V_target,
    LBand: bands.LBand,
    HBand: bands.HBand,
    shares_end: scenario.shares,
    pool_end_before_deposit: scenario.pool,
    deposit_next: scenario.deposit,
    price_end: scenario.price,
    G: scenario.G,
    E_calc: E,
    adaptive_band_enabled: true,
    ve_divergence_ratio: bands.divergenceRatio,
    ve_divergence_direction: bands.divergenceDirection,
    band_compression_factor: bands.compressionFactor,
    band_lower_ratio: bands.bandLowerRatio,
    band_upper_ratio: bands.bandUpperRatio,
    ve_cap_active: cap.capActive,
    ve_cap_uncapped_v: cap.uncappedV,
  });

  assert.ok(Number.isFinite(active.V_target), `${scenario.label}: V_target finite`);
  assert.ok(active.HBand > active.LBand, `${scenario.label}: HBand > LBand`);
  assert.ok(Number.isFinite(active.ve_divergence_ratio), `${scenario.label}: divergence metadata finite`);
  assert.ok(active.band_compression_factor >= 0 && active.band_compression_factor <= 1);
  assert.ok(Array.isArray(buys) && Array.isArray(sells));

  rows.push({
    cycle: i,
    label: scenario.label,
    V: Number(active.V_target.toFixed(2)),
    E: Number(E.toFixed(2)),
    direction: active.ve_divergence_direction,
    compression: Number(active.band_compression_factor.toFixed(4)),
    cap: active.ve_cap_active,
    buyRows: buys.length,
    sellRows: sells.length,
  });
}

assert.equal(rows.some((row) => row.cap), true, 'expected one cap-pressure scenario');
console.table(rows);
console.log(`E2E PASS: simulated ${rows.length} adaptive cycles with finite bands, cap metadata, and buy/sell tables.`);
