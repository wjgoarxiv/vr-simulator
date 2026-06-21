import { useState, useRef } from 'react';
import { parseCSV } from '../utils/csvHandling';
import { normalizeHistoryEntry } from '../utils/vrCalculations';

export default function InitialSetup({ onStart, tickerName }) {
  const [useCSV, setUseCSV] = useState(false);
  const [shares, setShares] = useState(1);
  const [price, setPrice] = useState(60);
  const [pool, setPool] = useState(1000);
  const [csvStatus, setCsvStatus] = useState(null);
  const [deadStateWarning, setDeadStateWarning] = useState(false);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) { setCsvStatus(null); return; }

    const isLikelyCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isLikelyCSV) {
      setCsvStatus({ type: 'error', message: 'CSV 파일(.csv)만 불러올 수 있습니다.', records: [] });
      return;
    }

    if (file.size === 0) {
      setCsvStatus({ type: 'error', message: 'CSV 파일이 비어 있습니다.', records: [] });
      return;
    }

    setCsvStatus({ type: 'loading', message: 'CSV 파일 검증 중...', records: [] });

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = parseCSV(evt.target.result);
      if (result.success) {
        const normalized = result.records.map((rec) => normalizeHistoryEntry(rec));
        setCsvStatus({ type: 'success', message: `${normalized.length}개 사이클 기록 로드 완료`, records: normalized });
      } else {
        setCsvStatus({ type: 'error', message: result.error, records: [] });
      }
    };
    reader.onerror = () => {
      setCsvStatus({ type: 'error', message: 'CSV 파일을 읽는 중 오류가 발생했습니다.', records: [] });
    };
    reader.readAsText(file);
  }

  function handleStart() {
    setDeadStateWarning(false);
    if (useCSV) {
      if (!csvStatus || csvStatus.type !== 'success' || csvStatus.records.length === 0) return;
      onStart({ history: csvStatus.records, fromCSV: true });
      return;
    }
    if (shares === 0 && pool === 0) { setDeadStateWarning(true); return; }
    onStart({ shares, price, pool, history: null, fromCSV: false });
  }

  const startDisabled = useCSV && (!csvStatus || csvStatus.type !== 'success');

  return (
    <div className="hero-cockpit animate-section">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-accent-cyan/20 bg-accent-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-accent-cyan">
            OFFICIAL VALUE REBALANCING · 2026 HUD
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.03em] text-tx-primary md:text-6xl">
              Build the next cycle before the market moves.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-tx-secondary">
              공식 VR ±15% 밴드를 기본으로, 매수·매도 대기 상태와 다음 주문가를 cockpit처럼 한 화면에서 추적합니다.
            </p>
          </div>
        </div>
        <div className="motion-safe-float hidden lg:flex justify-center">
          <div className="orbit-gauge">
            <div className="text-center">
              <div className="font-display text-4xl font-bold text-accent-cyan">VR</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-tx-muted">±15 BAND</div>
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-divider mt-7">
        <span className="terminal-divider-label">INITIALIZE</span>
      </div>

      {/* CSV toggle */}
      <label className="flex items-center gap-2 cursor-pointer mb-4 mt-2">
        <div
          className={`w-3 h-3 rounded-sm border ${useCSV ? 'bg-accent-cyan border-accent-cyan' : 'border-border-active bg-surface-0'}`}
          role="checkbox"
          aria-checked={useCSV}
        />
        <input
          type="checkbox"
          checked={useCSV}
          onChange={(e) => {
            setUseCSV(e.target.checked);
            setCsvStatus(null);
            setDeadStateWarning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="sr-only"
        />
        <span className="font-mono text-xs text-tx-secondary uppercase tracking-wider">CSV 파일에서 불러오기</span>
      </label>

      {useCSV ? (
        <div className="space-y-3">
          {/* CSV drop zone */}
          <div
            className="border border-dashed border-border-active rounded-sm p-6 flex flex-col items-center gap-2 cursor-pointer
                       hover:border-accent-cyan/40 hover:bg-accent-cyan/5 transition-all duration-200"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="font-mono text-xs text-tx-muted">[ SELECT FILE ]</span>
            <span className="text-xs text-tx-muted">CSV 파일을 선택하세요</span>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>

          {csvStatus && (
            <div
              className={
                csvStatus.type === 'success'
                  ? 'alert-success'
                  : csvStatus.type === 'loading'
                  ? 'alert-info'
                  : 'alert-danger'
              }
              aria-live="polite"
            >
              <span className="font-mono text-xs">{csvStatus.message}</span>
              {csvStatus.type === 'success' && (
                <p className="text-xs text-tx-secondary mt-1">
                  분석 종목: <span className="font-mono text-accent-cyan">{tickerName}</span>
                </p>
              )}
            </div>
          )}

          <div className="alert-info">
            <span className="font-mono text-xs">필수 컬럼: cycle_num, V_target, LBand, HBand, shares_end, pool_end_before_deposit, deposit_next, price_end, G, E_calc, V_i</span>
          </div>

          {!csvStatus && (
            <div className="alert-info">
              <span className="font-mono text-xs">이전 기록 CSV가 없다면 수동 입력으로 시작하세요.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-mono text-xs text-tx-muted">
            <span className="text-accent-cyan">{tickerName}</span> 초기값 입력
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="data-label block mb-1">주식 수</label>
              <input
                type="number" className="input-field" value={shares}
                onChange={(e) => { setShares(parseInt(e.target.value, 10) || 0); setDeadStateWarning(false); }}
                min={0} step={1}
              />
            </div>
            <div>
              <label className="data-label block mb-1">가격 ($)</label>
              <input
                type="number" className="input-field" value={price}
                onChange={(e) => { setPrice(parseFloat(e.target.value) || 0); setDeadStateWarning(false); }}
                min={0.01} step={0.01}
              />
            </div>
            <div>
              <label className="data-label block mb-1">예수금 ($)</label>
              <input
                type="number" className="input-field" value={pool}
                onChange={(e) => { setPool(parseFloat(e.target.value) || 0); setDeadStateWarning(false); }}
                min={0} step={0.01}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dead state warning */}
      {deadStateWarning && (
        <div className="alert-warning mt-3">
          <span className="font-mono text-xs">
            ⚠ 보유 주식 0주 + 예수금 $0은 시뮬레이션을 시작할 수 없습니다. 예수금을 입력해 주세요.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={startDisabled}
        className="btn-primary w-full mt-5 font-mono uppercase tracking-[0.22em]"
      >
        → 시뮬레이션 시작
      </button>
    </div>
  );
}
