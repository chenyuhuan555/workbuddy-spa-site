import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./radar-rss-config.js');
const { createRadarRssKeyStore } = globalThis.WorkBuddyRadarRssConfig;

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('默认 RSS2JSON Key 首次读取会保存并返回', () => {
  const store = createRadarRssKeyStore({ storage: storage(), storageKey: 'wb', defaultKey: 'default-key' });
  assert.equal(store.get(), 'default-key');
  assert.equal(store.get(), 'default-key');
});

test('已保存 Key 优先于默认值，清空后回到默认值', () => {
  const target = storage();
  const store = createRadarRssKeyStore({ storage: target, storageKey: 'wb', defaultKey: 'default-key' });
  assert.equal(store.set('saved-key'), 'saved-key');
  assert.equal(store.get(), 'saved-key');
  store.clear();
  assert.equal(store.get(), 'default-key');
});
