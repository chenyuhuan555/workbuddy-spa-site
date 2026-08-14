import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const MODULE_URL = new URL('./resume-file-sync.js', import.meta.url);
if (existsSync(MODULE_URL)) await import(MODULE_URL);
const Files = globalThis.WorkBuddyResumeFileSync;
globalThis.window = globalThis;
await import('../supabase-workspace.js');
const Workspace = globalThis.WorkBuddyWorkspace;

test('原件同步服务已加载', () => {
  assert.ok(Files);
});

test('云端路径只使用稳定 ID，不包含姓名和原文件名', () => {
  assert.equal(
    Files.buildCloudPath({ candidateId: 'c 1', versionId: 'r/1', fileId: 'f1' }),
    'workspace/main/resumes/c%201/r%2F1/f1',
  );
});

test('本机有 blob 时不请求云端', async () => {
  let downloads = 0;
  const localBlob = new Blob(['local'], { type: 'application/pdf' });
  const result = await Files.loadOriginal({ fileId: 'f1', cloudFilePath: 'remote/f1' }, {
    getLocal: async () => ({ blob: localBlob, fileType: 'application/pdf' }),
    download: async () => { downloads++; },
    saveLocal: async () => assert.fail('不应回写已有本地文件'),
  });

  assert.equal(result.source, 'local');
  assert.equal(result.blob, localBlob);
  assert.equal(downloads, 0);
});

test('本机缺失时下载私有云端文件并缓存', async () => {
  const cached = [];
  const remoteBlob = new Blob(['remote'], { type: 'application/pdf' });
  const result = await Files.loadOriginal({
    fileId: 'f1', fileName: 'a.pdf', fileType: 'application/pdf', cloudFilePath: 'remote/f1',
  }, {
    getLocal: async () => null,
    download: async path => {
      assert.equal(path, 'remote/f1');
      return remoteBlob;
    },
    saveLocal: async (...args) => cached.push(args),
  });

  assert.equal(result.source, 'cloud');
  assert.equal(result.blob, remoteBlob);
  assert.equal(cached.length, 1);
  assert.equal(cached[0][0], 'f1');
});

test('本机和云端均无原件时使用旧来源并缓存', async () => {
  const legacyBlob = new Blob(['legacy'], { type: 'application/pdf' });
  let cached = false;
  const result = await Files.loadOriginal({ fileId: 'f1', fileName: 'old.pdf' }, {
    getLocal: async () => null,
    loadLegacy: async () => ({ blob: legacyBlob, fileType: 'application/pdf' }),
    saveLocal: async () => { cached = true; },
  });

  assert.equal(result.source, 'legacy');
  assert.equal(result.blob, legacyBlob);
  assert.equal(cached, true);
});

test('云端网络错误不会被误判为原件永久缺失', async () => {
  const error = Object.assign(new Error('network failed'), { code: 'BACKEND_REQUEST_FAILED' });
  await assert.rejects(() => Files.loadOriginal({ fileId: 'f1', cloudFilePath: 'remote/f1' }, {
    getLocal: async () => null,
    download: async () => { throw error; },
    saveLocal: async () => {},
    loadLegacy: async () => assert.fail('网络错误时不应伪装成云端不存在'),
  }), candidate => candidate === error);
});

test('云端上传失败保留本地引用并保存可重试状态', async () => {
  const version = { fileId: 'f1', fileType: 'application/pdf', originalFileStatus: 'local-only' };
  const states = [];
  await assert.rejects(() => Files.syncOriginal({ candidateId: 'c1', versionId: 'r1', version }, {
    getLocal: async () => ({ blob: new Blob(['x'], { type: 'application/pdf' }) }),
    upload: async () => { throw Object.assign(new Error('fetch failed'), { code: 'BACKEND_REQUEST_FAILED' }); },
    download: async () => null,
    persist: async () => { states.push(version.originalFileStatus); return true; },
  }), /原件缺失/);

  assert.deepEqual(states, ['syncing', 'sync-failed']);
  assert.equal(version.originalFileStatus, 'sync-failed');
  assert.equal(version.fileId, 'f1');
  assert.match(version.originalFileError, /原件缺失/);
});

