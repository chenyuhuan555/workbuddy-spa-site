;(function initWorkbenchOwners(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchOwners = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchOwners() {
  'use strict';

  function collectOwners({ companies = [], positions = [], candidates = [] } = {}) {
    return Array.from(new Set([
      ...companies.map(item => item.owner),
      ...positions.map(item => item.owner),
      ...candidates.map(item => item.owner),
    ].filter(Boolean)));
  }

  return Object.freeze({ collectOwners });
});
