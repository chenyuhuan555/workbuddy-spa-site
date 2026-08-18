import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./job-opportunity-preferences.js');
const JP = globalThis.WorkBuddyJobOpportunityPreferences;

test('PREFERENCE_ROWS 包含四行固定展示顺序', () => {
  const keys = JP.PREFERENCE_ROWS.map(row => row.key);
  assert.deepEqual(keys, ['workload', 'salaryExpectation', 'landingExpectation', 'pipelineSummary']);
  const labels = JP.PREFERENCE_ROWS.map(row => row.label);
  assert.deepEqual(labels, ['工作强度', '薪资期望', '落地诉求', '流程情况']);
});

test('readPreferences 在缺失或空对象时返回空草稿', () => {
  const empty1 = JP.readPreferences(null);
  assert.equal(empty1.workload, '');
  assert.deepEqual(empty1.concerns, []);

  const empty2 = JP.readPreferences({});
  assert.equal(empty2.salaryExpectation, '');

  const empty3 = JP.readPreferences({ jobOpportunityPreferences: null });
  assert.equal(empty3.landingExpectation, '');
});

test('readPreferences 兼容字符串与数组 concerns，自动 trim', () => {
  const prefs = JP.readPreferences({
    jobOpportunityPreferences: {
      workload: '可接受高强度',
      concerns: ['  A ', 'B', '', null, 'C'],
    },
  });
  assert.equal(prefs.workload, '可接受高强度');
  assert.deepEqual(prefs.concerns, ['A', 'B', 'C']);
});

test('createDraft 默认空草稿 + 数组输入 join 成字符串', () => {
  const draft1 = JP.createDraft();
  assert.equal(draft1.workload, '');
  assert.equal(draft1.concernsInput, '');
  assert.deepEqual(draft1.concernsList, []);

  const draft2 = JP.createDraft({ workload: '高', concerns: ['A', 'B'] });
  assert.equal(draft2.workload, '高');
  assert.equal(draft2.concernsInput, 'A、B');
  assert.deepEqual(draft2.concernsList, ['A', 'B']);
});

test('parseConcerns 支持中英文标点分隔', () => {
  const list1 = JP.parseConcerns('A、B、C');
  assert.deepEqual(list1, ['A', 'B', 'C']);
  const list2 = JP.parseConcerns('A, B, C, ');
  assert.deepEqual(list2, ['A', 'B', 'C']);
  const list3 = JP.parseConcerns('A / B / C');
  assert.deepEqual(list3, ['A', 'B', 'C']);
  const list4 = JP.parseConcerns('  A \n  B ');
  assert.deepEqual(list4, ['A', 'B']);
  const list5 = JP.parseConcerns(['', 'A', null, 'B']);
  assert.deepEqual(list5, ['A', 'B']);
});

test('buildPatch 生成 trimmed patch + 拆分 concerns + updatedAt', () => {
  const draft = {
    workload: '  可接受高强度、小团队 ',
    salaryExpectation: ' 60W+ ',
    landingExpectation: '希望参与核心项目',
    pipelineSummary: '约 40-50 家',
    overallAssessment: ' 关注稳定性 ',
    concernsInput: '岗位内容、薪资与 Base、',
    expectedCompensation: ' 60W+ ',
  };
  const patch = JP.buildPatch(draft, () => '2026-08-18T10:00:00.000Z');
  assert.equal(patch.workload, '可接受高强度、小团队');
  assert.equal(patch.salaryExpectation, '60W+');
  assert.equal(patch.landingExpectation, '希望参与核心项目');
  assert.equal(patch.pipelineSummary, '约 40-50 家');
  assert.equal(patch.overallAssessment, '关注稳定性');
  assert.deepEqual(patch.concerns, ['岗位内容', '薪资与 Base']);
  assert.equal(patch.expectedCompensation, '60W+');
  assert.equal(patch.updatedAt, '2026-08-18T10:00:00.000Z');
});

test('buildPatch 接受 concernsList 数组作为兜底', () => {
  const draft = {
    workload: 'A',
    salaryExpectation: '',
    landingExpectation: '',
    pipelineSummary: '',
    overallAssessment: '',
    concernsInput: '',
    concernsList: ['A', 'B'],
  };
  const patch = JP.buildPatch(draft, () => '2026-08-18T10:00:00.000Z');
  assert.deepEqual(patch.concerns, ['A', 'B']);
});

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('index.html 在结构化信息 Tab 内暴露 jobOpportunityPreferencesEdit 状态', () => {
  assert.match(INDEX_HTML, /jobOpportunityPreferencesEdit/);
});

test('index.html 在结构化信息 Tab 内使用 workBuddyPreferenceRows 驱动 4 行展示与编辑', () => {
  const overviewStart = INDEX_HTML.indexOf('wb-v2-candidate-overview grid');
  const overviewEnd = INDEX_HTML.indexOf("workbenchRoute.tab === 'resume'");
  assert.ok(overviewStart > 0, '应能找到结构化信息 Tab 容器');
  assert.ok(overviewEnd > overviewStart, '结构化信息 Tab 应在 resume Tab 之前结束');
  const overviewBlock = INDEX_HTML.slice(overviewStart, overviewEnd);
  // 4 行通过 v-for 驱动，模板里看到的是动态 v-model
  assert.match(overviewBlock, /workBuddyPreferenceRows/);
  assert.match(overviewBlock, /jobOpportunityPreferencesEdit\.draft\[row\.key\]/);
  // 编辑模式下还要有 concernsInput / expectedCompensation / overallAssessment 字段
  assert.match(overviewBlock, /jobOpportunityPreferencesEdit\.draft\.concernsInput/);
  assert.match(overviewBlock, /jobOpportunityPreferencesEdit\.draft\.expectedCompensation/);
  assert.match(overviewBlock, /jobOpportunityPreferencesEdit\.draft\.overallAssessment/);
});