test('浏览器未提供 MIME 时按文件扩展名上传允许的内容类型', async () => {
  const version = { fileId: 'f1', fileName: '候选人.docx', fileType: '', originalFileStatus: 'local-only' };
  let uploadedContentType = '';
  await Files.syncOriginal({ candidateId: 'c1', versionId: 'r1', version }, {
    getLocal: async () => ({ blob: new Blob(['docx']), fileType: '' }),
    upload: async ({ contentType }) => { uploadedContentType = contentType; },
    persist: async () => true,
  });

  assert.equal(uploadedContentType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

test('对象已存在且可读取时重试收敛为 synced', async () => {
  const version = { fileId: 'f1', fileType: 'application/pdf', originalFileStatus: 'sync-failed' };
  let verified = 0;
  await Files.syncOriginal({ candidateId: 'c1', versionId: 'r1', version }, {
    getLocal: async () => ({ blob: new Blob(['x'], { type: 'application/pdf' }) }),
    upload: async () => { throw Object.assign(new Error('duplicate'), { code: 'STORAGE_ALREADY_EXISTS' }); },
    download: async () => { verified++; return new Blob(['remote']); },
    persist: async () => true,
    now: () => '2026-07-30T10:00:00.000Z',
  });

  assert.equal(verified, 1);
  assert.equal(version.originalFileStatus, 'synced');
  assert.equal(version.originalFileSyncedAt, '2026-07-30T10:00:00.000Z');
});

test('同步队列串行运行并合并同一版本重复任务', async () => {
  const queue = Files.createQueue();
  const order = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runner = async task => {
    order.push(`start:${task.versionId}`);
    if (task.versionId === 'r1') await gate;
    order.push(`end:${task.versionId}`);
  };
  const first = Files.enqueue(queue, { candidateId: 'c1', versionId: 'r1' }, runner);
  const duplicate = Files.enqueue(queue, { candidateId: 'c1', versionId: 'r1' }, runner);
  const second = Files.enqueue(queue, { candidateId: 'c1', versionId: 'r2' }, runner);

  assert.equal(first, duplicate);
  await Promise.resolve();
  assert.deepEqual(order, ['start:r1']);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['start:r1', 'end:r1', 'start:r2', 'end:r2']);
});

test('刷新恢复只把 syncing 调整为可重试，不改成功状态', () => {
  const interrupted = { originalFileStatus: 'syncing' };
  const synced = { originalFileStatus: 'synced' };
  Files.recoverInterrupted(interrupted);
  Files.recoverInterrupted(synced);
  assert.equal(interrupted.originalFileStatus, 'local-only');
  assert.equal(synced.originalFileStatus, 'synced');
});

test('文件错误分类不泄露底层响应内容', () => {
  const leaked = 'private-response-body';
  const safe = Files.sanitizeFileError(Object.assign(new Error(`403 forbidden ${leaked}`), { code: 'STORAGE_FORBIDDEN' }));
  assert.equal(safe.code, 'STORAGE_FORBIDDEN');
  assert.equal(safe.message, '当前账号没有原始文件访问权限');
  assert.doesNotMatch(safe.message, /private-response-body/);
});

test('Supabase 文件接口保留安全的权限和重复对象错误码', async () => {
  const errors = [
    { code: '403', message: 'row level security policy denied private body' },
    { code: '409', message: 'The resource already exists private body' },
  ];
  const supabase = {
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: errors.shift() }),
      }),
    },
  };
  const client = Workspace.createWorkspaceClient({
    supabase,
    getProfile: () => ({ status: 'active', role: 'editor', must_change_password: false }),
  });

  await assert.rejects(
    () => client.uploadFile({ path: 'p1', blob: new Blob(['x']), contentType: 'application/pdf' }),
    error => error.code === 'STORAGE_FORBIDDEN' && !error.message.includes('private body'),
  );
  await assert.rejects(
    () => client.uploadFile({ path: 'p2', blob: new Blob(['x']), contentType: 'application/pdf' }),
    error => error.code === 'STORAGE_ALREADY_EXISTS' && !error.message.includes('private body'),
  );
});
