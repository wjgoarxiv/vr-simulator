import { useState, useRef } from 'react';
import { Upload, Play, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { parseCSV } from '../utils/csvHandling';
import { normalizeHistoryEntry } from '../utils/vrCalculations';

export default function InitialSetup({ onStart, tickerName }) {
  const [useCSV, setUseCSV] = useState(false);
  const [shares, setShares] = useState(1);
  const [price, setPrice] = useState(60);
  const [pool, setPool] = useState(1000);
  const [csvStatus, setCsvStatus] = useState(null); // { type: 'success'|'error', message: string, records: [] }
  const [deadStateWarning, setDeadStateWarning] = useState(false);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      setCsvStatus(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      const result = parseCSV(content);
      if (result.success) {
        const normalized = result.records.map((rec) => normalizeHistoryEntry(rec));
        setCsvStatus({
          type: 'success',
          message: `${normalized.length}개 사이클 기록 로드 완료`,
          records: normalized,
        });
      } else {
        setCsvStatus({ type: 'error', message: result.error, records: [] });
      }
    };
    reader.readAsText(file);
  }

  function handleStart() {
    setDeadStateWarning(false);

    if (useCSV) {
      if (!csvStatus || csvStatus.type !== 'success' || csvStatus.records.length === 0) {
        return;
      }
      onStart({ history: csvStatus.records, fromCSV: true });
      return;
    }

    // Dead state guard (V3.1.2)
    if (shares === 0 && pool === 0) {
      setDeadStateWarning(true);
      return;
    }

    onStart({ shares, price, pool, history: null, fromCSV: false });
  }

  const startDisabled = useCSV && (!csvStatus || csvStatus.type !== 'success');

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="section-title text-lg mb-4">1. 초기 설정</h2>

      {/* CSV 업로드 토글 */}
      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={useCSV}
          onChange={(e) => {
            setUseCSV(e.target.checked);
            setCsvStatus(null);
            setDeadStateWarning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="w-4 h-4 rounded border-vr-border bg-vr-bg accent-vr-blue"
        />
        <span className="text-sm text-vr-text">이전 기록 CSV 파일 사용하기</span>
      </label>

      {useCSV ? (
        <div className="flex flex-col gap-3">
          <label className="block text-xs text-vr-text2 mb-1">사이클 기록 CSV 파일 업로드</label>
          <div
            className="border-2 border-dashed border-vr-border rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-vr-blue/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-vr-text2" />
            <span className="text-sm text-vr-text2">CSV 파일을 선택하거나 여기에 드래그하세요</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {csvStatus && (
            <div className={csvStatus.type === 'success' ? 'alert-success' : 'alert-danger'}>
              <div className="flex items-center gap-2 text-sm">
                {csvStatus.type === 'success' ? (
                  <CheckCircle size={14} className="shrink-0" />
                ) : (
                  <XCircle size={14} className="shrink-0" />
                )}
                <span>{csvStatus.message}</span>
              </div>
              {csvStatus.type === 'success' && (
                <p className="text-xs mt-1 opacity-80">
                  분석 종목: <strong>{tickerName}</strong>. 필요한 경우 사이드바에서 변경하세요.
                </p>
              )}
            </div>
          )}

          {!csvStatus && (
            <div className="alert-info text-xs">
              이전 기록 CSV가 없다면, 아래 설정 후 '시뮬레이션 시작' 시 자동으로 생성/다운로드됩니다.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-vr-text2">
            <code className="bg-vr-accent px-1 rounded text-vr-blue">{tickerName}</code> 초기값 직접 입력:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-vr-text2 mb-1">초기 보유 주식 수</label>
              <input
                type="number"
                className="input-field text-sm"
                value={shares}
                onChange={(e) => {
                  setShares(parseInt(e.target.value, 10) || 0);
                  setDeadStateWarning(false);
                }}
                min={0}
                step={1}
              />
            </div>
            <div>
              <label className="block text-xs text-vr-text2 mb-1">현재 가격 ($)</label>
              <input
                type="number"
                className="input-field text-sm"
                value={price}
                onChange={(e) => {
                  setPrice(parseFloat(e.target.value) || 0);
                  setDeadStateWarning(false);
                }}
                min={0.01}
                step={0.01}
              />
            </div>
            <div>
              <label className="block text-xs text-vr-text2 mb-1">초기 예수금 ($)</label>
              <input
                type="number"
                className="input-field text-sm"
                value={pool}
                onChange={(e) => {
                  setPool(parseFloat(e.target.value) || 0);
                  setDeadStateWarning(false);
                }}
                min={0}
                step={0.01}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dead state warning */}
      {deadStateWarning && (
        <div className="alert-warning mt-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              보유 주식 0주 + 예수금 $0은 시뮬레이션을 시작할 수 없습니다. 예수금을 입력해 주세요.
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={startDisabled}
        className="btn-primary mt-4 flex items-center gap-2 w-full justify-center"
      >
        <Play size={16} />
        시뮬레이션 시작
      </button>
    </div>
  );
}
