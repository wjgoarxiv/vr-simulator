import assert from 'node:assert/strict';
import { parseCSV, exportCSV, serializeTableCSV } from '../src/utils/csvHandling.js';

const requiredHeader = [
  'cycle_num', 'V_target', 'LBand', 'HBand', 'shares_end',
  'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i',
].join(',');

const validRow = '0,1000,850,1150,10,400,250,60,10,1000,1000';
const validCsv = `${requiredHeader}\n${validRow}`;

function test(name, fn) {
  try {
    awaitMaybe(fn);
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function awaitMaybe(fn) {
  const result = fn();
  if (result && typeof result.then === 'function') {
    throw new Error('Async tests are not supported by this tiny runner.');
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('parseCSV returns records for a valid minimal history CSV', () => {
  const result = parseCSV(validCsv);
  assert.equal(result.success, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].cycle_num, 0);
  assert.equal(result.records[0].price_end, 60);
});

test('parseCSV rejects empty input', () => {
  const result = parseCSV('   \n');
  assert.equal(result.success, false);
  assert.match(result.error, /데이터가 없습니다/);
});

test('parseCSV rejects missing required columns with the missing names', () => {
  const result = parseCSV('cycle_num,V_target\n0,1000');
  assert.equal(result.success, false);
  assert.match(result.error, /필요한 컬럼/);
  assert.match(result.error, /price_end/);
});

test('parseCSV rejects partial numeric strings instead of truncating them', () => {
  const result = parseCSV(`${requiredHeader}\n0,1000abc,850,1150,10,400,250,60,10,1000,1000`);
  assert.equal(result.success, false);
  assert.match(result.error, /2행/);
  assert.match(result.error, /V_target/);
});

test('parseCSV rejects non-integer cycle numbers', () => {
  const result = parseCSV(`${requiredHeader}\n0.5,1000,850,1150,10,400,250,60,10,1000,1000`);
  assert.equal(result.success, false);
  assert.match(result.error, /cycle_num/);
});

test('parseCSV rejects unquoted extra columns caused by malformed commas', () => {
  const result = parseCSV(`${requiredHeader}\n0,1000,850,1150,10,400,250,60,10,1000,1000,unexpected`);
  assert.equal(result.success, false);
  assert.match(result.error, /컬럼 수|Too many fields|TooManyFields|파싱 오류/);
});

test('parseCSV accepts optional adaptive metadata columns', () => {
  const csv = `${requiredHeader},adaptive_band_enabled,ve_cap_active,ve_divergence_ratio\n${validRow},true,0,0.15`;
  const result = parseCSV(csv);
  assert.equal(result.success, true);
  assert.equal(result.records[0].adaptive_band_enabled, true);
  assert.equal(result.records[0].ve_cap_active, false);
  assert.equal(result.records[0].ve_divergence_ratio, 0.15);
});

await testAsync('exportCSV emits a UTF-8 BOM and stable required headers', async () => {
  const { blob, filename } = exportCSV([{ cycle_num: 0, price_end: 60, extra_note: 'hello' }]);
  assert.match(filename, /^\d{8}_vr_simulation_history\.csv$/);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  const text = await blob.text();
  assert.match(text, /^cycle_num,V_target,LBand,HBand/);
  assert.match(text, /extra_note/);
});

test('serializeTableCSV escapes commas, quotes, and newlines in table exports', () => {
  const csv = serializeTableCSV(
    [{ label: 'A,B', note: 'line "one"\nline two' }],
    [
      { label: '목표 주식수', value: (row) => row.label },
      { label: '메모', value: (row) => row.note },
    ],
  );

  assert.match(csv, /^목표 주식수,메모\r?\n/);
  assert.match(csv, /"A,B"/);
  assert.match(csv, /"line ""one""\nline two"/);
});
