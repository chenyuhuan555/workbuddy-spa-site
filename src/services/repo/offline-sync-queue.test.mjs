import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./offline-sync-queue.js');
const { createOfflineSyncQueue } = globalThis.WorkBuddyOfflineSyncQueue;

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('离线队列持久化、去重并返回到期任务', () => {
  const storage = createStorage();
  const queue = createOfflineSyncQueue({ storage, key: 'queue', now: () => 1000 });
  queue.enqueue([{ kind: 'companies', id: 'c1', model: { id: 'c1', name: '旧' } }]);
  queue.enqueue([{ kind: 'companies', id: 'c1', model: { id: 'c1', name: '新' } }]);
  assert.equal(queue.size(), 1);
  assert.equal(queue.listDue(1000)[0].model.name, '新');
});

test('离线队列失败采用退避，成功后移除', () => {
  const storage = createStorage();
  const queue = createOfflineSyncQueue({ storage, key: 'queue', now: () => 1000, retryBaseMs: 100 });
  queue.enqueue([{ kind: 'positions', id: 'p1', model: { id: 'p1' } }]);
  const item = queue.listDue(1000)[0];
  queue.markFailure([item], '网络失败', 1000);
  assert.equal(queue.listDue(1099).length, 0);
  assert.equal(queue.listDue(1100).length, 1);
  queue.markSuccess(queue.listDue(1100));
  assert.equal(queue.size(), 0);
});
