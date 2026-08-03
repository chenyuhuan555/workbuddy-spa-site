import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-ai-retry-tasks.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const selectFailedResumeAiTasks = context.globalThis.WorkBuddyResumeAiRetryTasks.selectFailedResumeAiTasks;

test('selects only failed candidate-version tasks', () => {
  const tasks = [{ candidateId: 'c1', versionId: 'v1' }, { candidateId: 'c2', versionId: 'v2' }];
  const selected = selectFailedResumeAiTasks(tasks, [{ candidateId: 'c2', versionId: 'v2' }]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].candidateId, 'c2');
});

test('handles empty or malformed inputs safely', () => {
  assert.deepEqual(Array.from(selectFailedResumeAiTasks(null, null)), []);
  assert.deepEqual(Array.from(selectFailedResumeAiTasks([{ candidateId: 'c1', versionId: 'v1' }], [{}])), []);
});
