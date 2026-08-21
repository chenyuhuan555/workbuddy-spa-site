import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.window = globalThis;
await import('./deferred-startup.js');
const scheduler = globalThis.WorkBuddyDeferredStartup;

test('空闲调度优先使用 requestIdleCallback 并触发任务', async () => {
  let idleTask = null;
  let ran = 0;
  assert.equal(scheduler.schedule(() => { ran += 1; }, {
    requestIdleCallback: task => { idleTask = task; },
    setTimeout: () => { throw new Error('不应回退到 setTimeout'); },
  }), true);
  idleTask();
  await Promise.resolve();
  assert.equal(ran, 1);
});

test('不支持 requestIdleCallback 时延后执行任务', async () => {
  let delayedTask = null;
  let ran = 0;
  scheduler.schedule(() => { ran += 1; }, {
    requestIdleCallback: null,
    setTimeout: task => { delayedTask = task; },
  });
  assert.equal(ran, 0);
  delayedTask();
  await Promise.resolve();
  assert.equal(ran, 1);
});
