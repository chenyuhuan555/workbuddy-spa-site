import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-duplicate-text.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const duplicateTextOfResume = context.globalThis.WorkBuddyResumeDuplicateText.duplicateTextOfResume;

test('builds duplicate matching text from resume fields in stable order', () => {
  assert.equal(duplicateTextOfResume({ name: '张三', candidateKeywords: ['Java', '后端'], note: '备注' }), '张三\nJava 后端\n备注');
  assert.equal(duplicateTextOfResume(null), '');
});
