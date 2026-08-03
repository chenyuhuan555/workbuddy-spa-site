;(function initMigrationMeta(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyMigrationMeta = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMigrationMetaModule() {
  'use strict';

  function createMigrationMetaAccessor(getWorkbenchV2) {
    function root() {
      const workbenchV2 = typeof getWorkbenchV2 === 'function' ? getWorkbenchV2() : null;
      if (!workbenchV2 || typeof workbenchV2 !== 'object') throw new Error('WORKBENCH_STATE_UNAVAILABLE');
      if (!workbenchV2.migrationMeta || typeof workbenchV2.migrationMeta !== 'object') workbenchV2.migrationMeta = {};
      return workbenchV2.migrationMeta;
    }

    function ensure(key) {
      const meta = root();
      if (!meta[key] || typeof meta[key] !== 'object') meta[key] = {};
      return meta[key];
    }

    return Object.freeze({
      candidateCloud: () => ensure('candidateCloud'),
      resumeVersions: () => ensure('resumeVersions'),
      phase3Entities: () => ensure('phase3Entities'),
    });
  }

  return Object.freeze({ createMigrationMetaAccessor });
});
