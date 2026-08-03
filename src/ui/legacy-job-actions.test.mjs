import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyJobActions } from './legacy-job-actions.js';

test('saves an edited company name through the legacy board action', () => {
  const columns = [{ jobs: [{ id: 'job-1', company: '旧公司', positions: [] }] }];
  const state = { jobId: 'job-1', name: '新公司' };
  let saved = 0;
  const actions = createLegacyJobActions({ columns, companyEdit: state, modal: { show: false }, localSave: () => { saved += 1; } });
  actions.saveCompanyName(0, 'job-1');
  assert.equal(columns[0].jobs[0].company, '新公司');
  assert.equal(saved, 1);
  assert.equal(state.jobId, null);
});

test('adds an inline position with required fields', () => {
  const columns = [{ jobs: [{ id: 'job-1', company: '公司', positions: [] }] }];
  const form = { jobId: 'job-1', name: '后端工程师', detail: '负责服务端开发' };
  const actions = createLegacyJobActions({ columns, inlineForm: form, companyEdit: {}, companyProfileEditor: {}, editState: {}, modal: {} });
  actions.saveInlineAdd(0, 'job-1');
  assert.equal(columns[0].jobs[0].positions[0].name, '后端工程师');
  assert.equal(form.jobId, null);
});
