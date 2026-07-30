;(function initResumeFormattedTextEditor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeFormattedTextEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeFormattedTextEditor() {
  'use strict';

  function createDraft(version = {}) {
    return { formattedText: String(version.formattedText || '') };
  }

  async function save(options = {}) {
    if (!options.canWrite) throw new Error('当前账号无权编辑电子简历');
    if (typeof options.persist !== 'function') throw new Error('电子简历保存依赖不可用');
    const candidate = options.bundle?.candidates?.find(item => item.id === options.candidateId);
    if (!candidate) throw new Error('候选人不存在');
    const version = Array.isArray(candidate.resumeVersions)
      ? candidate.resumeVersions.find(item => item.id === options.versionId)
      : null;
    if (!version) throw new Error('当前简历版本不存在');

    const previous = {
      formattedText: version.formattedText,
      formatStatus: version.formatStatus,
      formatError: version.formatError,
      formatErrorCode: version.formatErrorCode,
      aiStage: version.aiStage,
      formattedAt: version.formattedAt,
      candidateUpdatedAt: candidate.updatedAt,
    };
    const formattedText = String(options.draft?.formattedText || '').trim();
    const now = typeof options.now === 'function' ? options.now() : new Date().toISOString();
    Object.assign(version, {
      formattedText,
      formatStatus: formattedText ? 'done' : 'queued',
      formatError: '',
      formatErrorCode: '',
      aiStage: '',
      formattedAt: formattedText ? now : '',
    });
    candidate.updatedAt = now;

    let persisted = false;
    try {
      persisted = await options.persist() === true;
    } catch {}
    if (!persisted) {
      Object.assign(version, {
        formattedText: previous.formattedText,
        formatStatus: previous.formatStatus,
        formatError: previous.formatError,
        formatErrorCode: previous.formatErrorCode,
        aiStage: previous.aiStage,
        formattedAt: previous.formattedAt,
      });
      candidate.updatedAt = previous.candidateUpdatedAt;
      try { await options.persist(); } catch {}
      throw new Error('电子简历保存失败，请重试');
    }
    return version;
  }

  return { createDraft, save };
});
