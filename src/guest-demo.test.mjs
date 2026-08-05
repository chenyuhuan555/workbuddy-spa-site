import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./guest-demo.js', import.meta.url), 'utf8');

function loadModule() {
  const context = { globalThis: {} };
  vm.runInNewContext(source, context, { filename: 'guest-demo.js' });
  return context.globalThis.WorkBuddyGuestDemo;
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    keys: () => [...values.keys()],
  };
}

test('empty guest storage starts with an explicitly fictional schema-v2 workspace', () => {
  const api = loadModule();
  const storage = createStorage();
  const workspace = api.createGuestDemo({ storage }).loadWorkspace();

  assert.equal(workspace.workbenchV2.schemaVersion, 2);
  assert.ok(workspace.workbenchV2.companies.length >= 3);
  assert.ok(workspace.workbenchV2.positions.length >= 4);
  assert.ok(workspace.workbenchV2.candidates.length >= 6);
  assert.ok(workspace.workbenchV2.applications.length >= 6);
  assert.equal(workspace.meta.mode, 'guest-demo');
  assert.equal(workspace.meta.fictional, true);
  assert.ok(workspace.workbenchV2.companies.every(item => item.demo === true));
  assert.deepEqual(storage.keys(), [api.STORAGE_KEY]);
});

test('guest edits persist only under the dedicated demo key and reload as clones', () => {
  const api = loadModule();
  const storage = createStorage({ unrelated: 'keep-me' });
  const demo = api.createGuestDemo({ storage });
  const workspace = demo.loadWorkspace();
  workspace.workbenchV2.companies.push({ id: 'co_local', name: '游客新增公司（演示）', demo: true });

  demo.saveWorkspace(workspace);
  const reloaded = demo.loadWorkspace();
  assert.equal(reloaded.workbenchV2.companies.at(-1).name, '游客新增公司（演示）');
  assert.deepEqual(storage.keys().sort(), [api.STORAGE_KEY, 'unrelated'].sort());

  reloaded.workbenchV2.companies[0].name = 'mutated in memory';
  assert.notEqual(demo.loadWorkspace().workbenchV2.companies[0].name, 'mutated in memory');
});

test('malformed guest JSON recovers to seed data without reading another namespace', () => {
  const api = loadModule();
  const storage = createStorage({
    [api.STORAGE_KEY]: '{broken',
    headhunter_v2: JSON.stringify({ real: 'must-not-load' }),
  });
  const workspace = api.createGuestDemo({ storage }).loadWorkspace();

  assert.equal(workspace.meta.fictional, true);
  assert.equal(workspace.real, undefined);
  assert.equal(JSON.parse(storage.getItem('headhunter_v2')).real, 'must-not-load');
});

test('reset removes prior edits and restores a fresh fictional workspace', () => {
  const api = loadModule();
  const storage = createStorage();
  const demo = api.createGuestDemo({ storage });
  const workspace = demo.loadWorkspace();
  workspace.workbenchV2.companies.length = 0;
  demo.saveWorkspace(workspace);

  const reset = demo.resetWorkspace();
  assert.ok(reset.workbenchV2.companies.length >= 3);
  assert.equal(demo.loadWorkspace().workbenchV2.companies.length, reset.workbenchV2.companies.length);
});

test('guest storage rejects a workspace that is not marked fictional', () => {
  const api = loadModule();
  const storage = createStorage();
  const demo = api.createGuestDemo({ storage });

  assert.throws(() => demo.saveWorkspace({ meta: { mode: 'live', fictional: false } }), /GUEST_WORKSPACE_REQUIRED/);
  assert.equal(storage.getItem(api.STORAGE_KEY), null);
});
