export const DERIV_APP_ID = 1089; // Standard open app_id for Deriv
export const DERIV_WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

export const ASSET_PAIRS = [
  // Forex
  { symbol: 'frxAUDCAD', name: 'AUD/CAD', type: 'Forex' },
  { symbol: 'frxAUDCHF', name: 'AUD/CHF', type: 'Forex' },
  { symbol: 'frxAUDJPY', name: 'AUD/JPY', type: 'Forex' },
  { symbol: 'frxAUDNZD', name: 'AUD/NZD', type: 'Forex' },
  { symbol: 'frxAUDUSD', name: 'AUD/USD', type: 'Forex' },
  { symbol: 'frxCADCHF', name: 'CAD/CHF', type: 'Forex' },
  { symbol: 'frxCADJPY', name: 'CAD/JPY', type: 'Forex' },
  { symbol: 'frxCHFJPY', name: 'CHF/JPY', type: 'Forex' },
  { symbol: 'frxEURAUD', name: 'EUR/AUD', type: 'Forex' },
  { symbol: 'frxEURCAD', name: 'EUR/CAD', type: 'Forex' },
  { symbol: 'frxEURCHF', name: 'EUR/CHF', type: 'Forex' },
  { symbol: 'frxEURGBP', name: 'EUR/GBP', type: 'Forex' },
  { symbol: 'frxEURJPY', name: 'EUR/JPY', type: 'Forex' },
  { symbol: 'frxEURNZD', name: 'EUR/NZD', type: 'Forex' },
  { symbol: 'frxEURUSD', name: 'EUR/USD', type: 'Forex' },
  { symbol: 'frxGBPAUD', name: 'GBP/AUD', type: 'Forex' },
  { symbol: 'frxGBPCAD', name: 'GBP/CAD', type: 'Forex' },
  { symbol: 'frxGBPCHF', name: 'GBP/CHF', type: 'Forex' },
  { symbol: 'frxGBPJPY', name: 'GBP/JPY', type: 'Forex' },
  { symbol: 'frxGBPNZD', name: 'GBP/NZD', type: 'Forex' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', type: 'Forex' },
  { symbol: 'frxNZDCAD', name: 'NZD/CAD', type: 'Forex' },
  { symbol: 'frxNZDCHF', name: 'NZD/CHF', type: 'Forex' },
  { symbol: 'frxNZDJPY', name: 'NZD/JPY', type: 'Forex' },
  { symbol: 'frxNZDUSD', name: 'NZD/USD', type: 'Forex' },
  { symbol: 'frxUSDCAD', name: 'USD/CAD', type: 'Forex' },
  { symbol: 'frxUSDCHF', name: 'USD/CHF', type: 'Forex' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', type: 'Forex' },
  // Volatility
  { symbol: 'R_10', name: 'Volatility 10 Index', type: 'Volatility' },
  { symbol: 'R_25', name: 'Volatility 25 Index', type: 'Volatility' },
  { symbol: 'R_50', name: 'Volatility 50 Index', type: 'Volatility' },
  { symbol: 'R_75', name: 'Volatility 75 Index', type: 'Volatility' },
  { symbol: 'R_100', name: 'Volatility 100 Index', type: 'Volatility' },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', type: 'Volatility' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index', type: 'Volatility' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', type: 'Volatility' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', type: 'Volatility' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', type: 'Volatility' },
  // Jump
  { symbol: 'JD10', name: 'Jump 10 Index', type: 'Jump' },
  { symbol: 'JD25', name: 'Jump 25 Index', type: 'Jump' },
  { symbol: 'JD50', name: 'Jump 50 Index', type: 'Jump' },
  { symbol: 'JD75', name: 'Jump 75 Index', type: 'Jump' },
  { symbol: 'JD100', name: 'Jump 100 Index', type: 'Jump' },
];

export const TIMEFRAMES = [
  { label: '1M', granularity: 60 },
  { label: '2M', granularity: 120 },
  { label: '3M', granularity: 180 },
  { label: '5M', granularity: 300 },
];
