;(function initDeferredStartup(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyDeferredStartup = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createDeferredStartup() {
  'use strict';

  function schedule(task, { requestIdleCallback = globalThis.requestIdleCallback, setTimeout = globalThis.setTimeout, timeout = 2000 } = {}) {
    if (typeof task !== 'function') return false;
    const run = () => { Promise.resolve().then(task).catch(() => {}); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout });
    else if (typeof setTimeout === 'function') setTimeout(run, Math.min(timeout, 1500));
    else run();
    return true;
  }

  return Object.freeze({ schedule });
});
