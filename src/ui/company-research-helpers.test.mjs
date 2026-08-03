import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./company-research-helpers.js');
const helpers = globalThis.WorkBuddyCompanyResearchHelpers;

test('公司名称规范化统一空白和大小写', () => {
  assert.equal(helpers.normalizeCompanyName('  Acme  TECH  '), 'acme tech');
});

test('候选人画像摘要只保留有效候选人和有限标签', () => {
  const [profile] = helpers.buildCandidateProfiles([{ id: 'c1', name: ' 张三 ', skills: [' Java ', '', 'SQL'] }]);
  assert.deepEqual(profile, {
    id: 'c1', name: '张三', currentCompany: '', currentTitle: '', city: '', directions: [], skills: ['Java', 'SQL'],
  });
  assert.deepEqual(helpers.buildCandidateProfiles([{ id: '', name: '无效' }]), []);
});
