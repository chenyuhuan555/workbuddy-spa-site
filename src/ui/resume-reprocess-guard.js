(function (global) {
  'use strict';

  function validateResumeReprocessRequest(version, refreshRawText) {
    if (!version) return { ok: false, reason: '当前没有可处理的简历版本' };
    if (!refreshRawText && String(version.rawText || '').trim().length < 40) {
      return { ok: false, reason: '现有原始文本不足，请从原始文件重新提取' };
    }
    return { ok: true, reason: '' };
  }

  function reprocessSuccessMessage(refreshRawText) {
    return refreshRawText ? '已从原始文件重新提取并处理' : '已使用现有文本重新处理';
  }

  global.WorkBuddyResumeReprocessGuard = { validateResumeReprocessRequest, reprocessSuccessMessage };
})(typeof window !== 'undefined' ? window : globalThis);
