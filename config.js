const CONFIG = (function () {
  const existing = (typeof globalThis !== 'undefined' && globalThis.CONFIG && typeof globalThis.CONFIG === 'object')
    ? globalThis.CONFIG
    : {};

  const config = Object.assign({
    LIVE_TRANSIT_API_BASE: '',
    LIVE_LIBRARY_TRENDS_URL: '',
    LIVE_LIBRARY_LOOKBACK_DAYS: 28,
    REJSEPLANEN_API_KEY: ''
  }, existing);

  if (typeof globalThis !== 'undefined') {
    globalThis.CONFIG = config;
  }

  return config;
})();
