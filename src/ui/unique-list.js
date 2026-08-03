(function (global) {
  'use strict';

  function uniqueList(items, limit = 30) {
    const seen = new Set();
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      const value = String(item || '').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
      if (out.length >= limit) break;
    }
    return out;
  }

  global.WorkBuddyUniqueList = { uniqueList };
})(typeof window !== 'undefined' ? window : globalThis);
