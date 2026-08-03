import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-ai-task-list.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const listResumeAiBatchTasks = context.globalThis.WorkBuddyResumeAiTaskList.listResumeAiBatchTasks;

test('lists active resume versions as batch tasks', () => {
  const tasks = listResumeAiBatchTasks([{ id: 'c1', resumeVersions: [{ id: 'v1', fileName: 'a.pdf' }, { id: 'v2', deletedAt: 'x' }] }]);
  assert.equal(tasks.length, 1);
  assert.deepEqual({ ...tasks[0] }, { candidateId: 'c1', versionId: 'v1', fileName: 'a.pdf', formatStatus: 'queued', formattedText: '' });
});

test('uses compatibility defaults and handles missing collections', () => {
  const tasks = listResumeAiBatchTasks([{ id: 'c1', resumeVersions: [{ id: 'v1', file_name: 'b.docx', formatStatus: 'done', formattedText: 'ok' }] }]);
  assert.equal(tasks[0].fileName, 'b.docx');
  assert.deepEqual(Array.from(listResumeAiBatchTasks(null)), []);
});
