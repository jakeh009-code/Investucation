/**
 * Live market data in the browser — no backend server.
 * - Optional Finnhub API key: window.FINNHUB_API_KEY (see config.example.js) or localStorage.finnhubApiKey
 * - Fallback: Yahoo Finance chart API (no key; may fail from some origins)
 * - FX: Frankfurter (USD→GBP)
 * Serve pages over http://localhost (e.g. VS Code Live Server) if file:// blocks requests.
 */
(function (global) {
  function getFinnhubToken() {
    try {
      var ls = localStorage.getItem('finnhubApiKey');
      if (ls && String(ls).trim()) return String(ls).trim();
    } catch (e) {}
    if (typeof global.FINNHUB_API_KEY === 'string' && global.FINNHUB_API_KEY.trim()) {
      return global.FINNHUB_API_KEY.trim();
    }
    return '';
  }

  async function fetchQuoteFinnhub(symbol, token) {
    var sym = encodeURIComponent(String(symbol).toUpperCase().trim());
    var url = 'https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + encodeURIComponent(token);
    var res = await fetch(url);
    if (!res.ok) return null;
    var data = await res.json();
    if (data.error) return null;
    if (typeof data.c === 'number' && data.c > 0) {
      var pc = typeof data.pc === 'number' ? data.pc : data.c;
      return { c: data.c, pc: pc };
    }
    return null;
  }

  async function fetchQuoteYahoo(symbol) {
    var sym = encodeURIComponent(String(symbol).toUpperCase().trim());
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1d&range=5d';
    var res = await fetch(url);
    if (!res.ok) return null;
    var data = await res.json();
    var chart = data.chart;
    if (!chart || !chart.result || !chart.result[0]) return null;
    var r = chart.result[0];
    var m = r.meta;
    var c = m.regularMarketPrice;
    if (typeof c !== 'number' && r.indicators && r.indicators.quote && r.indicators.quote[0]) {
      var closes = r.indicators.quote[0].close;
      if (closes && closes.length) {
        for (var i = closes.length - 1; i >= 0; i--) {
          if (typeof closes[i] === 'number') { c = closes[i]; break; }
        }
      }
    }
    var pc = m.chartPreviousClose;
    if (typeof pc !== 'number') pc = m.previousClose;
    if (typeof c !== 'number') return null;
    if (typeof pc !== 'number') pc = c;
    return { c: c, pc: pc };
  }

  async function fetchQuote(symbol) {
    var sym = String(symbol || '').trim();
    if (!sym) return null;
    var token = getFinnhubToken();
    if (token) {
      try {
        var q = await fetchQuoteFinnhub(sym, token);
        if (q) return q;
      } catch (e) {}
    }
    try {
      return await fetchQuoteYahoo(sym);
    } catch (e) {
      return null;
    }
  }

  async function fetchCompanyFinnhub(symbol, token) {
    var sym = encodeURIComponent(String(symbol).toUpperCase().trim());
    var url = 'https://finnhub.io/api/v1/stock/profile2?symbol=' + sym + '&token=' + encodeURIComponent(token);
    var res = await fetch(url);
    if (!res.ok) return null;
    var data = await res.json();
    if (data.name) return data.name;
    return null;
  }

  async function fetchCompanyYahoo(symbol) {
    var sym = encodeURIComponent(String(symbol).toUpperCase().trim());
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1d&range=1d';
    var res = await fetch(url);
    if (!res.ok) return symbol;
    var data = await res.json();
    var r = data.chart && data.chart.result && data.chart.result[0];
    if (r && r.meta) {
      var n = r.meta.longName || r.meta.shortName;
      if (n) return n;
    }
    return symbol;
  }

  async function fetchCompanyName(symbol) {
    var sym = String(symbol || '').trim();
    if (!sym) return sym;
    var token = getFinnhubToken();
    if (token) {
      try {
        var n = await fetchCompanyFinnhub(sym, token);
        if (n) return n;
      } catch (e) {}
    }
    try {
      return await fetchCompanyYahoo(sym);
    } catch (e) {
      return sym;
    }
  }

  async function fetchUsdToGbpRate() {
    try {
      var res = await fetch('https://api.frankfurter.app/latest?amount=1&from=USD&to=GBP');
      var data = await res.json();
      if (data && data.rates && typeof data.rates.GBP === 'number') {
        return data.rates.GBP;
      }
    } catch (e) {}
    return 0.79;
  }

  global.InvestucationMarket = {
    fetchQuote: fetchQuote,
    fetchCompanyName: fetchCompanyName,
    fetchUsdToGbpRate: fetchUsdToGbpRate,
    getFinnhubToken: getFinnhubToken
  };
})(typeof window !== 'undefined' ? window : this);
