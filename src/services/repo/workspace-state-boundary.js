;(function initWorkspaceStateBoundary(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkspaceStateBoundary = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkspaceStateBoundaryModule() {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function canUseUiOnly(meta = {}) {
    return Boolean(meta.candidatesReadEnabledAt && meta.resumeVersionsReadEnabledAt && meta.entitiesReadEnabledAt);
  }

  function buildUiOnlyState(input = {}) {
    return {
      schemaVersion: 5,
      ui: clone(input.ui || {}),
      migrationMeta: clone(input.migrationMeta || {}),
    };
  }

  function prepare(input = {}, { uiOnly = false } = {}) {
    return uiOnly ? buildUiOnlyState(input) : clone(input);
  }

  return Object.freeze({ canUseUiOnly, buildUiOnlyState, prepare });
});
