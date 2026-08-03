import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./metrics-delta.js');
const { buildDashboardDelta } = globalThis.WorkBuddyMetricsDelta;

test('仪表盘指标差值保留正负和零值展示规则', () => {
  const result = buildDashboardDelta({ candidates: 106, companies: 10 }, { candidates: 99, companies: 10 });
  assert.deepEqual(result.candidates, { text: '较昨日 +7 ↑', cls: 'text-emerald-600' });
  assert.deepEqual(result.companies, { text: '较昨日 0 —', cls: 'text-slate-400' });
});

test('首次使用或缺少基准时显示横线', () => {
  assert.deepEqual(buildDashboardDelta({ candidates: 106 }, null).candidates, { text: '较昨日 —', cls: 'text-slate-400' });
});
