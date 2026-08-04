import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkbenchApplicationActions } from './workbench-application-actions.js';

test('opens an application detail route and normalizes editable fields', () => {
  const state = {
    applications: [{ id: 'app-1', companyId: 'co-1' }],
    nav: '',
    route: {},
  };
  const actions = createWorkbenchApplicationActions({
    state,
    findApplication: id => state.applications.find(item => item.id === id),
    showToast: () => {},
    ensureResumeTexts: () => {},
  });
  actions.openApplicationDetail('app-1');
  assert.equal(state.nav, 'companies');
  assert.deepEqual(state.route, { type: 'application', id: 'app-1', parentId: 'co-1', tab: 'overview' });
  assert.equal(state.applications[0].progressNote, '');
  assert.equal(state.applications[0].communicationLog, '');
  assert.equal(state.applications[0].owner, '');
});

test('保存推进详情需要写权限并持久化负责人变更', async () => {
  const application = { id: 'app-1', owner: '原负责人' };
  let saves = 0;
  let allowed = false;
  const actions = createWorkbenchApplicationActions({
    state: { applications: [application], route: {} },
    findApplication: id => id === application.id ? application : null,
    requireWritePermission: () => allowed,
    saveWorkbenchV2: async () => { saves += 1; return true; },
    showToast: () => {},
  });

  await actions.saveApplicationDetail();
  assert.equal(saves, 0);

  allowed = true;
  application.owner = '新负责人';
  await actions.saveApplicationDetail();
  assert.equal(saves, 1);
});

test('deletes a pipeline event and persists the fallback stage', async () => {
  const application = {
    id: 'app-1', createdAt: '2026-01-01T00:00:00.000Z', stage: 'interview',
    pipelineEvents: [
      { id: 'e-1', toStage: 'screening', occurredAt: '2026-01-02T00:00:00.000Z' },
      { id: 'e-2', toStage: 'interview', occurredAt: '2026-01-03T00:00:00.000Z' },
    ],
  };
  let saves = 0;
  const actions = createWorkbenchApplicationActions({
    state: { applications: [application] },
    findApplication: id => id === application.id ? application : null,
    saveWorkbenchV2: async () => { saves += 1; return true; },
    showToast: () => {},
    stages: { DISCOVERED: 'discovered' },
    now: () => '2026-01-04T00:00:00.000Z',
  });
  await actions.deletePipelineEvent(application, 'e-2');
  assert.equal(application.stage, 'screening');
  assert.equal(application.stageEnteredAt, '2026-01-02T00:00:00.000Z');
  assert.equal(saves, 1);
});
