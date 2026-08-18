import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./resume-name-helpers.js');
const helpers = globalThis.WorkBuddyResumeNameHelpers;

test('简历文件名可安全回退为候选人姓名', () => {
  assert.equal(helpers.fallbackNameFromFileName('张三-后端工程师.pdf'), '张三');
});

test('疑似文件名判断区分常见姓名和带标记文件名', () => {
  assert.equal(helpers.looksLikeFileName('张三'), false);
  assert.equal(helpers.looksLikeFileName('张三_简历.pdf'), true);
});
