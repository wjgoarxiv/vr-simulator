import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reactSource = readFileSync(new URL('../src/components/CycleViewer.jsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
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

const visibilitySurfaces = [
  extractBetween(streamlitSource, 'cycle_status = "매수 구간 진입"', '        # 매수/매도 신호 카드'),
  extractBetween(reactSource, 'const cycleStatus = canBuyNow', '      {/* Target V safety adjustment notice */}'),
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
  /목표를\s*안전하게\s*낮췄어요/,
  /현재\s*평가금보다\s*목표가\s*너무\s*높아지지\s*않도록\s*조정했어요/,
  /처음\s*계산된\s*목표/,
  /이번에\s*적용할\s*목표/,
  /다음\s*사이클에\s*무리한\s*매수\s*주문이\s*나오지\s*않아요/,
  /따로\s*조치할\s*필요는\s*없어요/,
];

test('target safety notice uses Toss-like plain Korean on both app surfaces', () => {
  for (const notice of targetSafetyNotices) {
    for (const pattern of requiredPlainCopy) {
      assert.match(notice, pattern);
    }
  }
});

test('cycle cockpit explains no-trade waiting and official mode on both surfaces', () => {
  for (const surface of visibilitySurfaces) {
    assert.match(surface, /밴드\s*안쪽\s*대기/);
    assert.match(surface, /첫\s*매수/);
    assert.match(surface, /첫\s*매도/);
    assert.match(surface, /OFFICIAL\s*±15%/);
    assert.match(surface, /Band\s*[÷/]\s*현재\s*보유주식/);
  }
});

test('legacy React storage migration resets v3.1 adaptive default to official mode', () => {
  assert.match(appSource, /LEGACY_STORAGE_KEYS\s*=\s*\['vr-simulator-state-v3\.1\.2'\]/);
  assert.match(appSource, /resetAdaptiveDefault:\s*key\s*!==\s*STORAGE_KEY/);
  assert.match(appSource, /v3\.1\.x auto-persisted adaptiveBandEnabled=true/);
});
