(function (global) {
  'use strict';

  function normalizeResumeName(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  global.WorkBuddyResumeNameNormalizer = { normalizeResumeName };
})(typeof window !== 'undefined' ? window : globalThis);
