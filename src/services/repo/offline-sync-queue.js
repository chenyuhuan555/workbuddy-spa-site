;(function initOfflineSyncQueue(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyOfflineSyncQueue = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createOfflineSyncQueueModule() {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function createOfflineSyncQueue({ storage, key = 'workbuddy_offline_sync_queue', now = Date.now, retryBaseMs = 1000, maxRetries = 8 } = {}) {
    const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const read = () => {
      try {
        const value = backend?.getItem(key);
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed.filter(item => item?.kind && item?.id && item?.model) : [];
      } catch { return []; }
    };
    const write = items => {
      try { backend?.setItem(key, JSON.stringify(items)); } catch {}
    };
    const identity = item => `${item.kind}:${item.id}`;

    function enqueue(items = []) {
      const current = new Map(read().map(item => [identity(item), item]));
      (items || []).filter(item => item?.kind && item?.id && item?.model).forEach(item => {
        const previous = current.get(identity(item));
        current.set(identity(item), {
          kind: item.kind,
          id: String(item.id),
          model: clone(item.model),
          attempts: previous?.attempts || 0,
          nextAttemptAt: previous?.nextAttemptAt || 0,
          lastError: previous?.lastError || '',
        });
      });
      const result = [...current.values()];
      write(result);
      return result.length;
    }

    function listDue(at = now()) {
      return read().filter(item => Number(item.nextAttemptAt || 0) <= at).map(clone);
    }

    function markSuccess(items = []) {
      const done = new Set(items.map(identity));
      const result = read().filter(item => !done.has(identity(item)));
      write(result);
      return result.length;
    }

    function markFailure(items = [], error = '同步失败', at = now()) {
      const failed = new Set(items.map(identity));
      const result = read().map(item => {
        if (!failed.has(identity(item))) return item;
        const attempts = Math.min(maxRetries, Number(item.attempts || 0) + 1);
        return { ...item, attempts, lastError: String(error || '同步失败'), nextAttemptAt: at + retryBaseMs * (2 ** Math.max(0, attempts - 1)) };
      });
      write(result);
      return result.length;
    }

    return Object.freeze({ enqueue, listDue, markSuccess, markFailure, size: () => read().length, clear: () => write([]) });
  }

  return Object.freeze({ createOfflineSyncQueue });
});
