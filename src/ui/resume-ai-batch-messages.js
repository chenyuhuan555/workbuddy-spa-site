(function (global) {
  'use strict';

  function completionMessage(state, retry = false) {
    const failed = Number(state?.failed || 0);
    if (retry) return failed ? `失败项重试完成，仍失败 ${failed} 份` : '失败项重试完成';
    return failed ? `批量处理完成，失败 ${failed} 份` : '批量简历处理完成';
  }

  function completionTone(state) {
    return Number(state?.failed || 0) ? 'error' : 'success';
  }

  global.WorkBuddyResumeAiBatchMessages = { completionMessage, completionTone };
})(typeof window !== 'undefined' ? window : globalThis);
