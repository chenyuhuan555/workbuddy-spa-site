;(function initMetricsDelta(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyMetricsDelta = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMetricsDeltaModule() {
  'use strict';

  function buildMetricDelta(current, baseline, key) {
    if (!baseline || baseline[key] === undefined) return { text: '较昨日 —', cls: 'text-slate-400' };
    const delta = current - baseline[key];
    if (delta === 0) return { text: '较昨日 0 —', cls: 'text-slate-400' };
    if (delta > 0) return { text: `较昨日 +${delta} ↑`, cls: 'text-emerald-600' };
    return { text: `较昨日 ${delta} ↓`, cls: 'text-rose-600' };
  }

  function buildDashboardDelta(metrics = {}, baseline = null) {
    return Object.fromEntries(['companies', 'positions', 'candidates', 'applications', 'interviews', 'offers']
      .map(key => [key, buildMetricDelta(metrics[key] || 0, baseline, key)]));
  }

  return Object.freeze({ buildDashboardDelta });
});
