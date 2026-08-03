import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./application-display.js');
const display = globalThis.WorkBuddyApplicationDisplay;

test('推进时间按北京时间格式化', () => {
  assert.match(display.formatBeijingDateTime('2026-08-03T00:00:00.000Z'), /^2026-08-03 08:00$/);
});

test('推进阶段状态从最近阶段事件取进入时间', () => {
  const status = display.getApplicationStageStatus({ stage: 'interview', updatedAt: 'fallback', pipelineEvents: [{ toStage: 'interview', occurredAt: '2026-08-03T00:00:00.000Z' }] }, input => ({ overdue: false, enteredAt: input.pipelineStageEnteredAt }));
  assert.equal(status.enteredAt, '2026-08-03T00:00:00.000Z');
});
