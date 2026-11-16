/**
 * Display currency for Investucation.
 *
 * Money is always stored in GBP (balance, buy prices, sale prices).
 * This file only decides which currency to SHOW it in, and converts.
 *
 * - If the user picked a currency from the dropdown, that choice is used.
 * - Otherwise it is guessed from the browser's time zone, then its language
 *   region (e.g. "en-CA"). Nothing is sent anywhere to work this out.
 * - Falls back to GBP if the region isn't one we support or rates can't load.
 *
 * Exchange rates: Frankfurter (European Central Bank daily rates), cached for 6 hours.
 */
(function (global) {
  var CURRENCIES = [
    { code: 'GBP', label: '£ GBP' },
    { code: 'EUR', label: '€ EUR' },
    { code: 'USD', label: '$ USD' },
    { code: 'CAD', label: 'C$ CAD' },
    { code: 'AUD', label: 'A$ AUD' },
    { code: 'NZD', label: 'NZ$ NZD' },
    { code: 'INR', label: '₹ INR' },
    { code: 'JPY', label: '¥ JPY' },
    { code: 'CHF', label: 'CHF' },
    { code: 'SEK', label: 'kr SEK' },
    { code: 'NOK', label: 'kr NOK' },
    { code: 'DKK', label: 'kr DKK' },
    { code: 'PLN', label: 'zł PLN' },
    { code: 'SGD', label: 'S$ SGD' },
    { code: 'HKD', label: 'HK$ HKD' },
    { code: 'ZAR', label: 'R ZAR' }
  ];
  var SUPPORTED = CURRENCIES.map(function (c) { return c.code; });

  // Country (ISO 3166) -> currency, for the countries whose currency we support.
  var EURO = ['AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES','MC','SM','VA','AD','ME','XK'];
  var COUNTRY = {
    GB: 'GBP', IM: 'GBP', JE: 'GBP', GG: 'GBP',
    US: 'USD', PR: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IN: 'INR', JP: 'JPY',
    CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', SG: 'SGD', HK: 'HKD', ZA: 'ZAR'
  };
  EURO.forEach(function (c) { COUNTRY[c] = 'EUR'; });

  // Time zone -> country. Time zone is usually more reliable than language,
  // because lots of UK computers are set to "English (United States)".
  var ZONES = {
    'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Isle_of_Man': 'IM', 'Europe/Jersey': 'JE', 'Europe/Guernsey': 'GG',
    'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES',
    'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Lisbon': 'PT',
    'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT', 'Europe/Athens': 'GR', 'Europe/Helsinki': 'FI', 'Europe/Luxembourg': 'LU',
    'Europe/Malta': 'MT', 'Europe/Bratislava': 'SK', 'Europe/Ljubljana': 'SI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV',
    'Europe/Vilnius': 'LT', 'Europe/Zagreb': 'HR', 'Asia/Nicosia': 'CY', 'Europe/Monaco': 'MC',
    'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
    'America/St_Johns': 'CA', 'America/Regina': 'CA', 'America/Montreal': 'CA', 'America/Moncton': 'CA', 'America/Whitehorse': 'CA',
    'Pacific/Auckland': 'NZ', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Tokyo': 'JP',
    'Asia/Singapore': 'SG', 'Asia/Hong_Kong': 'HK', 'Africa/Johannesburg': 'ZA', 'America/Puerto_Rico': 'PR'
  };

  function countryFromTimeZone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (ZONES[tz]) return ZONES[tz];
      if (tz.indexOf('Australia/') === 0) return 'AU';
      // Other North American zones not listed above are US ones (New_York, Chicago, Denver, Los_Angeles, ...)
      if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Indiana\/|Kentucky\/|North_Dakota\/)/.test(tz)) return 'US';
      if (tz === 'Pacific/Honolulu') return 'US';
    } catch (e) {}
    return null;
  }

  function countryFromLanguage() {
    try {
      var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
      for (var i = 0; i < langs.length; i++) {
        var m = /[-_]([A-Za-z]{2})(?:$|[-_])/.exec(langs[i] || '');
        if (m && COUNTRY[m[1].toUpperCase()]) return m[1].toUpperCase();
      }
    } catch (e) {}
    return null;
  }

  function detect() {
    var country = countryFromTimeZone();
    if (!country || !COUNTRY[country]) country = countryFromLanguage();
    return (country && COUNTRY[country]) || 'GBP';
  }

  function isChosen() {
    try { return localStorage.getItem('currencyChosen') === '1'; } catch (e) { return false; }
  }

  function storedChoice() {
    try {
      var c = localStorage.getItem('currency');
      return SUPPORTED.indexOf(c) !== -1 ? c : null;
    } catch (e) { return null; }
  }

  // Rates: how many units of each currency one GBP buys.
  var rates = { GBP: 1, USD: 1.27 };
  var loadPromise = null;

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async function () {
      try {
        var cached = JSON.parse(localStorage.getItem('fxRatesGBP') || 'null');
        if (cached && cached.rates && Date.now() - cached.ts < 6 * 3600 * 1000) {
          rates = cached.rates;
          return;
        }
      } catch (e) {}
      try {
        var res = await fetch('https://api.frankfurter.app/latest?from=GBP');
        var data = await res.json();
        if (data && data.rates && typeof data.rates.USD === 'number') {
          data.rates.GBP = 1;
          rates = data.rates;
          try { localStorage.setItem('fxRatesGBP', JSON.stringify({ ts: Date.now(), rates: rates })); } catch (e2) {}
        }
      } catch (e) {}
    })();
    return loadPromise;
  }

  /** The currency to display. Uses GBP if rates for the wanted one aren't available. */
  function get() {
    var wanted = (isChosen() && storedChoice()) || detect();
    return typeof rates[wanted] === 'number' ? wanted : 'GBP';
  }

  function choose(code) {
    if (SUPPORTED.indexOf(code) === -1) return;
    try {
      localStorage.setItem('currency', code);
      localStorage.setItem('currencyChosen', '1');
    } catch (e) {}
  }

  function usdToGbp() { return 1 / rates.USD; }
  function fromGbp(gbp) { return gbp * rates[get()]; }
  function fromUsd(usd) { return usd * usdToGbp() * rates[get()]; }

  function format(amount, signed, code) {
    code = code || get();
    var locale = code === 'USD' ? 'en-US' : 'en-GB';
    var s = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(Math.abs(amount));
    return (amount < 0 ? '−' : signed ? '+' : '') + s;
  }

  /** Fill a <select> with the currencies and keep it in sync. onChange runs after a new choice. */
  function bindSelect(select, onChange) {
    if (!select) return;
    select.innerHTML = CURRENCIES.map(function (c) {
      return '<option value="' + c.code + '">' + c.label + '</option>';
    }).join('');
    select.value = get();
    select.title = isChosen() ? 'Currency' : 'Currency (picked from your region)';
    select.onchange = function () {
      choose(select.value);
      select.title = 'Currency';
      if (onChange) onChange(select.value);
    };
    load().then(function () { select.value = get(); });
  }

  global.InvestucationCurrency = {
    list: CURRENCIES,
    detect: detect,
    load: load,
    get: get,
    choose: choose,
    isChosen: isChosen,
    usdToGbp: usdToGbp,
    fromGbp: fromGbp,
    fromUsd: fromUsd,
    format: format,
    bindSelect: bindSelect
  };
})(typeof window !== 'undefined' ? window : this);
