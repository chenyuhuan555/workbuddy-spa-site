import test from 'node:test';
import assert from 'node:assert/strict';
import { createSerialSaveQueue } from './resume-background-save-queue.js';

test('resume background save queue serializes saves and preserves later work after failure', async () => {
  const events = [];
  let release;
  const firstGate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const queue = createSerialSaveQueue(async () => {
    calls++;
    events.push(`start:${calls}`);
    if (calls === 1) {
      await firstGate;
      events.push('fail:1');
      throw new Error('first failed');
    }
    events.push(`done:${calls}`);
    return calls;
  });
  const first = queue.run();
  const second = queue.run();
  release();
  await assert.rejects(first, /first failed/);
  assert.equal(await second, 2);
  assert.deepEqual(events, ['start:1', 'fail:1', 'start:2', 'done:2']);
});
