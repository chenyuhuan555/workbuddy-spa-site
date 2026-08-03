;(function initCandidateDirections(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateDirections = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateDirections() {
  'use strict';

  function collectDirections(candidates = []) {
    return Array.from(new Set((Array.isArray(candidates) ? candidates : [])
      .flatMap(item => Array.isArray(item.directions) ? item.directions : [])
      .filter(Boolean)));
  }

  return Object.freeze({ collectDirections });
});
