import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/AppContext';
import { Calculator } from 'lucide-react';
import { useVRContext } from '../App';
import {
  calculateNextV,
  calculateBands,
  enforcePoolCap,
  applyBandReset,
  normalizeHistoryEntry,
  POOL_CAP_RATIO
} from '../utils/vrCalculations';

export function CycleInput() {
  const { t } = useLanguage();  const {
    history,
    setHistory,
    viewCycleIndex,
    setViewCycleIndex,
    currentG,
    setCurrentG,
    defaultDeposit,
    setDefaultDeposit,
    selectedAsset
  } = useVRContext();

  const activeState = history[viewCycleIndex];
  const inputCycleNum = activeState.cycle_num + 1;

  // Form state
  const [priceEnd, setPriceEnd] = useState(activeState.price_end);
  const [sharesEnd, setSharesEnd] = useState(activeState.shares_end);
  const [poolEnd, setPoolEnd] = useState(activeState.pool_end_before_deposit);
  const [depositNext, setDepositNext] = useState(defaultDeposit);
  const [gInput, setGInput] = useState(currentG);
  const [isCalculating, setIsCalculating] = useState(false);

  const computedPreview = useMemo(() => {
    const E_calc = sharesEnd * priceEnd;
    const poolEndBeforeDeposit = poolEnd;
    const V_i_calc = activeState.V_target;
    const { effectivePool, capLimit } = enforcePoolCap(poolEndBeforeDeposit, E_calc);
    const V_candidate = calculateNextV(
      V_i_calc,
      effectivePool,
      E_calc,
      gInput,
      depositNext
    );
    const { V_adjusted, resetType, bandResetRangeMin, bandResetRangeMax } = applyBandReset(
      V_candidate,
      E_calc,
      poolEndBeforeDeposit,
      capLimit
    );
    const { LBand: L_next, HBand: H_next } = calculateBands(V_adjusted);

    return {
      E_calc,
      poolEndBeforeDeposit,
      V_i_calc,
      effectivePool,
      capLimit,
      poolExcess: Math.max(poolEndBeforeDeposit - effectivePool, 0),
      V_next: V_adjusted,
      L_next,
      H_next,
      resetType,
      bandResetRangeMin,
      bandResetRangeMax
    };
  }, [sharesEnd, priceEnd, poolEnd, depositNext, gInput, activeState.V_target]);

  const handleCalculateNext = () => {
    console.log('Calculate Next button clicked');
    console.log('Input values:', { priceEnd, sharesEnd, poolEnd, depositNext, gInput });
    console.log('Active state:', activeState);
    
    setIsCalculating(true);
    
    // Simulate brief calculation delay for UX
    setTimeout(() => {
      try {
        const nextValues = computedPreview;

        console.log('Calculated values:', nextValues);

        const newState = {
          cycle_num: inputCycleNum,
          price_end: priceEnd,
          shares_end: sharesEnd,
          pool_end_before_deposit: poolEnd,
          deposit_next: depositNext,
          G: gInput,
          V_target: nextValues.V_next,
          E_calc: nextValues.E_calc,
          V_i: nextValues.V_i_calc,
          LBand: nextValues.L_next,
          HBand: nextValues.H_next,
          pool_cap_limit: nextValues.capLimit,
          pool_effective_for_v: nextValues.effectivePool,
          pool_cap_ratio_used: POOL_CAP_RATIO,
          band_reset_range_min: nextValues.bandResetRangeMin,
          band_reset_range_max: nextValues.bandResetRangeMax,
          band_reset_type: nextValues.resetType,
          // Legacy fields for compatibility
          E_end: nextValues.E_calc,
          sellTargets: [],
          buyTargets: [],
          sellTable: [],
          buyTable: []
        };

        const normalizedState = normalizeHistoryEntry(newState);

        console.log('New state created:', newState);

        // Update history and move to view new cycle
        const newHistory = [...history, normalizedState];
        console.log('New history:', newHistory);
        
        setHistory(newHistory);
        setViewCycleIndex(newHistory.length - 1);
        setCurrentG(gInput);
        setDefaultDeposit(depositNext);
        
        console.log('State updated successfully');

      } catch (error) {
        console.error('Calculation error:', error);
        alert('Error calculating next cycle. Please check your inputs.');
      } finally {
        setIsCalculating(false);
      }
    }, 500);
  };

  const isValid = priceEnd > 0 && sharesEnd >= 0 && poolEnd >= 0 && depositNext >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('cycle')} {inputCycleNum} {t('cycleInputTitle')}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Current Values Display */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('currentCycleSummary')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('cycle')}: </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">{activeState.cycle_num}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('vTarget')}: </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.V_target.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('lBand')}: </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.LBand?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('hBand')}: </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">${activeState.HBand?.toFixed(2) || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('endPriceLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={priceEnd}
              onChange={(e) => setPriceEnd(parseFloat(e.target.value) || 10.0)}
              min="0.01"
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('endPriceHelp')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('endSharesLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={sharesEnd}
              onChange={(e) => setSharesEnd(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              step="1.0"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('endSharesHelp')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('endPoolLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={poolEnd}
              onChange={(e) => setPoolEnd(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('endPoolHelp')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nextDepositLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={depositNext}
              onChange={(e) => setDepositNext(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('nextDepositHelp')}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('gradientValueG')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={gInput}
              onChange={(e) => setGInput(parseFloat(e.target.value) || 10.0)}
              min="1.0"
              
              step="0.1"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('cycleInputHelp')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleCalculateNext}
            disabled={!isValid || isCalculating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('calculating')}
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                {t('calculateNextCycle')}
              </>
            )}
          </button>

          {!isValid && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <span>{t('fillAllFields')}</span>
            </div>
          )}
        </div>

        {/* Preview Calculation */}
        {isValid && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Preview Calculation
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <div>Equity Value (E): ${(sharesEnd * priceEnd).toLocaleString()}</div>
              <div>Total Pool + Deposit: ${(poolEnd + depositNext).toLocaleString()}</div>
              <div>
                Pool Cap Limit ({(POOL_CAP_RATIO * 100).toFixed(0)}% of E): ${computedPreview.capLimit.toFixed(2)}
                {computedPreview.poolExcess > 0 && (
                  <span className="ml-2 text-red-500 dark:text-red-300">
                    (Only ${computedPreview.effectivePool.toFixed(2)} used for V)
                  </span>
                )}
              </div>
              <div>
                Next Reset Watch Range: ${computedPreview.bandResetRangeMin.toFixed(2)} ~ ${computedPreview.bandResetRangeMax.toFixed(2)}
              </div>
              {computedPreview.resetType !== 'none' && (
                <div className="text-yellow-700 dark:text-yellow-300">
                  {computedPreview.resetType === 'lower'
                    ? 'V will be reduced to keep portfolio within band.'
                    : 'V will be raised because portfolio exceeded the upper band with full pool.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
