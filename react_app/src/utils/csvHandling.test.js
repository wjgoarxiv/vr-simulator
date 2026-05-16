import assert from 'node:assert/strict';
import test from 'node:test';
import { exportCSV, parseCSV } from './csvHandling.js';

const header = 'cycle_num,V_target,LBand,HBand,shares_end,pool_end_before_deposit,deposit_next,price_end,G,E_calc,V_i';
const validRow = '0,100,85,115,2,50,25,40,10,80,100';
const validCSV = `${header}\n${validRow}`;

test('parseCSV accepts a valid history row and coerces required numeric fields', () => {
  const result = parseCSV(validCSV);

  assert.equal(result.success, true);
  assert.equal(result.error, null);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].cycle_num, 0);
  assert.equal(result.records[0].price_end, 40);
});

test('parseCSV reports missing required columns with column names', () => {
  const result = parseCSV('cycle_num,V_target\n0,100');

  assert.equal(result.success, false);
  assert.match(result.error, /필요한 컬럼/);
  assert.match(result.error, /LBand/);
});

test('parseCSV rejects partial numeric values instead of parseFloat truncation', () => {
  const result = parseCSV(`${header}\n0,100abc,85,115,2,50,25,40,10,80,100`);

  assert.equal(result.success, false);
  assert.match(result.error, /2행/);
  assert.match(result.error, /V_target/);
});

test('parseCSV rejects malformed row shape from extra columns', () => {
  const result = parseCSV(`${header}\n${validRow},unexpected`);

  assert.equal(result.success, false);
  assert.match(result.error, /파싱 오류|컬럼 수/);
});

test('parseCSV validates domain constraints with row context', () => {
  const result = parseCSV(`${header}\n0,100,85,115,2,50,25,0,10,80,100`);

  assert.equal(result.success, false);
  assert.match(result.error, /2행/);
  assert.match(result.error, /price_end/);
});

test('parseCSV preserves optional adaptive columns with strict typing', () => {
  const csv = `${header},adaptive_band_enabled,ve_divergence_ratio\n${validRow},true,0.12`;
  const result = parseCSV(csv);

  assert.equal(result.success, true);
  assert.equal(result.records[0].adaptive_band_enabled, true);
  assert.equal(result.records[0].ve_divergence_ratio, 0.12);
});

test('exportCSV returns a header-only CSV for empty or invalid history arrays', async () => {
  const { blob, filename } = exportCSV(null);
  const text = await blob.text();

  assert.match(filename, /_vr_simulation_history\.csv$/);
  assert.match(text.split('\n')[0], /^cycle_num,V_target,LBand,HBand/);
});
