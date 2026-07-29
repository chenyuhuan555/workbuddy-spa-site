;(function initResumeAiProcessing(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeAiProcessing = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeAiProcessing() {
  'use strict';

  const BASIC_FIELDS = {
    name: 'name',
    currentCompany: 'company',
    currentTitle: 'title',
    city: 'city',
  };
  const PROFILE_FIELDS = ['summary', 'keywords', 'skills', 'profileText', 'trajectory', 'directions'];

  function nowIso(deps) {
    return typeof deps.now === 'function' ? deps.now() : new Date().toISOString();
  }

  function isEmpty(value) {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
  }

  function findVersion(bundle, candidateId, versionId) {
    const candidate = (bundle?.candidates || []).find(item => item.id === candidateId);
    if (!candidate) throw new Error('人才不存在');
    const version = (candidate.resumeVersions || []).find(item => item.id === versionId);
    if (!version) throw new Error('简历版本不存在');
    return { candidate, version };
  }

  function sanitizeError(error) {
    const message = String(error?.message || error || '');
    if (/AI 功能权限|AI permission/i.test(message)) return '当前账号没有 AI 功能权限';
    if (/api\s*key|unauthorized|\b401\b|配置/i.test(message)) return 'DeepSeek API Key 未配置或无效';
    if (/timeout|超时/i.test(message)) return 'AI 请求超时，请重试';
    if (/network|fetch|网络/i.test(message)) return 'AI 网络请求失败，请检查网络后重试';
    if (/json|返回.*格式|数据格式/i.test(message)) return 'AI 返回格式错误，请重试';
    if (/原文件.*不存在|无法读取原文件/i.test(message)) return '原始简历文件不存在且没有可用文本';
    if (/文字.*少|文本.*少|文本不可用|原始文本为空/i.test(message)) return '简历文字太少或不可用，无法进行 AI 处理';
    if (/保存|persist/i.test(message)) return '本地保存失败，请重试';
    return '简历 AI 处理失败，请重试';
  }

  async function persistOrThrow(deps, context) {
    if (typeof deps.persist !== 'function') throw new Error('本地保存依赖不可用');
    const saved = await deps.persist(context);
    if (saved !== true) throw new Error('本地保存失败');
  }

  async function persistFailure(deps, context) {
    if (typeof deps.persist !== 'function') return;
    try { await deps.persist(context); } catch {}
  }

  function applyBasic(candidate, basic) {
    Object.entries(BASIC_FIELDS).forEach(([candidateField, resultField]) => {
      const value = basic?.[resultField] ?? basic?.[candidateField];
      if (isEmpty(candidate[candidateField]) && !isEmpty(value)) candidate[candidateField] = value;
    });
  }

  function applyProfile(candidate, profile) {
    PROFILE_FIELDS.forEach(field => {
      if (profile && Object.prototype.hasOwnProperty.call(profile, field)) candidate[field] = profile[field];
    });
  }

  async function process(options = {}) {
    const { bundle, candidateId, versionId, canWrite, canUseAi, refreshRawText = false, deps = {} } = options;
    if (!canWrite) throw new Error('当前账号无权修改人才信息');
    const context = findVersion(bundle, candidateId, versionId);
    const { candidate, version } = context;

    try {
      if (!canUseAi) throw new Error('当前账号没有 AI 功能权限');
      if (typeof deps.assertConfigured === 'function') deps.assertConfigured();

      version.formatStatus = 'processing';
      version.formatError = '';
      candidate.profileProcessStatus = 'processing';
      candidate.profileProcessError = '';
      candidate.updatedAt = nowIso(deps);
      await persistOrThrow(deps, context);

      let rawText = String(version.rawText || '').trim();
      if (refreshRawText || !rawText) {
        if (typeof deps.loadRawText !== 'function') throw new Error('原始简历文件不存在且原始文本为空');
        const extractedText = String(await deps.loadRawText(version, candidate, { refresh: refreshRawText }) || '').trim();
        if (extractedText) {
          rawText = extractedText;
          version.rawText = extractedText;
          candidate.updatedAt = nowIso(deps);
          await persistOrThrow(deps, context);
        }
      }
      if (rawText.length < 40) throw new Error('简历文字太少，文本不可用');

      if (typeof deps.extractBasic !== 'function') throw new Error('AI 基础信息提取依赖不可用');
      const basic = await deps.extractBasic(rawText, version.fileName || '', candidate);
      applyBasic(candidate, basic);
      candidate.updatedAt = nowIso(deps);
      await persistOrThrow(deps, context);

      if (typeof deps.extractProfile !== 'function') throw new Error('AI 画像提取依赖不可用');
      const profile = await deps.extractProfile(rawText, version.fileName || '', candidate);
      applyProfile(candidate, profile);
      candidate.profileProcessStatus = 'done';
      candidate.profileProcessError = '';
      candidate.profileProcessedAt = nowIso(deps);
      candidate.updatedAt = nowIso(deps);
      await persistOrThrow(deps, context);

      if (typeof deps.format !== 'function') throw new Error('AI 电子简历排版依赖不可用');
      const formattedText = String(await deps.format(rawText, version.fileName || '', candidate) || '').trim();
      if (!formattedText) throw new Error('AI 返回数据格式不正确');
      version.formattedText = formattedText;
      version.formatStatus = 'done';
      version.formatError = '';
      version.formattedAt = nowIso(deps);
      candidate.updatedAt = nowIso(deps);
      await persistOrThrow(deps, context);
      if (typeof deps.scheduleSync === 'function') deps.scheduleSync();
      return context;
    } catch (error) {
      const safeMessage = sanitizeError(error);
      version.formatStatus = 'failed';
      version.formatError = safeMessage;
      if (candidate.profileProcessStatus !== 'done') {
        candidate.profileProcessStatus = 'failed';
        candidate.profileProcessError = safeMessage;
      }
      candidate.updatedAt = nowIso(deps);
      await persistFailure(deps, context);
      throw new Error(safeMessage);
    }
  }

  function createQueue() {
    return { tail: Promise.resolve(), active: new Map() };
  }

  function enqueue(queue, task, runner) {
    const key = `${task.candidateId}:${task.versionId}`;
    if (queue.active.has(key)) return queue.active.get(key);
    const run = queue.tail.then(() => runner(task));
    queue.tail = run.catch(() => {});
    queue.active.set(key, run);
    run.finally(() => queue.active.delete(key)).catch(() => {});
    return run;
  }

  function recoverInterrupted(bundle, taskKeys = []) {
    const recovered = [];
    taskKeys.forEach(key => {
      const separator = String(key || '').indexOf(':');
      if (separator < 1) return;
      const candidateId = key.slice(0, separator);
      const versionId = key.slice(separator + 1);
      let context;
      try { context = findVersion(bundle, candidateId, versionId); } catch { return; }
      if (!['processing', 'queued'].includes(context.version.formatStatus)) return;
      if (context.version.formatStatus === 'processing') context.version.formatStatus = 'queued';
      if (context.candidate.profileProcessStatus === 'processing') context.candidate.profileProcessStatus = 'queued';
      recovered.push({ candidateId, versionId });
    });
    return recovered;
  }

  return { createQueue, findVersion, process, enqueue, recoverInterrupted, sanitizeError };
});
