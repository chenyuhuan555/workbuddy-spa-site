import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./metrics-snapshot.js');
const { createMetricsSnapshot } = globalThis.WorkBuddyMetricsSnapshot;

test('指标快照按业务键隔离并规范化日期', () => {
  const values = new Map();
  const snapshot = createMetricsSnapshot({
    storage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
    key: 'main',
    now: () => new Date('2026-08-03T12:00:00Z'),
  });
  snapshot.write({ candidates: 106 });
  assert.equal(snapshot.todayDateStr(), '2026-08-03');
  assert.deepEqual(snapshot.read().metrics, { candidates: 106 });
});

test('损坏快照读取时安全返回空值', () => {
  const snapshot = createMetricsSnapshot({ storage: { getItem: () => '{bad' }, key: 'main' });
  assert.equal(snapshot.read(), null);
});
