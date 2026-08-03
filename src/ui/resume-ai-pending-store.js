function normalizeKeys(keys) {
    return Array.from(new Set((Array.isArray(keys) ? keys : [])
      .map(value => String(value || '').trim())
      .filter(value => value.length <= 200 && value.includes(':'))));
}

function createResumeAiPendingStore({ storage, key }) {
    const targetStorage = storage || global.localStorage;
    const storageKey = String(key || '').trim();
    function read() {
      try {
        const parsed = JSON.parse(targetStorage.getItem(storageKey) || '[]');
        return normalizeKeys(parsed);
      } catch {
        return [];
      }
    }
    function write(keys) {
      const clean = normalizeKeys(keys);
      try {
        if (clean.length) targetStorage.setItem(storageKey, JSON.stringify(clean));
        else targetStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('无法记录简历 AI 待处理任务，刷新恢复将不可用：', error);
      }
    }
    function mark(candidateId, versionId) {
      const taskKey = `${candidateId}:${versionId}`;
      write(read().concat(taskKey));
      return taskKey;
    }
    function clear(taskKey) {
      write(read().filter(item => item !== taskKey));
    }
    return { read, write, mark, clear };
}

if (typeof window !== 'undefined') {
  window.WorkBuddyResumeAiPendingStore = { createResumeAiPendingStore, normalizeKeys };
}

export { createResumeAiPendingStore, normalizeKeys };
