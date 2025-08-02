/**
 * Stock data API utilities for fetching real-time stock information
 * Uses multiple free APIs as fallbacks
 */

/**
 * Fetch stock data from Alpha Vantage (free tier allows 5 calls per minute)
 */
async function fetchFromAlphaVantage(symbol) {
  // For demo purposes, we'll use a free API key
  // In production, users should get their own API key
  const API_KEY = 'demo'; // Users should replace this
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error('No data returned from Alpha Vantage');
    }
    
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'].replace('%', ''),
      volume: parseInt(quote['06. volume']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      previousClose: parseFloat(quote['08. previous close']),
      timestamp: new Date().toISOString(),
      source: 'Alpha Vantage'
    };
  } catch (error) {
    console.warn('Alpha Vantage API failed:', error.message);
    throw error;
  }
}

/**
 * Fetch stock data from Finnhub (free tier allows 60 calls per minute)
 */
async function fetchFromFinnhub(symbol) {
  // For demo purposes, we'll use a sandbox API key
  // In production, users should get their own API key
  const API_KEY = 'sandbox_c9k8b62ad3idrbpb4vu0'; // Users should replace this
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    if (!data.c || data.c === 0) {
      throw new Error('No data returned from Finnhub');
    }
    
    const change = data.c - data.pc;
    const changePercent = ((change / data.pc) * 100).toFixed(2);
    
    return {
      symbol: symbol,
      price: data.c, // current price
      change: change,
      changePercent: changePercent,
      volume: 0, // Not available in this endpoint
      open: data.o, // open price
      high: data.h, // high price
      low: data.l, // low price
      previousClose: data.pc, // previous close
      timestamp: new Date(data.t * 1000).toISOString(),
      source: 'Finnhub'
    };
  } catch (error) {
    console.warn('Finnhub API failed:', error.message);
    throw error;
  }
}

/**
 * Fetch stock data from Yahoo Finance (via proxy/CORS workaround)
 */
async function fetchFromYahooFinance(symbol) {
  // Using a CORS proxy for Yahoo Finance
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  
  try {
    const response = await fetch(proxyUrl + yahooUrl);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = ((change / previousClose) * 100).toFixed(2);
    
    return {
      symbol: meta.symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: meta.regularMarketVolume,
      open: quote.open[quote.open.length - 1],
      high: quote.high[quote.high.length - 1],
      low: quote.low[quote.low.length - 1],
      previousClose: previousClose,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
      source: 'Yahoo Finance'
    };
  } catch (error) {
    console.warn('Yahoo Finance API failed:', error.message);
    throw error;
  }
}

/**
 * Fallback mock data for when APIs are unavailable
 */
function getMockStockData(symbol, assetInfo = null) {
  // Updated mock prices with current market values (as of December 2024)
  const currentPrices = {
    'TQQQ': 82.45,  // Updated from 36.62 to current price
    'SQQQ': 8.23,
    'UPRO': 71.28,
    'SPXL': 164.82,
    'SPXS': 6.15,
    'TNA': 97.64,
    'TZA': 7.89,
    'TECL': 48.92,
    'TECS': 4.12,
    'FAS': 89.75,
    'FAZ': 11.23,
    'CURE': 22.18,
    'LABD': 14.56,
    'UTSL': 178.34,
    'SDOW': 6.92,
    'UDOW': 94.17
  };
  
  // Use current price or fallback to asset info default or 100
  const basePrice = currentPrices[symbol] || assetInfo?.defaultPrice || 100.0;
  const volatility = assetInfo?.volatility === 'Very High' ? 0.08 : 0.05;
  
  if (!assetInfo) {
    // Fallback for when asset info is not available
    console.warn(`No asset info available for ${symbol}, using default values`);
  }
  
  // Random price movement within typical daily range
  const changePercent = (Math.random() - 0.5) * volatility * 2;
  const change = basePrice * (changePercent / 100);
  const currentPrice = basePrice + change;
  
  return {
    symbol: symbol,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: changePercent.toFixed(2),
    volume: Math.floor(Math.random() * 50000000), // Random volume
    open: parseFloat((currentPrice - change * 0.5).toFixed(2)),
    high: parseFloat((currentPrice + Math.abs(change) * 0.3).toFixed(2)),
    low: parseFloat((currentPrice - Math.abs(change) * 0.3).toFixed(2)),
    previousClose: parseFloat(basePrice.toFixed(2)),
    timestamp: new Date().toISOString(),
    source: 'Mock Data (Updated Prices)'
  };
}

