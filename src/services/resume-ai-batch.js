;(function initResumeAiBatch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeAiBatch = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeAiBatch() {
  'use strict';

  function createState() {
    return {
      running: false,
      cancelled: false,
      current: null,
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
  }

  function createBatchRunner({ enqueue } = {}) {
    if (typeof enqueue !== 'function') throw new TypeError('enqueue 依赖不可用');
    const state = createState();
    let activePromise = null;

    async function run(tasks, options = {}) {
      const { refreshRawText = false, includeCompleted = false } = options;
      const allTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
      const pendingTasks = allTasks.filter(task => includeCompleted
        || !(task.formatStatus === 'done' && String(task.formattedText || '').trim()));
      state.running = true;
      state.cancelled = false;
      state.current = null;
      state.total = pendingTasks.length;
      state.completed = 0;
      state.failed = 0;
      state.skipped = allTasks.length - pendingTasks.length;
      state.errors = [];

      for (const task of pendingTasks) {
        if (state.cancelled) break;
        state.current = task;
        try {
          await enqueue({ ...task, refreshRawText });
          state.completed += 1;
        } catch (error) {
          state.failed += 1;
          state.errors.push({
            candidateId: task.candidateId,
            versionId: task.versionId,
            fileName: task.fileName || '',
            message: String(error?.message || error || '简历处理失败'),
          });
        }
      }
      state.current = null;
      state.running = false;
      return state;
    }

    function start(tasks, options = {}) {
      if (state.running && activePromise) return activePromise;
      activePromise = run(tasks, options).finally(() => { activePromise = null; });
      return activePromise;
    }

    function cancel() {
      if (state.running) state.cancelled = true;
    }

    return { state, start, cancel };
  }

  return { createBatchRunner };
});
