;(function initCandidateDirectionNormalizer(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateDirectionNormalizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateDirectionNormalizer() {
  'use strict';

  function normalize(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))).slice(0, 3);
  }

  return Object.freeze({ normalize });
});
