/**
 * Configuration for supported assets in the VR simulator
 * Each asset includes metadata and default parameters for Value Rebalancing
 */

export const SUPPORTED_ASSETS = {
  // 3x Leveraged Technology ETFs
  TQQQ: {
    symbol: 'TQQQ',
    name: 'ProShares UltraPro QQQ',
    description: '3x leveraged NASDAQ-100 ETF',
    category: 'Technology',
    leverage: '3x',
    underlying: 'QQQ (NASDAQ-100)',
    expense_ratio: '0.95%',
    avg_volume: '50M+',
    volatility: 'Very High',
    defaultPrice: 36.62,
    color: '#00D4AA',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/TQQQ', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/TQQQ:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/tqqq', color: '#0F9D58' },
      { name: 'ProShares', url: 'https://www.proshares.com/funds/tqqq.html', color: '#DB4437' }
    ]
  },
  TECL: {
    symbol: 'TECL',
    name: 'Direxion Daily Technology Bull 3X Shares',
    description: '3x leveraged Technology Select Sector SPDR Fund',
    category: 'Technology',
    leverage: '3x',
    underlying: 'XLK (Technology Select Sector)',
    expense_ratio: '1.02%',
    avg_volume: '10M+',
    volatility: 'Very High',
    defaultPrice: 45.80,
    color: '#FF6B6B',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/TECL', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/TECL:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/tecl', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/tecl', color: '#FF9500' }
    ]
  },
  SOXL: {
    symbol: 'SOXL',
    name: 'Direxion Daily Semiconductor Bull 3X Shares',
    description: '3x leveraged Semiconductor ETF',
    category: 'Technology',
    leverage: '3x',
    underlying: 'SOXX (Semiconductors)',
    expense_ratio: '1.12%',
    avg_volume: '25M+',
    volatility: 'Very High',
    defaultPrice: 28.45,
    color: '#4ECDC4',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/SOXL', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/SOXL:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/soxl', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/soxl', color: '#FF9500' }
    ]
  },

  // 3x Leveraged Broad Market ETFs
  SPXL: {
    symbol: 'SPXL',
    name: 'Direxion Daily S&P 500 Bull 3X Shares',
    description: '3x leveraged S&P 500 ETF',
    category: 'Broad Market',
    leverage: '3x',
    underlying: 'SPY (S&P 500)',
    expense_ratio: '1.02%',
    avg_volume: '15M+',
    volatility: 'High',
    defaultPrice: 87.25,
    color: '#95E1D3',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/SPXL', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/SPXL:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/spxl', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/spxl', color: '#FF9500' }
    ]
  },
  UPRO: {
    symbol: 'UPRO',
    name: 'ProShares UltraPro S&P500',
    description: '3x leveraged S&P 500 ETF',
    category: 'Broad Market',
    leverage: '3x',
    underlying: 'SPY (S&P 500)',
    expense_ratio: '0.92%',
    avg_volume: '8M+',
    volatility: 'High',
    defaultPrice: 42.15,
    color: '#A8E6CF',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/UPRO', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/UPRO:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/upro', color: '#0F9D58' },
      { name: 'ProShares', url: 'https://www.proshares.com/funds/upro.html', color: '#DB4437' }
    ]
  },

  // 3x Leveraged Growth ETFs
  FNGU: {
    symbol: 'FNGU',
    name: 'MicroSectors FANG+ Index 3X Leveraged ETN',
    description: '3x leveraged FANG+ stocks (mega-cap tech)',
    category: 'Growth',
    leverage: '3x',
    underlying: 'FANG+ Index',
    expense_ratio: '0.95%',
    avg_volume: '5M+',
    volatility: 'Very High',
    defaultPrice: 38.90,
    color: '#FFB6C1',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/FNGU', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/FNGU:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/fngu', color: '#0F9D58' },
      { name: 'MicroSectors', url: 'https://www.microsectors.com/fngu', color: '#34A853' }
    ]
  },

  // 3x Leveraged Financial ETFs
  FAS: {
    symbol: 'FAS',
    name: 'Direxion Daily Financial Bull 3X Shares',
    description: '3x leveraged Financial Select Sector SPDR Fund',
    category: 'Financial',
    leverage: '3x',
    underlying: 'XLF (Financial Select Sector)',
    expense_ratio: '1.08%',
    avg_volume: '3M+',
    volatility: 'High',
    defaultPrice: 65.40,
    color: '#DDA0DD',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/FAS', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/FAS:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/fas', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/fas', color: '#FF9500' }
    ]
  },

  // 3x Leveraged Energy ETFs
  GUSH: {
    symbol: 'GUSH',
    name: 'Direxion Daily S&P Oil & Gas Exp. & Prod. Bull 2X Shares',
    description: '2x leveraged Oil & Gas Exploration & Production ETF',
    category: 'Energy',
    leverage: '2x',
    underlying: 'S&P Oil & Gas E&P Index',
    expense_ratio: '0.95%',
    avg_volume: '8M+',
    volatility: 'Very High',
    defaultPrice: 42.30,
    color: '#F0E68C',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/GUSH', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/GUSH:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/gush', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/gush', color: '#FF9500' }
    ]
  },

  // 3x Leveraged Small Cap ETFs
  TNA: {
    symbol: 'TNA',
    name: 'Direxion Daily Small Cap Bull 3X Shares',
    description: '3x leveraged Russell 2000 ETF',
    category: 'Small Cap',
    leverage: '3x',
    underlying: 'IWM (Russell 2000)',
    expense_ratio: '1.09%',
    avg_volume: '12M+',
    volatility: 'Very High',
    defaultPrice: 35.75,
    color: '#87CEEB',
    infoLinks: [
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/TNA', color: '#6B46C1' },
      { name: 'Google Finance', url: 'https://www.google.com/finance/quote/TNA:NASDAQ', color: '#4285F4' },
      { name: 'MarketWatch', url: 'https://www.marketwatch.com/investing/fund/tna', color: '#0F9D58' },
      { name: 'Direxion', url: 'https://www.direxion.com/products/tna', color: '#FF9500' }
    ]
  }
};

