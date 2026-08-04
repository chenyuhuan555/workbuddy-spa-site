import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupExportActions } from './backup-export-actions.js';

test('exports jobs without embedding resume binaries', () => {
  const files = [];
  const actions = createBackupExportActions({
    columns: [{ name: '个人', jobs: [{ company: '公司', positions: [{ name: '岗位', resumes: [{ id: 'r1', data: 'large' }] }] }] }],
    kbArticles: [], cloneData: value => structuredClone(value), downloadJsonFile: (...args) => files.push(args),
    backupDateLabel: () => '2026-08-04', sanitizeFileName: value => value, packFullBackup: () => ({}), now: () => 'now',
  });
  actions.exportJobsBackup();
  assert.equal(files[0][1].columns[0].jobs[0].positions[0].resumes[0].data, '');
});

test('exports a single position and candidate collection with stable metadata', () => {
  const files = [];
  const actions = createBackupExportActions({
    columns: [{ name: '个人', jobs: [{ id: 'j1', company: '公司', positions: [{ id: 'p1', name: '岗位', resumes: [{ id: 'r1' }] }] }] }],
    kbArticles: [{ id: 'k1' }], cloneData: value => structuredClone(value), downloadJsonFile: (...args) => files.push(args),
    backupDateLabel: () => 'date', sanitizeFileName: value => value, packFullBackup: () => ({}), now: () => 'now', showToast: () => {},
  });
  actions.exportSinglePositionBackup({ id: 'j1', company: '公司' }, { id: 'p1', name: '岗位', resumes: [] });
  actions.exportCandidatesBackup();
  actions.exportKbBackup();
  assert.equal(files.length, 3);
  assert.equal(files[0][1].type, 'position');
  assert.equal(files[1][1].candidates[0].resume.id, 'r1');
  assert.equal(files[2][1].type, 'knowledge-base');
});
