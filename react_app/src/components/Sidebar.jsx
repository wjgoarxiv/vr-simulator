import { useState } from 'react';
import { Activity, Settings, TrendingUp, HelpCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
    <aside className="w-72 shrink-0 flex flex-col gap-4 p-4 bg-vr-secondary border-r border-vr-border h-full overflow-y-auto">

      {/* 시뮬레이션 설정 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-vr-blue" />
          <span className="section-title text-base">시뮬레이션 설정</span>
        </div>

        {!simulationStarted ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-vr-text2 mb-1">분석 종목명/티커</label>
              <input
                type="text"
                className="input-field text-sm"
                value={tickerName}
                onChange={(e) => setTickerName(e.target.value)}
                placeholder="예: TQQQ"
              />
            </div>
            <div>
              <label className="block text-xs text-vr-text2 mb-1">
                초기 G 값 (Gradient)
                <span className="ml-1 text-vr-muted">(10~20 추천)</span>
              </label>
              <input
                type="number"
                className="input-field text-sm"
                value={currentG}
                onChange={(e) => setCurrentG(parseFloat(e.target.value) || 1)}
                min={1}
                step={0.1}
              />
            </div>
            <div>
              <label className="block text-xs text-vr-text2 mb-1">기본 적립금 ($)</label>
              <input
                type="number"
                className="input-field text-sm"
                value={defaultDeposit}
                onChange={(e) => setDefaultDeposit(parseFloat(e.target.value) || 0)}
                min={0}
                step={1}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-vr-text2">분석 종목</span>
              <span className="font-semibold text-vr-text">{tickerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vr-text2">현재 기준 G 값</span>
              <span className="font-semibold text-vr-text">{currentG}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vr-text2">현재 기준 적립금</span>
              <span className="font-semibold text-vr-text">
                ${Number(defaultDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 적응형 밴드 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-vr-blue" />
          <span className="section-title text-base">적응형 밴드</span>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-vr-text">적응형 밴드 활성화</span>
          <button
            type="button"
            role="switch"
            aria-checked={adaptiveBandEnabled}
            onClick={() => setAdaptiveBandEnabled(!adaptiveBandEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              adaptiveBandEnabled ? 'bg-vr-blue' : 'bg-vr-accent'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                adaptiveBandEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        <p className="text-xs text-vr-muted mt-2">
          {adaptiveBandEnabled
            ? `V/E 괴리율 ${VE_DIVERGENCE_THRESHOLD * 100}% 초과 시 밴드 자동 압축 (최대 \u00b1${((MAX_BAND_UPPER - 1.0) * 100).toFixed(0)}%)`
            : '기본 거래 범위 \u00b115% 적용 (완화 없음)'}
        </p>
      </div>

      {/* 미국 마켓 정보 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-vr-blue" />
          <span className="section-title text-base">미국 마켓 정보</span>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-vr-text2">현재 한국 시간</span>
            <span className="font-mono text-xs text-vr-text">{currentTimeStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-vr-text2">미국 마켓 상태</span>
            <span className="font-semibold text-vr-text">{marketStatusStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-vr-text2">써머타임</span>
            <span className="text-vr-text">{dstStatusStr}</span>
          </div>

          <div className="border-t border-vr-border pt-2 mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isTradingNow ? (
                <CheckCircle size={14} className="text-vr-green shrink-0" />
              ) : (
                <XCircle size={14} className="text-vr-red shrink-0" />
              )}
              <span className={`text-xs font-medium ${isTradingNow ? 'text-vr-green' : 'text-vr-red'}`}>
                {isTradingNow ? '정규장 거래 가능' : '정규장 거래 불가능'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isReservationNow ? (
                <CheckCircle size={14} className="text-vr-green shrink-0" />
              ) : (
                <XCircle size={14} className="text-vr-red shrink-0" />
              )}
              <span className={`text-xs font-medium ${isReservationNow ? 'text-vr-green' : 'text-vr-red'}`}>
                {isReservationNow ? '예약 주문 가능' : '예약 주문 불가능'}
              </span>
            </div>
          </div>

          <p className="text-xs text-vr-muted mt-1">{holidayDisclaimer}</p>
        </div>
      </div>

      {/* 도움말 및 VR 공식 */}
      <div className="card">
        <button
          type="button"
          onClick={() => setHelpOpen(!helpOpen)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-vr-blue" />
            <span className="section-title text-base">도움말 및 VR 공식</span>
          </div>
          {helpOpen ? (
            <ChevronUp size={16} className="text-vr-text2" />
          ) : (
            <ChevronDown size={16} className="text-vr-text2" />
          )}
        </button>

        {helpOpen && (
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

            <div className="bg-vr-bg border border-vr-border rounded-lg p-3">
              <p className="text-xs font-semibold text-vr-text2 mb-2">VR 공식 (변형):</p>
              <p className="font-mono text-xs text-vr-text leading-relaxed">
                V_f = V_i + pool/G + (E - V_i) / (2&radic;G) + deposit
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-vr-text2">
                <span><span className="text-vr-text font-medium">V_f</span>: 다음 사이클 목표 가치</span>
                <span><span className="text-vr-text font-medium">V_i</span>: 이전 사이클 목표 가치</span>
                <span><span className="text-vr-text font-medium">pool</span>: 이전 사이클 종료 예수금 (적립금 추가 전)</span>
                <span><span className="text-vr-text font-medium">G</span>: 그라데이션 값</span>
                <span><span className="text-vr-text font-medium">E</span>: 이전 사이클 종료 평가금</span>
                <span><span className="text-vr-text font-medium">deposit</span>: 다음 사이클 추가 적립금</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
