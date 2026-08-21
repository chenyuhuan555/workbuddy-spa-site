import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./unified-date-filter.js');
const DateFilter = globalThis.WorkBuddyUnifiedDateFilter;

test('统一日期筛选支持今天、本周、本月和自定义范围', () => {
  const now = new Date('2026-08-20T12:00:00');
  const rows = [
    { id: 'today', updatedAt: '2026-08-20T09:00:00' },
    { id: 'week', updatedAt: '2026-08-17T09:00:00' },
    { id: 'old', updatedAt: '2026-07-31T09:00:00' },
  ];
  assert.deepEqual(DateFilter.filterRows(rows, { dimension: 'updatedAt', preset: 'today' }, now).map(row => row.id), ['today']);
  assert.deepEqual(DateFilter.filterRows(rows, { dimension: 'updatedAt', preset: 'week' }, now).map(row => row.id), ['today', 'week']);
  assert.deepEqual(DateFilter.filterRows(rows, { dimension: 'updatedAt', preset: 'custom', from: '2026-08-17', to: '2026-08-19' }, now).map(row => row.id), ['week']);
});

test('统一日期筛选按业务维度读取嵌套的 Application 日期', () => {
  const rows = [{ id: 'application-1', application: { interviewAt: '2026-08-20T10:00:00' } }];
  assert.equal(DateFilter.matches(rows[0], { dimension: 'interviewAt', preset: 'today' }, new Date('2026-08-20T12:00:00')), true);
});
