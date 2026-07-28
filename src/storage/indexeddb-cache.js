/**
 * indexeddb-cache.js — 简历 / 应用快照本地缓存层（IndexedDB 封装）
 *
 * 职责：
 *   - 简历文本 / 二进制（blob）的本地备份、去重与读取
 *   - 应用快照（main / workbenchV2 / knowledgeBase）持久化
 *   - 浏览器存储配额预估
 *
 * 来源：从 index.html 的内联脚本中抽离（Phase 2 模块化）。
 * 加载方式：经典 <script> 标签，挂载到 window.WorkBuddyResumeCache。
 *           同时沿用历史全局函数名（openResumeCacheDb 等），兼容现有调用点。
 * 后续迁移：调用点逐步改为 window.WorkBuddyResumeCache.X，并最终改为
 *           ES module export（Vite 打包阶段）。
 *
 * @module storage/indexeddb-cache
 */
;(function (root) {
  'use strict';

  // STORAGE_KEY 由 index.html 内联脚本以顶层 const 定义（全局词法环境共享）。
  // 此处延迟到调用时读取，避免模块加载期访问尚未初始化的 STORAGE_KEY（TDZ）。
  function resumeCacheDbName() {
    return STORAGE_KEY + '_resume_cache';
  }
const RESUME_CACHE_STORE = 'files';
const APP_SNAPSHOT_STORE = 'appSnapshots';
const APP_SNAPSHOT_KEYS = {
  main: 'main',
  workbenchV2: 'workbenchV2',
  knowledgeBase: 'knowledgeBase',
};

function openResumeCacheDb() {
  if (!window.indexedDB) return Promise.reject(new Error('IndexedDB 不可用'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(resumeCacheDbName(), 5);
    req.onupgradeneeded = () => {
      const db = req.result;
      let store;
      if (!db.objectStoreNames.contains(RESUME_CACHE_STORE)) {
        store = db.createObjectStore(RESUME_CACHE_STORE, { keyPath: 'id' });
      } else {
        store = req.transaction.objectStore(RESUME_CACHE_STORE);
      }
      if (!store.indexNames.contains('hash')) {
        store.createIndex('hash', 'hash', { unique: false });
      }
      if (!db.objectStoreNames.contains(APP_SNAPSHOT_STORE)) {
        db.createObjectStore(APP_SNAPSHOT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(APP_SNAPSHOT_STORE)) {
        db.close();
        reject(new Error('应用快照存储不可用'));
        return;
      }
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('打开简历缓存失败'));
  });
}

async function withResumeCacheStore(mode, handler) {
  const db = await openResumeCacheDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(RESUME_CACHE_STORE, mode);
      const store = tx.objectStore(RESUME_CACHE_STORE);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('简历缓存事务失败'));
      tx.onabort = () => reject(tx.error || new Error('简历缓存事务中断'));
      result = handler(store);
    });
  } finally {
    db.close();
  }
}

async function withAppSnapshotStore(mode, handler) {
  const db = await openResumeCacheDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_SNAPSHOT_STORE, mode);
      const store = tx.objectStore(APP_SNAPSHOT_STORE);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('应用快照事务失败'));
      tx.onabort = () => reject(tx.error || new Error('应用快照事务中断'));
      result = handler(store);
    });
  } finally {
    db.close();
  }
}

async function saveAppSnapshot(id, data) {
  if (!id) return;
  const snapshot = JSON.parse(JSON.stringify(data));
  await withAppSnapshotStore('readwrite', (store) => {
    store.put({ id, data: snapshot, savedAt: Date.now() });
  });
}

async function loadAppSnapshot(id) {
  if (!id) return null;
  return withAppSnapshotStore('readonly', (store) => new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error || new Error('读取应用快照失败'));
  }));
}

async function removeAppSnapshot(id) {
  if (!id) return;
  await withAppSnapshotStore('readwrite', (store) => {
    store.delete(id);
  });
}

