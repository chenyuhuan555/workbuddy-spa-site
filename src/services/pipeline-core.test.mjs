import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../constants/pipeline-stages.js');
await import('./pipeline-core.js');

const pipeline = globalThis.WorkBuddyPipeline;

test('Pipeline 核心模块挂载完整阶段接口', () => {
  assert.ok(pipeline);
  assert.equal(pipeline.STAGES.length > 0, true);
  assert.equal(typeof pipeline.appendStageEvent, 'function');
  assert.equal(typeof pipeline.ensurePipelineData, 'function');
  assert.equal(typeof pipeline.buildFunnelMetrics, 'function');
});

test('Pipeline 核心模块保留阶段推进校验和事件写入', () => {
  const resume = { pipelineStage: pipeline.KEYS.DISCOVERED, pipelineEvents: [] };
  const event = pipeline.appendStageEvent(resume, {
    toStage: pipeline.KEYS.CONTACTED,
    occurredAt: '2026-08-03T00:00:00.000Z',
  });
  assert.equal(event.toStage, pipeline.KEYS.CONTACTED);
  assert.equal(resume.pipelineStage, pipeline.KEYS.CONTACTED);
  assert.throws(() => pipeline.appendStageEvent(resume, { toStage: 'invalid' }), /无效推进阶段/);
});
