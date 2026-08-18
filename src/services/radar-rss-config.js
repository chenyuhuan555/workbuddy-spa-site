(function initRadarRssConfig(global) {
  function createRadarRssKeyStore({ storage, storageKey, defaultKey = '' }) {
    const target = storage || global.localStorage;
    const key = String(storageKey || 'workbuddy') + '_rss2json_key';

    function get() {
      try {
        const saved = target.getItem(key);
        if (saved) return saved;
      } catch {}
      if (!defaultKey) return '';
      try { target.setItem(key, defaultKey); } catch {}
      return defaultKey;
    }

    function set(value) {
      const next = String(value || '').trim();
      try {
        if (next) target.setItem(key, next);
        else target.removeItem(key);
      } catch {}
      return next;
    }

    return { get, set, clear: () => set('') };
  }

  global.WorkBuddyRadarRssConfig = { createRadarRssKeyStore };
})(typeof window !== 'undefined' ? window : globalThis);
