;(function initWorkbenchOwners(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchOwners = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchOwners() {
  'use strict';

  function splitOwners(value) {
    return String(value || '')
      .split(/[、,，/／|\n;；]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function hasOwner(value, owner) {
    const wanted = String(owner || '').trim();
    return !wanted || splitOwners(value).some(item => item === wanted);
  }

  function collectOwners({ companies = [], positions = [], candidates = [] } = {}) {
    return Array.from(new Set([
      ...companies.flatMap(item => splitOwners(item.owner)),
      ...positions.flatMap(item => splitOwners(item.owner)),
      ...candidates.flatMap(item => splitOwners(item.owner)),
    ].filter(Boolean)));
  }

  return Object.freeze({ collectOwners, splitOwners, hasOwner });
});
