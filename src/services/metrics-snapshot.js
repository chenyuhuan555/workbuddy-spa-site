;(function initMetricsSnapshot(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyMetricsSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMetricsSnapshotModule() {
  'use strict';

  function createMetricsSnapshot({ storage, key, now = () => new Date() }) {
    const snapshotKey = `${String(key || '')}_workbench_v2_metrics_snapshot`;
    function todayDateStr() {
      const date = new Date(now());
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function read() {
      try {
        const raw = storage?.getItem(snapshotKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch { return null; }
    }
    function write(metrics) {
      try { storage?.setItem(snapshotKey, JSON.stringify({ date: todayDateStr(), metrics })); } catch {}
    }
    return Object.freeze({ todayDateStr, read, write });
  }

  return Object.freeze({ createMetricsSnapshot });
});
