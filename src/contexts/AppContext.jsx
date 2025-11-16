import React, { createContext, useContext, useState, useEffect } from 'react';

// Language context
const LanguageContext = createContext();
const ThemeContext = createContext();

// Translations
const translations = {
  'en': {
    // Header
    appTitle: 'VR Simulator V3.2.0',
    appSubtitle: 'Multi-Asset Value Rebalancing Investment Simulator',
    writtenBy: 'Written by',
    
    // Sidebar
    simulationSettings: 'Simulation Settings',
    initialGValue: 'Initial G Value (Gradient)',
    defaultDeposit: 'Default Deposit ($)',
    buyTablePoolRatio: 'Buy Table Pool Ratio',
    usMarketInfo: 'US Market Info',
    currentKoreaTime: 'Current Korea Time',
    usMarketStatus: 'US Market Status',
    dst: 'DST',
    regularTradingAvailable: 'Regular Trading Available',
    regularTradingUnavailable: 'Regular Trading Unavailable',
    reservationOrdersAvailable: 'Reservation Orders Available',
    reservationOrdersUnavailable: 'Reservation Orders Unavailable',
    helpAndFormula: 'Help & VR Formula',
    
    // Initial Setup
    initialSetup: 'Initial Setup',
    usePreviousCSV: 'Use Previous Record CSV File',
    uploadCSVFile: 'Upload Cycle Record CSV File',
    csvFileDescription: 'Click to select a CSV file with previous simulation history',
    processingCSV: 'Processing CSV file...',
    csvWarning: 'If you don\'t have a previous record CSV, uncheck the option above and manually enter initial values.',
    manualInput: 'Manual Initial Values Input',
    initialAssetShares: 'Initial Asset Shares',
    currentAssetPrice: 'Current Asset Price ($)',
    initialPool: 'Initial Pool ($)',
    startResetSimulation: 'Start / Reset Simulation',
    
    // Cycle Navigation
    previousCycle: 'Previous Cycle',
    nextCycle: 'Next Cycle',
    
    // Cycle Display
    cycleReview: 'Review',
    currentlyViewing: 'Currently viewing',
    endOfPeriodRecord: 'end-of-period record.',
    startingInformation: 'Starting information for Cycle',
    startingStateAndTarget: 'Starting State & Target (Expected)',
    startingShares: 'Starting Shares',
    startingPool: 'Starting Pool',
    targetV: 'Target V',
    appliedGValue: 'Applied G Value',
    buysellTargetReference: 'Buy/Sell Target Reference',
    buyTarget: 'Buy Target (+1 share)',
    lBand: 'LBand',
    hBand: 'HBand',    sellTarget: 'Sell Target (-1 share)',
    sellNotAvailable: 'Sell not available (insufficient holdings or 1 share)',
    nextResetLower: 'Next Reset Lower (80% V)',
    nextResetUpper: 'Next Reset Upper (120% V)',
    poolCapLimitLabel: 'Pool Cap Limit',
    poolEffectiveLabel: 'V Calculation Pool',
    bandResetLowerMsg: 'Target V was reduced last cycle to stay within band.',
    bandResetUpperMsg: 'Target V was raised last cycle after exceeding the upper band.',
    mondayMorningBuy: 'Monday Morning Buy Consideration',
    mondayBuyWarning: 'Buy target price significantly differs from previous price. Consider market open purchase for the next trading day.',
    viewDetailedTables: 'View Detailed Buy/Sell Tables',
    detailedBuyTable: 'Detailed Buy Table',
    detailedSellTable: 'Detailed Sell Table',
    targetShares: 'Target Shares',
    buyPrice: 'Buy Price ($)',
    sellPrice: 'Sell Price ($)',
    totalPool: 'Total Pool ($)',
    noCalculatedTargets: 'No calculated targets available',
    showingFirst: 'Showing first',
    of: 'of',
    entries: 'entries',
    
    // Cycle Input
    resultsInput: 'Results Input',
    enterResults: 'Enter your investment results below. These should be the actual values at the end of this cycle period.',
    endPriceLabel: "End Price",
    endPriceHelp: "Enter the closing price of the stock at the end of this cycle",
    endSharesLabel: "End Shares",
    endSharesHelp: "Enter the number of shares you held at the end of this cycle",
    endPoolLabel: "End Pool",
    endPoolHelp: "Enter the amount of cash remaining in your pool",
    nextDepositLabel: "Next Deposit",
    nextDepositHelp: "Enter the amount you plan to deposit for the next cycle",    endPrice: 'End Price ($)',
    gradientValueG: "Gradient Value (G)",    endShares: 'End Shares',
    cycleInputHelp: "G represents the gradient factor. Higher G values make the strategy more aggressive (wider buy/sell bands), while lower G values make it more conservative (narrower bands). Recommended range: 5-20.",    endPool: 'End Pool ($)',
    nextDeposit: 'Next Deposit ($)',
    gValueForCycle: 'G Value for This Cycle',
    calculateNextCycle: 'Calculate Cycle',
    calculating: 'Calculating...',
    preview: 'Preview',
    portfolioValue: 'Portfolio Value (E)',
    totalPoolStart: 'Total Pool Start',
    applied: 'Applied',
    
    // Results Summary
    resultsS: 'Simulation Results Summary',
    downloadCSV: 'Download CSV',
    downloadCharts: 'Download Charts',
    simulationHistoryTable: 'Simulation History Table',
    simulationCharts: 'Simulation Charts',
    insufficientDataForCharts: 'At least 1 cycle progression is needed to display charts (requires 2+ data points).',
    
    // Chart titles
    valueBandTracking: 'Value Band Tracking',
    portfolioVsTarget: 'Portfolio Value (E) vs Target (V)',
    poolBalanceTrend: 'Pool Balance (Start of Cycle)',
    sharesHeldTrend: 'Shares Held Trend',
    
    // Table headers
    cycle: 'Cycle',
    startTargetV: 'Start V (V_i)',
    endPriceTable: 'End Price',
    endSharesTable: 'End Shares',
    endPoolTable: 'End Pool',
    portfolioE: 'Portfolio (E)',
    nextDepositTable: 'Next Deposit',
    appliedG: 'Applied G',
    nextTargetV: 'Next V (V_f)',
    nextLBand: 'Next LBand',
    nextHBand: 'Next HBand',
    
    // Common
    shares: 'shares',
    usd: 'USD',
    gradient: 'gradient',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Market Status
    marketOpen: 'Regular Market Open',
    marketClosed: 'Regular Market Closed',
    weekendClosed: 'Weekend Closed',
    active: 'Active',
    inactive: 'Inactive',
  },
  'ko': {
    // Header
    appTitle: 'VR 시뮬레이터 V3.2.0',
    appSubtitle: '다중 자산 밸류 리밸런싱 투자 시뮬레이터',
    writtenBy: '제작자',
    
    // Sidebar
    simulationSettings: '시뮬레이션 설정',
    initialGValue: '초기 G 값 (그라데이션)',
    defaultDeposit: '기본 적립금 ($)',
    buyTablePoolRatio: '매수 테이블 예수금 비율',
    usMarketInfo: '미국 마켓 정보',
    currentKoreaTime: '현재 한국 시간',
    usMarketStatus: '미국 마켓 상태',
    dst: '썸머타임',
    regularTradingAvailable: '정규장 거래 가능',
    regularTradingUnavailable: '정규장 거래 불가능',
    reservationOrdersAvailable: '예약 주문 가능',
    reservationOrdersUnavailable: '예약 주문 불가능',
    helpAndFormula: '도움말 및 VR 공식',
    
    // Initial Setup
    initialSetup: '초기 설정',
    usePreviousCSV: '이전 기록 CSV 파일 사용하기',
    uploadCSVFile: '사이클 기록 CSV 파일 업로드',
    csvFileDescription: '이전 시뮬레이션 기록이 있는 CSV 파일을 선택하세요',
    processingCSV: 'CSV 파일 처리 중...',
    csvWarning: '이전 기록 CSV가 없다면, 위 옵션을 해제하고 초기값을 직접 입력해주세요.',
    manualInput: '직접 초기값 입력',
    initialAssetShares: '초기 자산 보유 주식 수',
    currentAssetPrice: '현재 자산 가격 ($)',
    initialPool: '초기 예수금 ($)',
    startResetSimulation: '시뮬레이션 시작 / 재설정',
    
    // Cycle Navigation
    previousCycle: '이전 사이클',
    nextCycle: '다음 사이클',
    
    // Cycle Display
    cycleReview: '조회',
    currentlyViewing: '현재',
    endOfPeriodRecord: '의 종료 시점 기록을 보고 있습니다.',
    startingInformation: '사이클의 시작 정보',
    startingStateAndTarget: '시작 상태 및 목표 (예상)',
    startingShares: '시작 주식 수',
    startingPool: '시작 예수금',
    targetV: '목표 V',
    appliedGValue: '적용 G 값',
    buysellTargetReference: '매수/매도 목표 참고',
    buyTarget: '매수 목표 (+1주)',
    lBand: 'LBand',
    hBand: 'HBand',    sellTarget: '매도 목표 (-1주)',
    sellNotAvailable: '매도 불가 (보유량 부족 또는 1주)',
    nextResetLower: '다음 리셋 하한 (80% V)',
    nextResetUpper: '다음 리셋 상한 (120% V)',
    poolCapLimitLabel: '풀 한도',
    poolEffectiveLabel: 'V 계산 반영 예수금',
    bandResetLowerMsg: '직전 사이클에서 밴드 하단 이탈로 목표 V가 하향 조정되었습니다.',
    bandResetUpperMsg: '직전 사이클에서 밴드 상단 돌파 및 풀 한도로 목표 V가 상향 조정되었습니다.',
    mondayMorningBuy: '월요일 시초가 매수 고려',
    mondayBuyWarning: '매수 목표가가 이전 가격과 상당히 다릅니다. 다음 거래일 시초가 매수를 고려해보세요.',
    viewDetailedTables: '상세 매수/매도 테이블 보기',
    detailedBuyTable: '상세 매수표',
    detailedSellTable: '상세 매도표',
    targetShares: '목표 주식수',
    buyPrice: '매수가 ($)',
    sellPrice: '매도가 ($)',
    totalPool: '총 예수금 ($)',
    noCalculatedTargets: '계산된 목표 없음',
    showingFirst: '처음',
    of: '/',
    entries: '개 항목 표시',
    
    // Cycle Input
    resultsInput: '결과 입력',
    enterResults: '이번 사이클의 투자 결과를 아래에 입력해주세요. 사이클 종료 시점의 실제 값이어야 합니다.',
    endPriceLabel: "종료 가격",
    endPriceHelp: "이번 사이클 종료 시점의 주식 종가를 입력하세요",
    endSharesLabel: "종료 주식 수",
    endSharesHelp: "이번 사이클 종료 시점에 보유한 주식 수를 입력하세요",
    endPoolLabel: "종료 예수금",
    endPoolHelp: "이번 사이클 종료 시점의 보유 현금을 입력하세요",
    nextDepositLabel: "다음 입금액",
    nextDepositHelp: "다음 사이클을 위해 입금할 금액을 입력하세요",    endPrice: '종료 시점 가격 ($)',
    gradientValueG: "그라디언트 값 (G)",    endShares: '종료 시점 보유 주식 수',
    cycleInputHelp: "G는 그라디언트 계수를 의미합니다. G 값이 클수록 전략이 더 공격적이 되고(매수/매도 밴드가 넓어짐), G 값이 작을수록 더 보수적이 됩니다(밴드가 좁아짐). 권장 범위: 5-20.",    endPool: '종료 시점 예수금 ($)',
    nextDeposit: '다음 사이클 적립금 ($)',
    gValueForCycle: '이번 사이클 적용 G 값',
    calculateNextCycle: '사이클 계산하기',
    calculating: '계산 중...',
    preview: '미리보기',
    portfolioValue: '포트폴리오 가치 (E)',
    totalPoolStart: '총 시작 예수금',
    applied: '적용된',
    
    // Results Summary
    resultsS: '시뮬레이션 결과 요약',
    downloadCSV: 'CSV 다운로드',
    downloadCharts: '차트 다운로드',
    simulationHistoryTable: '시뮬레이션 기록 테이블',
    simulationCharts: '시뮬레이션 차트',
    insufficientDataForCharts: '차트 표시를 위해서는 최소 1회의 사이클 진행이 필요합니다 (2개 이상의 데이터 포인트 필요).',
    
    // Chart titles
    valueBandTracking: '가치 밴드 추적',
    portfolioVsTarget: '포트폴리오 가치 (E) vs 목표 (V)',
    poolBalanceTrend: '예수금 잔액 (사이클 시작)',
    sharesHeldTrend: '보유 주식 추이',
    
    // Table headers
    cycle: '사이클',
    startTargetV: '시작 목표 V (V_i)',
    endPriceTable: '종료 가격',
    endSharesTable: '종료 주식수',
    endPoolTable: '종료 예수금(적립전)',
    portfolioE: '평가금(E)',
    nextDepositTable: '다음 적립금',
    appliedG: '적용 G',
    nextTargetV: '다음 목표 V (V_f)',
    nextLBand: '다음 LBand',
    nextHBand: '다음 HBand',
    
    // Common
    shares: '주',
    usd: '달러',
    gradient: '그라데이션',
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    
    // Market Status
    marketOpen: '정규장 운영 중',
    marketClosed: '정규장 종료',
    weekendClosed: '주말 휴장',
    active: '적용 중',
    inactive: '미적용',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('vr-simulator-language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('vr-simulator-language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('vr-simulator-theme');
    // Check for version compatibility, default to dark theme for V3.2.0
    const savedVersion = localStorage.getItem('vr-simulator-theme-version');
    if (savedVersion !== '3.2.0') {
      localStorage.setItem('vr-simulator-theme-version', '3.2.0');
      return 'dark'; // Default to dark for V3.2.0
    }
    return saved || 'dark'; // Default to dark theme
  });

  useEffect(() => {
    localStorage.setItem('vr-simulator-theme', theme);
    localStorage.setItem('vr-simulator-theme-version', '3.2.0');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
