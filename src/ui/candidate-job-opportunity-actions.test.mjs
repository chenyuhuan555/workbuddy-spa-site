import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./external-opportunities.js');
await import('./job-opportunity-preferences.js');
await import('./candidate-job-opportunity-actions.js');
const Actions = globalThis.WorkBuddyCandidateJobOpportunityActions;

function makeBundle(candidate) {
  return { candidates: [candidate] };
}

function makeUpdateTalent(bundle) {
  return (b, id, patch) => {
    const target = b.candidates.find(c => c.id === id);
    Object.assign(target, patch);
    return target;
  };
}

function makeDeps(bundle, options = {}) {
  const updateTalent = makeUpdateTalent(bundle);
  const persist = options.persist || (async () => true);
  return { canWrite: true, bundle, updateTalent, persist, schedulePush: () => {}, showToast: () => {} };
}

test('addOpportunity 把新机会 push 到 candidate.externalOpportunities 并持久化', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await Actions.addOpportunity(deps, candidate, { companyName: 'A', stage: 'Offer', intention: '高' });
  assert.equal(candidate.externalOpportunities.length, 1);
  assert.equal(candidate.externalOpportunities[0].companyName, 'A');
  assert.equal(candidate.externalOpportunities[0].stage, 'Offer');
  assert.equal(candidate.externalOpportunities[0].intention, '高');
  assert.ok(candidate.externalOpportunities[0].id.startsWith('eo_'));
  assert.ok(candidate.externalOpportunities[0].updatedAt);
});

test('addOpportunity 公司名为空时报错且不写入', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await assert.rejects(
    Actions.addOpportunity(deps, candidate, { companyName: '', stage: '面试' }),
    /公司名称不能为空/,
  );
  assert.equal(candidate.externalOpportunities.length, 0);
});

test('addOpportunity 持久化失败时回滚 candidate 字段', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle, { persist: async () => false });
  await assert.rejects(
    Actions.addOpportunity(deps, candidate, { companyName: 'A' }),
    /保存失败/,
  );
  assert.equal(candidate.externalOpportunities.length, 0, '持久化失败时应回滚');
});

test('addOpportunity canWrite=false 拒绝写入', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = { canWrite: false, bundle, updateTalent: makeUpdateTalent(bundle), persist: async () => true };
  await assert.rejects(Actions.addOpportunity(deps, candidate, { companyName: 'A' }), /无权编辑/);
  assert.equal(candidate.externalOpportunities.length, 0);
});

test('editOpportunity 更新指定 id 的字段并保留 id', async () => {
  const candidate = {
    id: 'c1',
    externalOpportunities: [{ id: 'opp1', companyName: 'A', stage: '面试', intention: '中等', updatedAt: '2026-08-10T10:00:00.000Z' }],
  };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await Actions.editOpportunity(deps, candidate, 'opp1', { companyName: 'A改', stage: 'Offer', intention: '高' });
  assert.equal(candidate.externalOpportunities[0].companyName, 'A改');
  assert.equal(candidate.externalOpportunities[0].stage, 'Offer');
  assert.equal(candidate.externalOpportunities[0].intention, '高');
  assert.equal(candidate.externalOpportunities[0].id, 'opp1', '保留原 id');
  assert.notEqual(candidate.externalOpportunities[0].updatedAt, '2026-08-10T10:00:00.000Z', 'updatedAt 被刷新');
});

test('editOpportunity 对不存在的 id 报错', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await assert.rejects(
    Actions.editOpportunity(deps, candidate, 'missing', { companyName: 'A' }),
    /未找到对应的公司机会/,
  );
});

test('removeOpportunity 删除指定 id 并持久化', async () => {
  const candidate = {
    id: 'c1',
    externalOpportunities: [
      { id: 'opp1', companyName: 'A' },
      { id: 'opp2', companyName: 'B' },
    ],
  };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await Actions.removeOpportunity(deps, candidate, 'opp1');
  assert.equal(candidate.externalOpportunities.length, 1);
  assert.equal(candidate.externalOpportunities[0].id, 'opp2');
});

test('removeOpportunity 不存在的 id 报错', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await assert.rejects(
    Actions.removeOpportunity(deps, candidate, 'missing'),
    /未找到对应的公司机会/,
  );
});

test('savePreferences 把 4 行 + concerns + 期望年包 + 总体判断 写入 candidate', async () => {
  const candidate = { id: 'c1' };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await Actions.savePreferences(deps, candidate, {
    workload: '可接受高强度',
    salaryExpectation: '60W+',
    landingExpectation: '希望参与核心项目',
    pipelineSummary: '约 40-50 家',
    overallAssessment: '关注稳定性',
    concernsInput: '岗位内容、薪资与 Base、公司稳定性',
    expectedCompensation: '60W+',
  });
  const prefs = candidate.jobOpportunityPreferences;
  assert.equal(prefs.workload, '可接受高强度');
  assert.equal(prefs.salaryExpectation, '60W+');
  assert.equal(prefs.landingExpectation, '希望参与核心项目');
  assert.equal(prefs.pipelineSummary, '约 40-50 家');
  assert.equal(prefs.overallAssessment, '关注稳定性');
  assert.deepEqual(prefs.concerns, ['岗位内容', '薪资与 Base', '公司稳定性']);
  assert.equal(prefs.expectedCompensation, '60W+');
  assert.ok(prefs.updatedAt);
});

test('savePreferences 持久化失败时回滚', async () => {
  const candidate = { id: 'c1', jobOpportunityPreferences: { workload: '原值' } };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle, { persist: async () => false });
  await assert.rejects(
    Actions.savePreferences(deps, candidate, { workload: '新值', salaryExpectation: '', landingExpectation: '', pipelineSummary: '' }),
    /保存失败/,
  );
  assert.equal(candidate.jobOpportunityPreferences.workload, '原值', '回滚到旧值');
});

test('addOpportunity 不会把 Application 阶段字段写入 candidate', async () => {
  const candidate = { id: 'c1', externalOpportunities: [] };
  const bundle = makeBundle(candidate);
  const deps = makeDeps(bundle);
  await Actions.addOpportunity(deps, candidate, { companyName: 'A', stage: '面试' });
  assert.equal(candidate.stage, undefined, '不污染 candidate 顶层 stage');
  assert.equal(candidate.pipelineEvents, undefined, '不污染 candidate 顶层 pipelineEvents');
});

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('index.html 加载 candidate-job-opportunity-actions.js 脚本', () => {
  assert.match(INDEX_HTML, /src\/ui\/candidate-job-opportunity-actions\.js/);
});

test('index.html 仍然保留「推荐记录」/「面试进度」原有 Tab 不变', () => {
  assert.match(INDEX_HTML, /workbenchRoute\.tab === 'applications'/);
  assert.match(INDEX_HTML, /workbenchRoute\.tab === 'interviews'/);
});

test('index.html 没有新增「求职对比」Tab', () => {
  // 候选人详情两组 Tab 列表都应保持原有结构，不出现"求职对比"
  const tabsBlocks = INDEX_HTML.match(/candidateDetailTabs[^\[]*\[[\s\S]*?\]/);
  assert.ok(tabsBlocks, '应能定位到 candidateDetailTabs 定义');
  assert.doesNotMatch(tabsBlocks[0], /求职对比/);
});