async function estimateStorageBeforeWrite(bytesToWrite) {
  if (!navigator.storage || typeof navigator.storage.estimate !== 'function') return { shouldWarn: false };
  try {
    const estimate = await navigator.storage.estimate();
    const usage = Number(estimate.usage) || 0;
    const quota = Number(estimate.quota) || 0;
    if (!quota) return { shouldWarn: false, usage, quota };
    const incoming = Math.max(0, Number(bytesToWrite) || 0);
    const remaining = Math.max(0, quota - usage);
    const projectedRemaining = Math.max(0, quota - usage - incoming);
    return {
      shouldWarn: remaining / quota <= 0.15 || projectedRemaining / quota <= 0.10,
      usage,
      quota,
      remaining,
      projectedRemaining,
    };
  } catch (e) {
    console.warn('浏览器存储空间估算失败:', e.message);
    return { shouldWarn: false };
  }
}

async function hashResumeData(data) {
  if (!data || !crypto?.subtle || typeof TextEncoder === 'undefined') return '';
  const bytes = new TextEncoder().encode(String(data));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cacheResumeData(resumeId, data, extraFields) {
  if (!resumeId || !data || data.length < 100) return;
  try {
    await estimateStorageBeforeWrite(String(data).length);
    const hash = await hashResumeData(data);
    await withResumeCacheStore('readwrite', (store) => {
      if (!hash) {
        const record = { id: resumeId, data, cachedAt: Date.now() };
        if (extraFields) {
          if (extraFields.electronicResumeText) record.electronicResumeText = extraFields.electronicResumeText;
          if (extraFields.bossImportedText) record.bossImportedText = extraFields.bossImportedText;
        }
        store.put(record);
        return;
      }
      return new Promise((resolve, reject) => {
        const req = store.index('hash').get(hash);
        req.onerror = () => reject(req.error || new Error('查找重复简历缓存失败'));
        req.onsuccess = () => {
          const existing = req.result;
          const record = existing && existing.id !== resumeId
            ? { id: resumeId, hash, dataRef: existing.dataRef || existing.id, cachedAt: Date.now() }
            : { id: resumeId, hash, data, cachedAt: Date.now(), byteLength: String(data).length };
          if (extraFields) {
            if (extraFields.electronicResumeText) record.electronicResumeText = extraFields.electronicResumeText;
            if (extraFields.bossImportedText) record.bossImportedText = extraFields.bossImportedText;
          }
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error || new Error('写入简历缓存失败'));
        };
      });
    });
  } catch (e) {
    console.warn('简历本地备份失败:', e.message);
  }
}

// 阶段 3：原始简历二进制存外部 IndexedDB，复用现有 RESUME_CACHE_STORE（'files'），
// 不新建 store、不改 schema 版本、不把 base64 写进人才快照；快照只存 fileId/fileType/fileSize/fileHash 等元数据。
async function saveResumeBlob(fileId, blob, meta = {}) {
  if (!fileId || !blob) return false;
  try {
    await withResumeCacheStore('readwrite', (store) => {
      store.put({
        id: fileId,
        blob,
        fileName: meta.fileName || '',
        fileType: meta.fileType || '',
        fileSize: meta.fileSize || 0,
        fileHash: meta.fileHash || '',
        uploadedAt: new Date().toISOString(),
      });
    });
    return true;
  } catch (e) {
    console.warn('原始简历文件保存失败:', e.message);
    return false;
  }
}

async function getResumeBlob(fileId) {
  if (!fileId) return null;
  try {
    return await new Promise((resolve, reject) => {
      withResumeCacheStore('readonly', (store) => {
        const req = store.get(fileId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('原始文件读取失败'));
      });
    });
  } catch (e) {
    console.warn('原始简历文件读取失败:', e.message);
    return null;
  }
}

