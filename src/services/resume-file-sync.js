;(function initResumeFileSync(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeFileSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeFileSync() {
  'use strict';

  function buildCloudPath({ candidateId, versionId, fileId }) {
    return `workspace/main/resumes/${encodeURIComponent(candidateId)}/${encodeURIComponent(versionId)}/${encodeURIComponent(fileId)}`;
  }

  function inferResumeMimeType(fileName) {
    const extension = String(fileName || '').toLowerCase().split('.').pop();
    return ({
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      txt: 'text/plain',
    })[extension] || 'application/octet-stream';
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

  function sanitizeFileError(error) {
    const code = String(error?.code || '');
    const text = `${code} ${String(error?.message || '')}`;
    if (code === 'AUTH_REQUIRED' || /unauthorized|\b401\b/i.test(text)) {
      return { code: 'AUTH_REQUIRED', message: '登录状态已失效，请重新登录后重试' };
    }
    if (code === 'STORAGE_FORBIDDEN' || /forbidden|row.level.security|\b403\b/i.test(text)) {
      return { code: 'STORAGE_FORBIDDEN', message: '当前账号没有原始文件访问权限' };
    }
    if (code === 'STORAGE_NOT_FOUND' || /not.?found|\b404\b/i.test(text)) {
      return { code: 'STORAGE_NOT_FOUND', message: '云端原始文件不存在' };
    }
    if (code === 'STORAGE_RATE_LIMITED' || /rate|limit|\b429\b/i.test(text)) {
      return { code: 'STORAGE_RATE_LIMITED', message: '原始文件同步请求过于频繁，请稍后重试' };
    }
    if (code === 'LOCAL_FILE_MISSING') {
      return { code, message: '当前设备没有可同步的原始文件' };
    }
    if (/network|fetch|BACKEND_REQUEST_FAILED/i.test(text)) {
      return { code: 'STORAGE_NETWORK', message: '原件缺失' };
    }
    return { code: 'STORAGE_FAILED', message: '原件缺失' };
  }

  async function persistOrThrow(deps) {
    if (typeof deps.persist !== 'function') throw new Error('原始文件状态保存依赖不可用');
    const saved = await deps.persist();
    if (saved !== true) throw new Error('原始文件状态保存失败');
  }

  async function syncOriginal({ candidateId, versionId, version }, deps = {}) {
    let local;
    try {
      local = await deps.getLocal?.(version.fileId);
    } catch (error) {
      const safe = sanitizeFileError(error);
      throw Object.assign(new Error(safe.message), { code: safe.code });
    }
    if (!local?.blob) {
      const safe = sanitizeFileError({ code: 'LOCAL_FILE_MISSING' });
      version.originalFileStatus = 'sync-failed';
      version.originalFileError = safe.message;
      await persistOrThrow(deps);
      throw Object.assign(new Error(safe.message), { code: safe.code });
    }

    const path = version.cloudFilePath || buildCloudPath({ candidateId, versionId, fileId: version.fileId });
    version.cloudFilePath = path;
    version.originalFileStatus = 'syncing';
    version.originalFileError = '';
    await persistOrThrow(deps);

    try {
      await deps.upload({
        path,
        blob: local.blob,
        contentType: version.fileType || local.fileType || local.blob.type || inferResumeMimeType(version.fileName),
      });
    } catch (error) {
      if (error?.code === 'STORAGE_ALREADY_EXISTS') {
        try {
          const existing = await deps.download(path);
          if (!(existing instanceof Blob)) throw Object.assign(new Error('云端原始文件不存在'), { code: 'STORAGE_NOT_FOUND' });
        } catch (verifyError) {
          const safe = sanitizeFileError(verifyError);
          version.originalFileStatus = 'sync-failed';
          version.originalFileError = safe.message;
          await persistOrThrow(deps);
          throw Object.assign(new Error(safe.message), { code: safe.code });
        }
      } else {
        const safe = sanitizeFileError(error);
        version.originalFileStatus = 'sync-failed';
        version.originalFileError = safe.message;
        await persistOrThrow(deps);
        throw Object.assign(new Error(safe.message), { code: safe.code });
      }
    }

    version.originalFileStatus = 'synced';
    version.originalFileError = '';
    version.originalFileSyncedAt = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();
    await persistOrThrow(deps);
    deps.scheduleSync?.();
    return { path };
  }

  async function cacheDownloaded(version, record, deps, source) {
    await deps.saveLocal(version.fileId, record.blob, {
      fileName: version.fileName || '',
      fileType: record.fileType || version.fileType || record.blob.type || '',
      fileSize: version.fileSize || record.blob.size || 0,
      fileHash: version.fileHash || '',
    });
    return { ...record, source };
  }

  async function loadOriginal(version, deps = {}) {
    if (version.fileId) {
      const local = await deps.getLocal?.(version.fileId);
      if (local?.blob) return { ...local, source: 'local' };
    }

    if (version.cloudFilePath) {
      try {
        const blob = await deps.download(version.cloudFilePath);
        if (!(blob instanceof Blob)) throw Object.assign(new Error('云端原始文件不存在'), { code: 'STORAGE_NOT_FOUND' });
        return cacheDownloaded(version, { blob, fileType: version.fileType || blob.type }, deps, 'cloud');
      } catch (error) {
        if (error?.code !== 'STORAGE_NOT_FOUND') throw error;
      }
    }

    const legacy = await deps.loadLegacy?.(version);
    if (legacy?.blob) return cacheDownloaded(version, legacy, deps, 'legacy');
    throw Object.assign(new Error('原始文件不可用'), { code: 'ORIGINAL_NOT_FOUND' });
  }

  function recoverInterrupted(version) {
    if (version?.originalFileStatus === 'syncing') version.originalFileStatus = 'local-only';
    return version;
  }

  return Object.freeze({
    buildCloudPath,
    inferResumeMimeType,
    createQueue,
    enqueue,
    syncOriginal,
    loadOriginal,
    recoverInterrupted,
    sanitizeFileError,
  });
});
