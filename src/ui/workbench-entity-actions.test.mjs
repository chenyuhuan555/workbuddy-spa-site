import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkbenchEntityActions } from './workbench-entity-actions.js';

test('workbench entity actions create a company and route to its detail', async () => {
  const state = { companies: [], positions: [] };
  const route = { type: 'list', id: '', parentId: '', tab: 'overview' };
  const nav = { value: 'dashboard' };
  const companyCreate = { open: true, name: '贝壳找房', industry: '房地产', city: '北京', owner: '顾问', status: 'potential' };
  const messages = [];
  const actions = createWorkbenchEntityActions({
    canWrite: true, state, route, nav, companyCreate, companyPositionCreate: {}, selectedCompany: { value: null }, selectedPosition: { value: null },
    WorkbenchV2: { createCompany: input => ({ id: 'co_1', ...input }) },
    save: async () => true, schedulePush: () => {}, cloudReady: false, showToast: message => messages.push(message),
  });
  await actions.createWorkbenchCompany();
  assert.equal(state.companies[0].name, '贝壳找房');
  assert.equal(route.type, 'company');
  assert.equal(route.id, 'co_1');
  assert.equal(messages[0], '公司已创建');
});

test('workbench entity actions reject empty company names without saving', async () => {
  let saved = false;
  const messages = [];
  const actions = createWorkbenchEntityActions({
    canWrite: true, state: { companies: [], positions: [] }, route: {}, nav: { value: '' },
    companyCreate: { name: '  ' }, companyPositionCreate: {}, selectedCompany: { value: null }, selectedPosition: { value: null },
    WorkbenchV2: {}, save: async () => { saved = true; }, schedulePush: () => {}, cloudReady: false, showToast: (message, tone) => messages.push([message, tone]),
  });
  await actions.createWorkbenchCompany();
  assert.equal(saved, false);
  assert.deepEqual(messages[0], ['请填写公司名称', 'error']);
});

test('workbench entity actions edit and persist the selected company profile', async () => {
  const selectedCompany = { value: { id: 'co_1', profileText: '旧介绍', updatedAt: '2026-01-01T00:00:00.000Z' } };
  const companyProfileEdit = { open: false, name: '', text: '' };
  const messages = [];
  let saves = 0;
  const actions = createWorkbenchEntityActions({
    canWrite: true, state: { companies: [], positions: [] }, route: {}, nav: { value: 'companies' },
    companyCreate: {}, companyPositionCreate: {}, companyProfileEdit, selectedCompany, selectedPosition: { value: null },
    WorkbenchV2: {}, save: async () => { saves += 1; return true; }, schedulePush: () => {}, cloudReady: false,
    showToast: message => messages.push(message),
  });
  actions.openCompanyProfileEdit();
  assert.deepEqual(companyProfileEdit, { open: true, name: '', text: '旧介绍' });
  companyProfileEdit.name = '新公司名称';
  companyProfileEdit.text = '  新的公司介绍  ';
  await actions.saveCompanyProfileEdit();
  assert.equal(selectedCompany.value.name, '新公司名称');
  assert.equal(selectedCompany.value.profileText, '新的公司介绍');
  assert.notEqual(selectedCompany.value.updatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(saves, 1);
  assert.equal(companyProfileEdit.open, false);
  assert.equal(messages[0], '公司信息已保存');
});

test('workbench entity actions do not edit company profile without write access', async () => {
  const selectedCompany = { value: { id: 'co_1', profileText: '旧介绍' } };
  const companyProfileEdit = { open: false, name: '', text: '' };
  const actions = createWorkbenchEntityActions({
    canWrite: false, state: { companies: [], positions: [] }, route: {}, nav: { value: 'companies' },
    companyCreate: {}, companyPositionCreate: {}, companyProfileEdit, selectedCompany, selectedPosition: { value: null },
    WorkbenchV2: {}, save: async () => { throw new Error('should not save'); }, schedulePush: () => {}, cloudReady: false, showToast: () => {},
  });
  actions.openCompanyProfileEdit();
  assert.equal(companyProfileEdit.open, false);
  assert.equal(await actions.saveCompanyProfileEdit(), undefined);
  assert.equal(selectedCompany.value.profileText, '旧介绍');
});
