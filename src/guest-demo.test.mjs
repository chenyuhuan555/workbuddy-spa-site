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
  assert.ok(workspace.workbenchV2.candidates.every(item => /^138\d{8}$/.test(item.phone)));
  assert.equal(workspace.meta.seedVersion, 4);
  assert.ok(workspace.workbenchV2.positions.every(item => item.description.length > 180));
  assert.ok(workspace.workbenchV2.candidates.slice(0, 6).every(item => item.resumeVersions[0].rawText.length > 180));
  assert.ok(workspace.workbenchV2.applications.every(item => item.pipelineEvents.length >= 2 || item.id === 'demo_app_7'));
  assert.ok(workspace.workbenchV2.applications.some(item => item.communicationLog && item.progressNote));
  assert.ok(workspace.kb.length >= 8);
  assert.ok(workspace.workbenchV2.notes.length >= 3);
  assert.deepEqual(storage.keys(), [api.STORAGE_KEY]);
});

test('guest demo seed has a complete twelve-person talent library and funnel sample', () => {
  const api = loadModule();
  const workspace = api.createInitialWorkspace();
  const candidates = workspace.workbenchV2.candidates;
  const requiredFields = ['name', 'currentCompany', 'currentTitle', 'age', 'education', 'summary', 'expectedBase', 'currentSalary', 'expectedSalary', 'motivation', 'availability', 'recommendationComment', 'remark', 'owner', 'createdAt', 'updatedAt'];

  assert.ok(candidates.length >= 12);
  assert.ok(candidates.every(candidate => requiredFields.every(field => String(candidate[field] ?? '').trim())));
  assert.ok(candidates.every(candidate => candidate.demo === true));
  assert.ok(workspace.workbenchV2.talentSourceChannels.length >= 3);
  assert.ok(workspace.workbenchV2.talentFunnelEvents.length >= 12);
  assert.ok(workspace.workbenchV2.talentFunnelEvents.every(event => event.demo === true && event.isPilot === true));
  assert.ok(workspace.workbenchV2.talentFunnelEvents.every(event => candidates.some(candidate => candidate.id === event.candidateId)));
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

test('existing seeded labels lose repetitive fictional suffixes on reload', () => {
  const api = loadModule();
  const storage = createStorage();
  const workspace = api.createInitialWorkspace();
  workspace.workbenchV2.companies[0].name += '（演示）';
  workspace.workbenchV2.positions[0].title += '（虚构）';
  workspace.workbenchV2.candidates[0].name += '（演示）';
  workspace.workbenchV2.todos[0].title += '（虚构）';
  storage.setItem(api.STORAGE_KEY, JSON.stringify(workspace));

  const reloaded = api.createGuestDemo({ storage }).loadWorkspace();
  assert.equal(reloaded.workbenchV2.companies[0].name, '星河科技');
  assert.equal(reloaded.workbenchV2.positions[0].title, 'AI 产品负责人');
  assert.equal(reloaded.workbenchV2.candidates[0].name, '林晓');
  assert.equal(reloaded.workbenchV2.todos[0].title, '跟进星河科技面试反馈');
});

test('old guest seed data is enriched without replacing visitor edits', () => {
  const api = loadModule();
  const storage = createStorage();
  const workspace = api.createInitialWorkspace();
  workspace.meta.seedVersion = 1;
  workspace.workbenchV2.positions[0].description = '游客自己改过的岗位说明';
  workspace.workbenchV2.applications[0].progressNote = '游客自己的备注';
  workspace.workbenchV2.notes = [{ id: 'user_note', content: '游客自己的知识备注' }];
  workspace.kb = workspace.kb.slice(0, 1);
  storage.setItem(api.STORAGE_KEY, JSON.stringify(workspace));

  const reloaded = api.createGuestDemo({ storage }).loadWorkspace();
  assert.equal(reloaded.meta.seedVersion, 4);
  assert.equal(reloaded.workbenchV2.positions[0].description, '游客自己改过的岗位说明');
  assert.equal(reloaded.workbenchV2.applications[0].progressNote, '游客自己的备注');
  assert.ok(reloaded.workbenchV2.notes.some(item => item.id === 'user_note'));
  assert.ok(reloaded.workbenchV2.applications[0].communicationLog);
  assert.ok(reloaded.kb.length >= 8);
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