async function updateResumeTextCache(resumeId, textFields) {
  if (!resumeId || !textFields) return;
  try {
    const existing = await getCachedResumeData(resumeId);
    const record = { id: resumeId, data: existing || '', cachedAt: Date.now() };
    if (textFields.electronicResumeText) record.electronicResumeText = textFields.electronicResumeText;
    if (textFields.bossImportedText) record.bossImportedText = textFields.bossImportedText;
    if (textFields.electronicResumeError) record.electronicResumeError = textFields.electronicResumeError;
    await withResumeCacheStore('readwrite', (store) => {
      store.put(record);
    });
  } catch (e) {
    console.warn('简历文本缓存更新失败:', e.message);
  }
}

  // ★ 解析 resume 文件内容：兼容旧格式（纯 base64）和过渡格式（JSON 含文本）
  function parseResumeFileData(raw, resume) {
    if (!raw) return '';
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const base64 = parsed.d || '';
        if (parsed.t) {
          // 只在本地字段为空时才回填（优先保留已 AI 重新生成的文本）
          applyResumeTextData(resume, {
            electronicResumeText: parsed.t.e || '',
            bossImportedText: parsed.t.b || '',
          });
        }
        return base64;
      } catch (e) {
      // JSON 解析失败，当旧格式处理
      return raw;
    }
  }
  return raw; // 旧格式：纯 base64 data URI
}

  // ★ 从 IndexedDB 完整记录恢复大文本字段
  function applyResumeTextFromCache(resume, cachedRecord) {
    if (!cachedRecord) return false;
    let applied = false;
    if (cachedRecord.electronicResumeText && !resume.electronicResumeText) {
      resume.electronicResumeText = cachedRecord.electronicResumeText;
      applied = true;
    }
    if (cachedRecord.bossImportedText && !resume.bossImportedText) {
      resume.bossImportedText = cachedRecord.bossImportedText;
      applied = true;
    }
    if (cachedRecord.electronicResumeError && !resume.electronicResumeError) {
      resume.electronicResumeError = cachedRecord.electronicResumeError;
      applied = true;
    }
    return applied;
  }

async function getCachedResumeData(resumeId) {
  if (!resumeId) return '';
  try {
    const record = await withResumeCacheStore('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(resumeId);
        req.onsuccess = () => {
          const found = req.result || null;
          if (!found?.dataRef) {
            resolve(found);
            return;
          }
          const refReq = store.get(found.dataRef);
          refReq.onsuccess = () => resolve({ ...found, data: refReq.result?.data || '' });
          refReq.onerror = () => reject(refReq.error || new Error('读取重复简历源文件失败'));
        };
        req.onerror = () => reject(req.error || new Error('读取简历缓存失败'));
      });
    });
    return record?.data || '';
  } catch (e) {
    console.warn('读取简历本地备份失败:', e.message);
    return '';
  }
}

async function deleteCachedResumeData(resumeIds) {
  const ids = Array.isArray(resumeIds) ? resumeIds.filter(Boolean) : [];
  if (!ids.length) return;
  try {
    await withResumeCacheStore('readwrite', (store) => {
      ids.forEach(id => store.delete(id));
    });
  } catch (e) {
    console.warn('清理简历本地备份失败:', e.message);
  }
}

  // ── 导出 ──
  // 1) 命名空间：供后续阶段逐步迁移调用点
  root.WorkBuddyResumeCache = Object.freeze({
    openResumeCacheDb,
    withResumeCacheStore,
    withAppSnapshotStore,
    saveAppSnapshot,
    loadAppSnapshot,
    removeAppSnapshot,
    estimateStorageBeforeWrite,
    hashResumeData,
    cacheResumeData,
    saveResumeBlob,
    getResumeBlob,
    updateResumeTextCache,
    parseResumeFileData,
    applyResumeTextFromCache,
    getCachedResumeData,
    deleteCachedResumeData,
    APP_SNAPSHOT_KEYS,
  });

  // 2) 沿用历史全局函数名 + 常量，兼容现有调用点（后续阶段可移除）
  Object.assign(root, {
    openResumeCacheDb,
    withResumeCacheStore,
    withAppSnapshotStore,
    saveAppSnapshot,
    loadAppSnapshot,
    removeAppSnapshot,
    estimateStorageBeforeWrite,
    hashResumeData,
    cacheResumeData,
    saveResumeBlob,
    getResumeBlob,
    updateResumeTextCache,
    parseResumeFileData,
    applyResumeTextFromCache,
    getCachedResumeData,
    deleteCachedResumeData,
    APP_SNAPSHOT_KEYS,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
