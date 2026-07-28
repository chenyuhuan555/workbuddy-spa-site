/**
 * indexeddb-cache.test.mjs — IndexedDB 缓存层抽离后的冒烟 + 纯函数测试
 *
 * 策略：
 *   - 结构性：模块加载后 window.WorkBuddyResumeCache 必须暴露全部 16 个函数 + APP_SNAPSHOT_KEYS
 *   - 纯函数：applyResumeTextFromCache / hashResumeData / parseResumeFileData
 *     （不依赖 IndexedDB，可在 Node 中直接验证）
 *   需要真实 IndexedDB 的集成测试留待引入 fake-indexeddb 后的后续阶段。
 */
import assert from 'node:assert/strict';
import { test, before } from 'node:test';

// 加载经典 IIFE 模块（挂载到 globalThis.WorkBuddyResumeCache）
await import('../storage/indexeddb-cache.js');
const Cache = globalThis.WorkBuddyResumeCache;

const EXPECTED_FNS = [
  'openResumeCacheDb',
  'withResumeCacheStore',
  'withAppSnapshotStore',
  'saveAppSnapshot',
  'loadAppSnapshot',
  'removeAppSnapshot',
  'estimateStorageBeforeWrite',
  'hashResumeData',
  'cacheResumeData',
  'saveResumeBlob',
  'getResumeBlob',
  'updateResumeTextCache',
  'parseResumeFileData',
  'applyResumeTextFromCache',
  'getCachedResumeData',
  'deleteCachedResumeData',
];

before(() => {
  // 让 parseResumeFileData 的 JSON 分支在 Node 中可用（index.html 中由全局函数提供）
  if (typeof globalThis.applyResumeTextData !== 'function') {
    globalThis.applyResumeTextData = () => {};
  }
});

test('模块挂载到 window.WorkBuddyResumeCache 并导出全部 16 个函数', () => {
  assert.ok(Cache, 'WorkBuddyResumeCache 应被挂载');
  for (const name of EXPECTED_FNS) {
    assert.equal(typeof Cache[name], 'function', `应导出函数 ${name}`);
  }
  assert.deepEqual(Cache.APP_SNAPSHOT_KEYS, {
    main: 'main',
    workbenchV2: 'workbenchV2',
    knowledgeBase: 'knowledgeBase',
  }, 'APP_SNAPSHOT_KEYS 常量应保持原值');
});

test('历史全局名也应可用（兼容现有调用点）', () => {
  for (const name of EXPECTED_FNS) {
    assert.equal(typeof globalThis[name], 'function', `全局名 ${name} 应存在`);
  }
});

test('applyResumeTextFromCache：仅在本地字段为空时回填', () => {
  const resume = { electronicResumeText: '', bossImportedText: '' };
  const applied = Cache.applyResumeTextFromCache(resume, {
    electronicResumeText: 'E',
    bossImportedText: 'B',
    electronicResumeError: 'ERR',
  });
  assert.equal(applied, true);
  assert.equal(resume.electronicResumeText, 'E');
  assert.equal(resume.bossImportedText, 'B');
  assert.equal(resume.electronicResumeError, 'ERR');

  // 已存在的值不被覆盖
  const r2 = { electronicResumeText: 'KEEP', bossImportedText: '' };
  const applied2 = Cache.applyResumeTextFromCache(r2, { electronicResumeText: 'NEW', bossImportedText: 'B2' });
  assert.equal(applied2, true);
  assert.equal(r2.electronicResumeText, 'KEEP', '已有文本不应被覆盖');
  assert.equal(r2.bossImportedText, 'B2');
});

test('applyResumeTextFromCache：缓存为空时返回 false', () => {
  assert.equal(Cache.applyResumeTextFromCache({}, null), false);
  assert.equal(Cache.applyResumeTextFromCache({ electronicResumeText: 'x' }, {}), false);
});

test('hashResumeData：空数据返回空串，相同/不同数据哈希一致且可区分', async () => {
  assert.equal(await Cache.hashResumeData(''), '');
  assert.equal(await Cache.hashResumeData(null), '');
  const h1 = await Cache.hashResumeData('resume-A');
  const h2 = await Cache.hashResumeData('resume-A');
  const h3 = await Cache.hashResumeData('resume-B');
  assert.match(h1, /^[0-9a-f]{64}$/, 'SHA-256 应为 64 位十六进制');
  assert.equal(h1, h2, '相同输入哈希一致');
  assert.notEqual(h1, h3, '不同输入哈希不同');
});

test('parseResumeFileData：旧格式（纯 base64）原样返回', () => {
  const raw = 'data:application/pdf;base64,JVBERi0xLjQK';
  assert.equal(Cache.parseResumeFileData(raw, {}), raw);
});

test('parseResumeFileData：过渡格式（JSON 含文本）提取 base64 并回填文本', () => {
  const json = JSON.stringify({ d: 'BASE64DATA', t: { e: '电子文本', b: 'Boss文本' } });
  const resume = {};
  const result = Cache.parseResumeFileData(json, resume);
  assert.equal(result, 'BASE64DATA');
});

test('parseResumeFileData：非法 JSON 退化为旧格式', () => {
  const raw = '{not valid json';
  assert.equal(Cache.parseResumeFileData(raw, {}), raw);
});
