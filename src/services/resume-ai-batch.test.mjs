import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
await import('./resume-ai-batch.js');
const { createBatchRunner } = globalThis.WorkBuddyResumeAiBatch;
const indexHtml = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');

test('批量处理默认跳过已完成版本，并在单项失败后继续', async () => {
  const calls = [];
  const runner = createBatchRunner({
    enqueue: async task => {
      calls.push(task.versionId);
      if (task.versionId === 'v2') throw new Error('AI_TIMEOUT');
    },
  });
  const tasks = [
    { candidateId: 'c1', versionId: 'v1', fileName: 'done.pdf', formatStatus: 'done', formattedText: '已排版' },
    { candidateId: 'c2', versionId: 'v2', fileName: 'failed.pdf', formatStatus: 'failed' },
    { candidateId: 'c3', versionId: 'v3', fileName: 'queued.pdf', formatStatus: 'queued' },
  ];

  await runner.start(tasks);

  assert.deepEqual(calls, ['v2', 'v3']);
  assert.deepEqual(runner.state, {
    running: false,
    cancelled: false,
    current: null,
    total: 2,
    completed: 1,
    failed: 1,
    skipped: 1,
    errors: [{ candidateId: 'c2', versionId: 'v2', fileName: 'failed.pdf', message: 'AI_TIMEOUT' }],
  });
});

test('批量任务按顺序执行，取消后不再启动新任务', async () => {
  const calls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runner = createBatchRunner({
    enqueue: async task => {
      calls.push(task.versionId);
      if (task.versionId === 'v1') await gate;
    },
  });
  const promise = runner.start([
    { candidateId: 'c1', versionId: 'v1', fileName: 'one.pdf', formatStatus: 'queued' },
    { candidateId: 'c2', versionId: 'v2', fileName: 'two.pdf', formatStatus: 'queued' },
  ]);
  runner.cancel();
  release();
  await promise;

  assert.deepEqual(calls, ['v1']);
  assert.equal(runner.state.cancelled, true);
  assert.equal(runner.state.completed, 1);
});

test('批量处理支持从原始文件重新提取选项，并保留已完成版本的重试入口', async () => {
  const options = [];
  const runner = createBatchRunner({
    enqueue: async task => { options.push(task.refreshRawText); },
  });
  await runner.start([
    { candidateId: 'c1', versionId: 'v1', fileName: 'done.pdf', formatStatus: 'done', formattedText: '已排版' },
  ], { refreshRawText: true, includeCompleted: true });

  assert.deepEqual(options, [true]);
  assert.equal(runner.state.completed, 1);
});

test('人才库页面提供批量重新处理入口和进度动作', () => {
  assert.match(indexHtml, /resume-ai-batch\.js/);
  assert.match(indexHtml, /resumeAiBatch/);
  assert.match(indexHtml, /startResumeAiBatch/);
  assert.match(indexHtml, /retryResumeAiBatch/);
  assert.match(indexHtml, /cancelResumeAiBatch/);
  assert.match(indexHtml, /批量重新处理/);
  assert.match(indexHtml, /重试失败项/);
});
