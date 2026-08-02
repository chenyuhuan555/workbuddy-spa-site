;(function initWorkbenchEntityReadPath(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchEntityReadPath = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchEntityReadPath() {
  'use strict';

  const KINDS = Object.freeze(['companies', 'positions', 'applications']);
  const IGNORED_FIELDS = new Set(['createdAt', 'updatedAt', 'deletedAt']);

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((out, key) => {
      if (!IGNORED_FIELDS.has(key)) out[key] = stableValue(value[key]);
      return out;
    }, {});
  }

  function fingerprintEntity(entity) {
    const text = JSON.stringify(stableValue(entity || {}));
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
    return hash.toString(36);
  }

  function parityForKind(localItems = [], cloudItems = []) {
    const local = (localItems || []).filter(item => item?.id);
    const cloudRows = (cloudItems || []).filter(item => item?.id);
    const tombstones = new Set(cloudRows.filter(item => item.deletedAt).map(item => item.id));
    const activeCloud = cloudRows.filter(item => !item.deletedAt);
    const localById = new Map(local.map(item => [item.id, item]));
    const cloudById = new Map(activeCloud.map(item => [item.id, item]));
    const missingInCloud = local.filter(item => !cloudById.has(item.id) && !tombstones.has(item.id)).map(item => item.id).sort();
    const missingInLocal = activeCloud.filter(item => !localById.has(item.id)).map(item => item.id).sort();
    const tombstonedLocal = local.filter(item => tombstones.has(item.id)).map(item => item.id).sort();
    const mismatched = activeCloud.filter(item => localById.has(item.id)
      && fingerprintEntity(localById.get(item.id)) !== fingerprintEntity(item)).map(item => item.id).sort();
    return Object.freeze({
      ok: !missingInCloud.length && !missingInLocal.length && !tombstonedLocal.length && !mismatched.length,
      localCount: local.length,
      cloudCount: activeCloud.length,
      missingInCloud,
      missingInLocal,
      mismatched,
      tombstonedLocal,
    });
  }

  function buildEntityParityReport(localBundle = {}, cloudBundle = {}) {
    const byKind = {};
    KINDS.forEach(kind => { byKind[kind] = parityForKind(localBundle[kind], cloudBundle[kind]); });
    return Object.freeze({
      ok: KINDS.every(kind => byKind[kind].ok),
      byKind,
      localCount: KINDS.reduce((sum, kind) => sum + byKind[kind].localCount, 0),
      cloudCount: KINDS.reduce((sum, kind) => sum + byKind[kind].cloudCount, 0),
    });
  }

  function canEnableReadPath(meta, report) {
    return Boolean(meta?.backfilledAt && meta?.parityVerifiedAt && report?.ok);
  }

  return Object.freeze({ KINDS, fingerprintEntity, buildEntityParityReport, canEnableReadPath });
});
