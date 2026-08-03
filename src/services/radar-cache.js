(function initRadarCache(global) {
  function createRadarCache({ storage, storageKey, maxAgeMs = 30 * 60 * 1000 }) {
    const target = storage || global.localStorage;
    const key = String(storageKey || 'workbuddy_radar_cache');

    function load(now = Date.now()) {
      try {
        const raw = target.getItem(key);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        if (now - (cache.timestamp || 0) >= maxAgeMs) return null;
        return cache;
      } catch {
        return null;
      }
    }

    function save(value, now = Date.now()) {
      const cache = { ...(value || {}), timestamp: now };
      try { target.setItem(key, JSON.stringify(cache)); } catch {}
      return cache;
    }

    return { load, save };
  }

  global.WorkBuddyRadarCache = { createRadarCache };
})(typeof window !== 'undefined' ? window : globalThis);
