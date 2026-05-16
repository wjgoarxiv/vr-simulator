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
  /목표\s*V\s*자동\s*조정/,
  /계산된\s*목표가\s*현재\s*평가금보다\s*높아/,
  /안전\s*기준에\s*맞춰\s*낮췄습니다/,
  /과도한\s*매수\s*신호/,
  /안전장치/,
  /기준:\s*현재\s*평가금/,
  /의미:\s*다음\s*사이클/,
];

test('target safety notice avoids formula-heavy user-facing jargon', () => {
  for (const file of userFacingFiles) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const pattern of forbiddenUserCopy) {
      assert.doesNotMatch(source, pattern, `${file} should not expose ${pattern}`);
    }
  }
});

const requiredPlainCopy = [
  /목표를\s*안전하게\s*낮췄어요/,
  /현재\s*평가금보다\s*목표가\s*너무\s*높아지지\s*않도록\s*조정했어요/,
  /처음\s*계산된\s*목표/,
  /이번에\s*적용할\s*목표/,
  /다음\s*사이클에\s*무리한\s*매수\s*주문이\s*나오지\s*않아요/,
];

test('target safety notice uses Toss-like plain Korean on both app surfaces', () => {
  const react = readFileSync(new URL('../src/components/CycleViewer.jsx', import.meta.url), 'utf8');
  const streamlit = readFileSync(new URL('../../app.py', import.meta.url), 'utf8');

  for (const source of [react, streamlit]) {
    for (const pattern of requiredPlainCopy) {
      assert.match(source, pattern);
    }
  }
});
