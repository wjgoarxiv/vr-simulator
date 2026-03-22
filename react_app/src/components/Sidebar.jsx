import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getMarketStatus } from '../utils/marketStatus';
import { VE_DIVERGENCE_THRESHOLD, MAX_BAND_UPPER } from '../constants.js';

export default function Sidebar({
  simulationStarted,
  tickerName,
  setTickerName,
  currentG,
  setCurrentG,
  defaultDeposit,
  setDefaultDeposit,
  adaptiveBandEnabled,
  setAdaptiveBandEnabled,
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    currentTimeStr,
    marketStatusStr,
    dstStatusStr,
    isTradingNow,
    isReservationNow,
    holidayDisclaimer,
  } = getMarketStatus();

  return (
    <aside className="space-y-1 font-sans">

      {/* 시뮬레이션 설정 */}
      <div className="terminal-divider">
        <span className="terminal-divider-label">SETTINGS</span>
      </div>

      <div className="surface-panel">
        {!simulationStarted ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="data-label block mb-1">분석 종목명 / 티커</label>
              <input
                type="text"
                className="input-field"
                value={tickerName}
                onChange={(e) => setTickerName(e.target.value)}
                placeholder="예: TQQQ"
              />
            </div>
            <div>
              <label className="data-label block mb-1">
                초기 G 값 (Gradient)
                <span className="ml-1 text-tx-muted normal-case tracking-normal">(10~20 추천)</span>
              </label>
              <input
                type="number"
                className="input-field"
                value={currentG}
                onChange={(e) => setCurrentG(parseFloat(e.target.value) || 1)}
                min={1}
                step={0.1}
              />
            </div>
            <div>
              <label className="data-label block mb-1">기본 적립금 ($)</label>
              <input
                type="number"
                className="input-field"
                value={defaultDeposit}
                onChange={(e) => setDefaultDeposit(parseFloat(e.target.value) || 0)}
                min={0}
                step={1}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between py-1">
              <span className="data-label self-center">분석 종목</span>
              <span className="font-mono text-sm text-accent-cyan">{tickerName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="data-label self-center">현재 G 값</span>
              <span className="font-mono text-sm text-accent-cyan">{currentG}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="data-label self-center">현재 적립금</span>
              <span className="font-mono text-sm text-accent-cyan">
                ${Number(defaultDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 적응형 밴드 */}
      <div className="terminal-divider">
        <span className="terminal-divider-label">ADAPTIVE BAND</span>
      </div>

      <div className="surface-panel">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setAdaptiveBandEnabled(!adaptiveBandEnabled)}
          role="switch"
          aria-checked={adaptiveBandEnabled}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? setAdaptiveBandEnabled(!adaptiveBandEnabled) : null}
        >
          <span className={adaptiveBandEnabled ? 'status-led-on' : 'status-led-off'} />
          <span className="font-mono text-xs uppercase tracking-wider text-tx-primary">
            ADAPTIVE BAND
          </span>
        </div>
        <p className="text-xs text-tx-muted mt-2">
          {adaptiveBandEnabled
            ? `V/E 괴리율 ${VE_DIVERGENCE_THRESHOLD * 100}% 초과 시 밴드 자동 압축 (최대 \u00b1${((MAX_BAND_UPPER - 1.0) * 100).toFixed(0)}%)`
            : '기본 거래 범위 \u00b115% 적용 (완화 없음)'}
        </p>
      </div>

      {/* 미국 마켓 정보 */}
      <div className="terminal-divider">
        <span className="terminal-divider-label">MARKET STATUS</span>
      </div>

      <div className="surface-panel">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="data-label">KST</span>
            <span className="font-mono text-xs text-accent-cyan">{currentTimeStr}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="data-label">마켓 상태</span>
            <span className="font-mono text-xs text-tx-primary">{marketStatusStr}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="data-label">써머타임</span>
            <span className="font-mono text-xs text-tx-primary">{dstStatusStr}</span>
          </div>

          <div className="border-t border-border-default pt-2 mt-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className={isTradingNow ? 'status-led-on' : 'status-led-off'} />
              <span className="font-mono text-xs text-tx-secondary">
                {isTradingNow ? '정규장 거래 가능' : '정규장 거래 불가'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={isReservationNow ? 'status-led-on' : 'status-led-off'} />
              <span className="font-mono text-xs text-tx-secondary">
                {isReservationNow ? '예약 주문 가능' : '예약 주문 불가'}
              </span>
            </div>
          </div>

          <p className="text-xs text-tx-muted italic">{holidayDisclaimer}</p>
        </div>
      </div>

      {/* 도움말 및 VR 공식 */}
      <div className="terminal-divider">
        <span className="terminal-divider-label">HELP</span>
      </div>

      <div className="surface-panel">
        <button
          type="button"
          onClick={() => setHelpOpen(!helpOpen)}
          className="flex items-center justify-between w-full"
        >
          <span className="font-mono text-xs text-tx-muted uppercase tracking-wider">
            도움말 및 VR 공식
          </span>
          {helpOpen ? (
            <ChevronUp size={14} className="text-tx-muted" />
          ) : (
            <ChevronDown size={14} className="text-tx-muted" />
          )}
        </button>

        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: helpOpen ? '600px' : '0px' }}
        >
          <div className="mt-3 flex flex-col gap-3">
            <div className="alert-info text-xs">
              <p className="font-semibold mb-2">핵심 용어 설명</p>
              <ul className="flex flex-col gap-1">
                <li><span className="font-medium">V (목표 가치)</span>: 시스템이 목표로 하는 포지션 크기</li>
                <li><span className="font-medium">E (평가금)</span>: 현재 보유 주식 × 현재 주가 = 실제 자산 가치</li>
                <li><span className="font-medium">밴드</span>: 매수/매도를 할 수 있는 가격 범위 (LBand~HBand)</li>
                <li><span className="font-medium">G</span>: 기울기 계수 (10~20 추천)</li>
                <li><span className="font-medium">괴리율</span>: V와 E의 차이 비율 (0%가 이상적)</li>
              </ul>
            </div>

            <div className="surface-panel mt-1">
              <p className="data-label mb-2">VR 공식 (변형)</p>
              <p className="font-mono text-xs text-accent-cyan leading-relaxed">
                V_f = V_i + pool/G + (E - V_i) / (2&radic;G) + deposit
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-tx-secondary">
                <span><span className="text-tx-primary font-medium">V_f</span>: 다음 사이클 목표 가치</span>
                <span><span className="text-tx-primary font-medium">V_i</span>: 이전 사이클 목표 가치</span>
                <span><span className="text-tx-primary font-medium">pool</span>: 이전 사이클 종료 예수금 (적립금 추가 전)</span>
                <span><span className="text-tx-primary font-medium">G</span>: 그라데이션 값</span>
                <span><span className="text-tx-primary font-medium">E</span>: 이전 사이클 종료 평가금</span>
                <span><span className="text-tx-primary font-medium">deposit</span>: 다음 사이클 추가 적립금</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