export const ASSET_CATEGORIES = {
  'Technology': {
    name: 'Technology',
    description: 'High-growth technology sectors including NASDAQ, semiconductors, and software',
    risk: 'Very High',
    assets: ['TQQQ', 'TECL', 'SOXL']
  },
  'Broad Market': {
    name: 'Broad Market',
    description: 'Diversified exposure to large-cap U.S. equities (S&P 500)',
    risk: 'High',
    assets: ['SPXL', 'UPRO']
  },
  'Growth': {
    name: 'Growth Stocks',
    description: 'High-growth mega-cap technology companies (FANG+ stocks)',
    risk: 'Very High',
    assets: ['FNGU']
  },
  'Financial': {
    name: 'Financial Services',
    description: 'Banks, insurance companies, and financial services',
    risk: 'High',
    assets: ['FAS']
  },
  'Energy': {
    name: 'Energy Sector',
    description: 'Oil, gas, and energy exploration companies',
    risk: 'Very High',
    assets: ['GUSH']
  },
  'Small Cap': {
    name: 'Small Cap Stocks',
    description: 'Small-capitalization U.S. companies with high growth potential',
    risk: 'Very High',
    assets: ['TNA']
  }
};

/**
 * Get asset information by symbol
 * @param {string} symbol - Asset symbol
 * @returns {Object|null} Asset information or null if not found
 */
export function getAssetInfo(symbol) {
  return SUPPORTED_ASSETS[symbol] || null;
}

/**
 * Get all assets in a category
 * @param {string} category - Category name
 * @returns {Array} Array of asset objects
 */
export function getAssetsByCategory(category) {
  const categoryInfo = ASSET_CATEGORIES[category];
  if (!categoryInfo) return [];
  
  return categoryInfo.assets.map(symbol => ({
    symbol,
    ...SUPPORTED_ASSETS[symbol]
  }));
}

/**
 * Get all supported asset symbols
 * @returns {Array} Array of asset symbols
 */
export function getAllAssetSymbols() {
  return Object.keys(SUPPORTED_ASSETS);
}

/**
 * Check if an asset is supported
 * @param {string} symbol - Asset symbol
 * @returns {boolean} True if supported
 */
export function isAssetSupported(symbol) {
  return symbol in SUPPORTED_ASSETS;
}
