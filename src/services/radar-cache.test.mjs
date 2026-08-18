import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./radar-cache.js');
const { createRadarCache } = globalThis.WorkBuddyRadarCache;

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('雷达缓存保存时间戳并在有效期内恢复', () => {
  const cache = createRadarCache({ storage: storage(), storageKey: 'radar', maxAgeMs: 1000 });
  cache.save({ news: [{ title: 'A' }] }, 1000);
  assert.deepEqual(cache.load(1999), { news: [{ title: 'A' }], timestamp: 1000 });
});

test('雷达缓存超过有效期或 JSON 损坏时安全返回空', () => {
  const target = storage();
  const cache = createRadarCache({ storage: target, storageKey: 'radar', maxAgeMs: 1000 });
  cache.save({ news: [] }, 1000);
  assert.equal(cache.load(2000), null);
  target.setItem('radar', '{bad');
  assert.equal(cache.load(1001), null);
});
