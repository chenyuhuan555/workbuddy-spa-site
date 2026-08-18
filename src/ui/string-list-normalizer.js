(function (global) {
  'use strict';

  function normalizeStringList(value) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    const text = String(value || '').trim();
    if (!text) return [];
    return text.split(/[;；、\n]/).map(item => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  }

  global.WorkBuddyStringListNormalizer = { normalizeStringList };
})(typeof window !== 'undefined' ? window : globalThis);
