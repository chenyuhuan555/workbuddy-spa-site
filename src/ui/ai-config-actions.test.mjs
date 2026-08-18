import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiConfigActions } from './ai-config-actions.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('loads and saves only the supported AI configuration fields', () => {
  const state = { apiKey: '  sk-old ', apiKeyValid: true, lastValidated: 'today', showSettings: true, saved: false };
  const store = storage();
  let pushes = 0;
  const actions = createAiConfigActions({ state, storage: store, configKey: 'ai', schedulePush: () => pushes++ });
  actions.save();
  assert.equal(JSON.parse(store.getItem('ai')).apiKey, 'sk-old');
  assert.equal(state.showSettings, false);
  assert.equal(pushes, 1);
  state.apiKey = '';
  actions.load();
  assert.equal(state.apiKey, 'sk-old');
});

test('requires a valid DeepSeek key and opens settings when missing', () => {
  const state = { apiKey: '', apiKeyValid: false, lastValidated: null, showSettings: false, saved: false };
  const store = storage();
  const actions = createAiConfigActions({ state, storage: store, configKey: 'ai' });
  assert.throws(() => actions.requireKey(), /请先配置 DeepSeek API Key/);
  assert.equal(state.showSettings, true);
});

test('migrates legacy config only when the new key is absent', () => {
  const state = { apiKey: '', apiKeyValid: false, lastValidated: null, showSettings: false, saved: false };
  const store = storage();
  let migrated = 0;
  const actions = createAiConfigActions({ state, storage: store, configKey: 'ai', migrateLegacy: () => migrated++ });
  actions.load();
  assert.equal(migrated, 1);
});
