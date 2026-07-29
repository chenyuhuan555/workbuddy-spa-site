(function initSaveCoordinator(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddySaveCoordinator = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createSaveCoordinatorModule() {
  function createSaveCoordinator({
    delay = 500,
    save,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    now = Date.now,
  } = {}) {
    if (typeof save !== 'function') throw new TypeError('save must be a function');

    const dirty = new Set();
    const listeners = new Set();
    let timer = null;
    let inFlight = null;
    let disposed = false;
    let failedDomains = new Set();
    let state = { status: 'idle', error: '', savedAt: '' };

    function publish(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener({ ...state });
    }

    function cancelTimer() {
      if (timer === null) return;
      clearTimer(timer);
      timer = null;
    }

    function schedule() {
      if (disposed || inFlight) return;
      cancelTimer();
      timer = setTimer(() => {
        timer = null;
        void flush().catch(() => {});
      }, delay);
    }

    async function drain() {
      while (!disposed && dirty.size) {
        const domains = new Set(dirty);
        dirty.clear();
        publish({ status: 'saving', error: '' });
        try {
          await save(domains);
          failedDomains = new Set();
          publish({ status: 'saved', error: '', savedAt: new Date(now()).toISOString() });
        } catch (error) {
          failedDomains = domains;
          publish({ status: 'error', error: String(error?.message || error) });
          throw error;
        }
      }
    }

    function flush() {
      if (disposed) return Promise.resolve();
      cancelTimer();
      if (!inFlight) {
        inFlight = drain().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    }

    return {
      markDirty(domain) {
        if (disposed || !domain) return;
        dirty.add(domain);
        schedule();
      },
      flush,
      retry() {
        if (disposed) return Promise.resolve();
        for (const domain of failedDomains) dirty.add(domain);
        failedDomains = new Set();
        return flush();
      },
      subscribe(listener) {
        if (typeof listener !== 'function' || disposed) return () => {};
        listeners.add(listener);
        listener({ ...state });
        return () => listeners.delete(listener);
      },
      getState() {
        return { ...state };
      },
      dispose() {
        disposed = true;
        cancelTimer();
        dirty.clear();
        failedDomains.clear();
        listeners.clear();
      },
    };
  }

  return { createSaveCoordinator };
});
