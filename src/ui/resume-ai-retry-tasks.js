(function (global) {
  'use strict';

  function selectFailedResumeAiTasks(tasks, errors) {
    const failedKeys = new Set((Array.isArray(errors) ? errors : []).map(item => `${item?.candidateId}:${item?.versionId}`));
    return (Array.isArray(tasks) ? tasks : []).filter(task => failedKeys.has(`${task?.candidateId}:${task?.versionId}`));
  }

  global.WorkBuddyResumeAiRetryTasks = { selectFailedResumeAiTasks };
})(typeof window !== 'undefined' ? window : globalThis);
