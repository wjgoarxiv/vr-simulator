import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reactSource = readFileSync(new URL('../src/components/CycleViewer.jsx', import.meta.url), 'utf8');
const streamlitSource = readFileSync(new URL('../../app.py', import.meta.url), 'utf8');

function extractBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start anchor: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing end anchor after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
}

const targetSafetyNotices = [
  extractBetween(streamlitSource, '# MOD-05: 목표 V 안전 조정 안내', '        st.markdown("**매수/매도 임계 참고:**")'),
  extractBetween(reactSource, '{/* Target V safety adjustment notice */}', '      {/* Trade Signals'),
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
  /기준:\s*현재\s*평가금/,
  /의미:\s*다음\s*사이클/,
];

test('target safety notice avoids formula-heavy user-facing jargon', () => {
  for (const notice of targetSafetyNotices) {
    for (const pattern of forbiddenUserCopy) {
      assert.doesNotMatch(notice, pattern, `target safety notice should not expose ${pattern}`);
    }
  }
});

const requiredPlainCopy = [
  /목표를\s*현실에\s*맞췄어요/,
  /처음\s*계산한\s*목표가\s*지금\s*평가금보다\s*높아서,\s*이번\s*사이클에\s*적용할\s*목표를\s*낮췄어요/,
  /처음\s*목표/,
  /적용\s*목표/,
  /지금\s*당장\s*무리해서\s*사라는\s*신호가\s*줄어들어요/,
];

test('target safety notice uses Toss-like plain Korean on both app surfaces', () => {
  for (const notice of targetSafetyNotices) {
    for (const pattern of requiredPlainCopy) {
      assert.match(notice, pattern);
    }
  }
});
