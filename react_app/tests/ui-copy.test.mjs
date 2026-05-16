import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const userFacingFiles = [
  '../../app.py',
  '../src/components/CycleViewer.jsx',
];

const forbiddenUserCopy = [
  /V\/E\s+CAP\s+ACTIVE/i,
  /V\/E\s*상한\s*적용됨/,
  /원래\s*V\s*=/,
  /제한\s*V\s*=/,
  /적립금\s*기여분/,
  /흡수(?:되었습니다)?/,
];

test('target safety notice avoids formula-heavy user-facing jargon', () => {
  for (const file of userFacingFiles) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const pattern of forbiddenUserCopy) {
      assert.doesNotMatch(source, pattern, `${file} should not expose ${pattern}`);
    }
  }
});

test('target safety notice uses plain-language replacement copy on both app surfaces', () => {
  const react = readFileSync(new URL('../src/components/CycleViewer.jsx', import.meta.url), 'utf8');
  const streamlit = readFileSync(new URL('../../app.py', import.meta.url), 'utf8');

  for (const source of [react, streamlit]) {
    assert.match(source, /목표 V 자동 조정/);
    assert.match(source, /과도한 매수 신호/);
    assert.match(source, /안전장치/);
  }
});