/**
 * Main function to fetch stock data with fallback chain
 * @param {Object|string} assetInfoOrSymbol - Asset info object or just symbol string
 * @param {Object} options - Options object
 * @param {boolean} options.useMockData - Force use of mock data
 * @returns {Promise<Object>} Stock data object
 */
export async function fetchStockData(assetInfoOrSymbol, options = {}) {
  // Handle both old and new calling conventions
  let symbol, assetInfo;
  
  if (typeof assetInfoOrSymbol === 'string') {
    // Old calling convention: fetchStockData(symbol, options)
    symbol = assetInfoOrSymbol;
    assetInfo = options.assetInfo || null;
  } else {
    // New calling convention: fetchStockData(assetInfo, options)
    assetInfo = assetInfoOrSymbol;
    symbol = assetInfo?.symbol;
  }
  
  if (!symbol) {
    throw new Error('Symbol is required');
  }
  
  if (options.useMockData) {
    return getMockStockData(symbol, assetInfo);
  }
  
  // Try APIs in order of preference
  const apis = [
    fetchFromFinnhub,
    fetchFromAlphaVantage,
    fetchFromYahooFinance
  ];
  
  for (const apiFn of apis) {
    try {
      const data = await apiFn(symbol);
      // Cache the successful result
      cacheStockData(symbol, data);
      return data;
    } catch (error) {
      console.warn(`Failed to fetch from ${apiFn.name}:`, error.message);
      continue;
    }
  }
  
  // If all APIs fail, try to use cached data
  const cachedData = getCachedStockData(symbol);
  if (cachedData) {
    console.log('Using cached data for', symbol);
    return {
      ...cachedData,
      isCached: true,
      cacheAge: Date.now() - new Date(cachedData.timestamp).getTime()
    };
  }
  
  // Last resort: use mock data
  console.log('All APIs failed, using mock data for', symbol);
  return {
    ...getMockStockData(symbol, assetInfo),
    isMock: true
  };
}

/**
 * Cache stock data in localStorage
 */
function cacheStockData(symbol, data) {
  try {
    const cacheKey = `stock_data_${symbol}`;
    const cacheData = {
      ...data,
      cachedAt: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache stock data:', error);
  }
}

/**
 * Get cached stock data from localStorage
 */
function getCachedStockData(symbol) {
  try {
    const cacheKey = `stock_data_${symbol}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const cacheAge = Date.now() - data.cachedAt;
    
    // Cache expires after 5 minutes
    if (cacheAge > 5 * 60 * 1000) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to get cached stock data:', error);
    return null;
  }
}

/**
 * Fetch basic company information
 * @param {string} symbol - Stock symbol
 * @param {Object} assetInfo - Asset information object from assets config
 */
export async function fetchCompanyInfo(symbol, assetInfo = null) {
  if (!assetInfo) {
    throw new Error(`Asset information required for ${symbol}`);
  }
  
  // Return the static information from our config
  // In a production app, you might fetch additional data from financial APIs
  return {
    symbol: assetInfo.symbol,
    name: assetInfo.name,
    description: assetInfo.description,
    category: assetInfo.category,
    leverage: assetInfo.leverage,
    underlying: assetInfo.underlying,
    expenseRatio: assetInfo.expense_ratio,
    avgVolume: assetInfo.avg_volume,
    volatility: assetInfo.volatility,
    color: assetInfo.color
  };
}

/**
 * Get market status (simplified version)
 */
export function getMarketStatus() {
  const now = new Date();
  const hours = now.getHours();
  const day = now.getDay();
  
  // Simple market hours check (9:30 AM - 4:00 PM EST, Mon-Fri)
  // This is a simplified version - production would need timezone handling
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hours >= 9 && hours < 16;
  
  return {
    isOpen: isWeekday && isMarketHours,
    nextOpen: isWeekday ? (hours >= 16 ? 'Tomorrow 9:30 AM' : 'Now') : 'Monday 9:30 AM',
    timezone: 'EST'
  };
}
