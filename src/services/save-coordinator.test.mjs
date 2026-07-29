import test from 'node:test';
import assert from 'node:assert/strict';

await import('./save-coordinator.js');

const { createSaveCoordinator } = globalThis.WorkBuddySaveCoordinator;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('500ms 内连续脏标记合并为一个保存批次', async () => {
  const delays = [];
  const timers = new Map();
  let timerId = 0;
  const calls = [];
  const coordinator = createSaveCoordinator({
    delay: 500,
    save: async domains => calls.push([...domains].sort()),
    setTimer(callback, delay) {
      const id = ++timerId;
      delays.push(delay);
      timers.set(id, callback);
      return id;
    },
    clearTimer(id) { timers.delete(id); },
  });

  coordinator.markDirty('workbench');
  coordinator.markDirty('workbench');
  coordinator.markDirty('legacy');
  await coordinator.flush();

  assert.deepEqual(delays, [500, 500, 500]);
  assert.deepEqual(calls, [['legacy', 'workbench']]);
  assert.equal(timers.size, 0);
});

test('保存进行中新增脏数据会串行执行下一批', async () => {
  const firstRelease = deferred();
  const calls = [];
  let active = 0;
  let maxActive = 0;
  const coordinator = createSaveCoordinator({
    save: async domains => {
      calls.push([...domains]);
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (calls.length === 1) await firstRelease.promise;
      active -= 1;
    },
  });

  coordinator.markDirty('workbench');
  const draining = coordinator.flush();
  await Promise.resolve();
  coordinator.markDirty('legacy');
  firstRelease.resolve();
  await draining;

  assert.deepEqual(calls, [['workbench'], ['legacy']]);
  assert.equal(maxActive, 1);
  assert.equal(coordinator.getState().status, 'saved');
});

test('保存失败进入 error，retry 成功后进入 saved', async () => {
  let attempts = 0;
  const states = [];
  const coordinator = createSaveCoordinator({
    save: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('IndexedDB unavailable');
    },
  });
  coordinator.subscribe(state => states.push(state.status));

  coordinator.markDirty('workbench');
  await assert.rejects(coordinator.flush(), /IndexedDB unavailable/);
  assert.equal(coordinator.getState().status, 'error');
  assert.match(coordinator.getState().error, /IndexedDB unavailable/);

  await coordinator.retry();
  assert.equal(attempts, 2);
  assert.equal(coordinator.getState().status, 'saved');
  assert.deepEqual(states, ['idle', 'saving', 'error', 'saving', 'saved']);
});

test('dispose 取消待执行计时器并忽略后续标记', async () => {
  let saves = 0;
  let cleared = 0;
  const coordinator = createSaveCoordinator({
    save: async () => { saves += 1; },
    setTimer: () => 7,
    clearTimer: id => { if (id === 7) cleared += 1; },
  });

  coordinator.markDirty('workbench');
  coordinator.dispose();
  coordinator.markDirty('legacy');
  await coordinator.flush();

  assert.equal(cleared, 1);
  assert.equal(saves, 0);
});
