;(function initWorkbenchEntityMerge(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchEntityMerge = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchEntityMerge() {
  'use strict';

  function timeOf(item) {
    return Date.parse(item?.updatedAt || item?.createdAt || '') || 0;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((out, key) => {
      if (!['createdAt', 'updatedAt', 'deletedAt'].includes(key)) out[key] = stableValue(value[key]);
      return out;
    }, {});
  }

  function samePayload(a, b) {
    return JSON.stringify(stableValue(a || {})) === JSON.stringify(stableValue(b || {}));
  }

  function mergeEntityCollections(localItems = [], cloudItems = []) {
    const items = (localItems || []).filter(item => item?.id).slice();
    const byId = new Map(items.map((item, index) => [item.id, index]));
    const conflicts = [];
    let added = 0;
    let updated = 0;
    let removed = 0;
    (cloudItems || []).filter(item => item?.id).forEach(cloud => {
      const index = byId.get(cloud.id);
      if (index === undefined) {
        if (!cloud.deletedAt) { byId.set(cloud.id, items.length); items.push(cloud); added += 1; }
        return;
      }
      const local = items[index];
      const localTime = timeOf(local);
      const cloudTime = timeOf(cloud);
      if (cloud.deletedAt) {
        if (cloudTime >= localTime) { items.splice(index, 1); byId.clear(); items.forEach((item, itemIndex) => byId.set(item.id, itemIndex)); removed += 1; }
        else conflicts.push({ id: cloud.id, type: 'local_newer_than_cloud_delete', local, cloud });
      } else if (cloudTime > localTime) {
        items[index] = cloud; updated += 1;
      } else if (cloudTime < localTime) {
        if (!samePayload(local, cloud)) conflicts.push({ id: cloud.id, type: 'local_newer_than_cloud', local, cloud });
      } else if (!samePayload(local, cloud)) {
        conflicts.push({ id: cloud.id, type: 'same_timestamp_different_payload', local, cloud });
      }
    });
    return Object.freeze({ items, added, updated, removed, conflicts });
  }

  return Object.freeze({ mergeEntityCollections });
});
