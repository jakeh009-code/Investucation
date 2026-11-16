/**
 * Single-player storage: all balances and portfolio use the *_guest keys.
 * Migrates data from logged-in user_* keys once, then clears auth leftovers.
 */
(function (global) {
  function migrateFromUserSession() {
    try {
      var uid = localStorage.getItem('currentUserId');
      if (!uid) return;
      var bases = ['balance_gbp', 'portfolio', 'soldStocks'];
      bases.forEach(function (base) {
        var uk = base + '_user_' + uid;
        var gk = base + '_guest';
        var uVal = localStorage.getItem(uk);
        if (uVal != null) {
          localStorage.setItem(gk, uVal);
        }
      });
    } catch (e) {}
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('offlineUserProfile');
    } catch (e2) {}
  }

  migrateFromUserSession();

  function migratePlainKeys() {
    try {
      var map = [
        ['balance_gbp', 'balance_gbp'],
        ['portfolio', 'portfolio'],
        ['soldStocks', 'soldStocks']
      ];
      map.forEach(function (m) {
        var plain = m[0];
        var gk = m[1] + '_guest';
        if (localStorage.getItem(gk) == null) {
          var v = localStorage.getItem(plain);
          if (v != null) localStorage.setItem(gk, v);
        }
      });
    } catch (e) {}
  }

  migratePlainKeys();

  /** @param {string} base e.g. 'balance_gbp', 'portfolio' */
  function getStorageKey(base) {
    return base + '_guest';
  }

  global.getStorageKey = getStorageKey;
})(typeof window !== 'undefined' ? window : this);
