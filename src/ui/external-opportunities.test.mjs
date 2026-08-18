import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./external-opportunities.js');
const EO = globalThis.WorkBuddyExternalOpportunities;

test('STAGE_OPTIONS 按 priority 严格升序，越深的阶段 priority 越小', () => {
  const list = EO.STAGE_OPTIONS;
  assert.ok(list.length > 0);
  for (let i = 1; i < list.length; i += 1) {
    assert.ok(list[i - 1].priority < list[i].priority, `STAGE_OPTIONS[${i - 1}] priority ${list[i - 1].priority} 应严格小于 [${i}] priority ${list[i].priority}`);
  }
});

test('isClosedStage / stagePriority / stageLabel 行为正确', () => {
  assert.equal(EO.isClosedStage('已结束'), true);
  assert.equal(EO.isClosedStage('Offer'), false);
  assert.equal(EO.stagePriority('Offer'), 1);
  assert.equal(EO.stagePriority('面试'), 6);
  assert.equal(EO.stagePriority('未知阶段'), 9);
  assert.equal(EO.stageLabel('Offer'), 'Offer');
  assert.equal(EO.stageLabel('谈第一轮薪资'), '谈第一轮薪资');
  assert.equal(EO.stageLabel(''), '未填写');
  assert.equal(EO.stageLabel(null), '未填写');
});

test('stageBadgeClass 按状态返回极简色系', () => {
  assert.equal(EO.stageBadgeClass('Offer'), 'bg-violet-50 text-violet-700');
  assert.equal(EO.stageBadgeClass('待入职'), 'bg-violet-50 text-violet-700');
  assert.equal(EO.stageBadgeClass('谈薪'), 'bg-blue-50 text-blue-700');
  assert.equal(EO.stageBadgeClass('待谈薪'), 'bg-blue-50 text-blue-700');
  assert.equal(EO.stageBadgeClass('谈第一轮薪资'), 'bg-blue-50 text-blue-700');
  assert.equal(EO.stageBadgeClass('面试'), 'bg-slate-50 text-slate-600');
  assert.equal(EO.stageBadgeClass('已结束'), 'bg-slate-50 text-slate-400');
});

test('intentionBadgeClass 按意向度返回色系', () => {
  assert.equal(EO.intentionBadgeClass('高'), 'bg-emerald-50 text-emerald-700');
  assert.equal(EO.intentionBadgeClass('较高'), 'bg-emerald-50 text-emerald-600');
  assert.equal(EO.intentionBadgeClass('中等'), 'bg-orange-50 text-orange-700');
  assert.equal(EO.intentionBadgeClass('较低'), 'bg-slate-50 text-slate-500');
  assert.equal(EO.intentionBadgeClass('低'), 'bg-slate-50 text-slate-500');
  assert.equal(EO.intentionBadgeClass('未知'), 'bg-slate-50 text-slate-500');
});

test('formatUpdatedAt 今天 / 昨天 / 当年 / 历史 几种格式', () => {
  const now = new Date();
  const sameDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30).toISOString();
  const resultToday = EO.formatUpdatedAt(sameDay);
  assert.match(resultToday, /^今天 \d{2}:\d{2}$/);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 16, 45).toISOString();
  const resultYesterday = EO.formatUpdatedAt(yesterday);
  assert.match(resultYesterday, /^昨天 \d{2}:\d{2}$/);
  const sameYear = new Date(now.getFullYear(), 7, 16, 9, 20).toISOString(); // 8月16日 09:20
  const resultYear = EO.formatUpdatedAt(sameYear);
  assert.match(resultYear, /^\d{1,2}\/\d{1,2} \d{2}:\d{2}$/);
  const lastYear = new Date(2024, 0, 5, 0, 0).toISOString();
  const resultOld = EO.formatUpdatedAt(lastYear);
  assert.match(resultOld, /^2024\/01\/05$/);
  assert.equal(EO.formatUpdatedAt(''), '—');
  assert.equal(EO.formatUpdatedAt('invalid-date'), 'invalid-date');
});

test('normalizeOpp 跳过无公司名的脏数据并清理字段', () => {
  assert.equal(EO.normalizeOpp(null), null);
  assert.equal(EO.normalizeOpp({}), null);
  const opp = EO.normalizeOpp({ companyName: '  A公司  ', companyDirection: ' 机器人 ', extra: 'ignore', stage: 'Offer' });
  assert.deepEqual(opp, {
    id: '',
    companyName: 'A公司',
    companyType: '',
    companyDirection: '机器人',
    base: '',
    stage: 'Offer',
    intention: '',
    workContent: '',
    feeling: '',
    concern: '',
    compensation: '',
    remark: '',
    updatedAt: '',
  });
});

test('readOpportunities 返回已规范化的数组，过滤无效项', () => {
  const list = EO.readOpportunities({
    externalOpportunities: [
      { companyName: 'A', stage: 'Offer' },
      { companyName: '' }, // 跳过
      null,
      { companyName: 'B', base: '上海', intention: '高' },
    ],
  });
  assert.equal(list.length, 2);
  assert.equal(list[0].companyName, 'A');
  assert.equal(list[1].companyName, 'B');
});

test('createDraft / validate / buildOpportunity 完整流程', () => {
  const draft = EO.createDraft();
  assert.equal(draft.companyName, '');
  assert.equal(draft.stage, '');
  const validationEmpty = EO.validate(draft);
  assert.equal(validationEmpty.ok, false);
  draft.companyName = 'Test';
  draft.stage = '面试';
  draft.intention = '高';
  draft.base = '北京';
  const validationOK = EO.validate(draft);
  assert.equal(validationOK.ok, true);
  const opp = EO.buildOpportunity(null, draft, () => '2026-08-18T10:30:00.000Z');
  assert.equal(opp.companyName, 'Test');
  assert.equal(opp.stage, '面试');
  assert.equal(opp.updatedAt, '2026-08-18T10:30:00.000Z');
  assert.ok(opp.id.startsWith('eo_'));
});

test('applyAdd / applyEdit / applyRemove 不修改原数组', () => {
  const original = [
    { id: 'a', companyName: 'A', stage: 'Offer', intention: '高', updatedAt: '2026-08-18T10:00:00.000Z' },
  ];
  const draft = { companyName: 'B', stage: '面试', intention: '中等' };
  const added = EO.applyAdd(original, draft, () => '2026-08-18T11:00:00.000Z');
  assert.equal(original.length, 1, 'applyAdd 不得修改原数组');
  assert.equal(added.length, 2);
  assert.equal(added[1].companyName, 'B');
  assert.equal(added[1].id !== 'a', true);

  const editDraft = { companyName: 'A1', stage: 'Offer', intention: '较高' };
  const editResult = EO.applyEdit(added, 'a', editDraft, () => '2026-08-18T12:00:00.000Z');
  assert.equal(editResult.changed, true);
  assert.equal(added.length, 2, 'applyEdit 不得修改原数组');
  const target = editResult.list.find(item => item.id === 'a');
  assert.equal(target.companyName, 'A1');
  assert.equal(target.id, 'a', '编辑保留原 id');
  assert.equal(target.updatedAt, '2026-08-18T12:00:00.000Z');

  const removed = EO.applyRemove(editResult.list, 'a');
  assert.equal(removed.length, 1);
  assert.equal(removed[0].companyName, 'B');
});

test('applyEdit 对不存在的 id 返回 changed:false', () => {
  const result = EO.applyEdit([{ id: 'a', companyName: 'A' }], 'missing', { companyName: 'A' }, () => '2026-08-18T10:00:00.000Z');
  assert.equal(result.changed, false);
});

test('sortByUpdatedDesc 按更新时间倒序', () => {
  const list = [
    { id: '1', updatedAt: '2026-08-18T09:00:00.000Z' },
    { id: '2', updatedAt: '2026-08-18T12:00:00.000Z' },
    { id: '3', updatedAt: '2026-08-18T10:00:00.000Z' },
  ];
  const sorted = EO.sortByUpdatedDesc(list);
  assert.deepEqual(sorted.map(item => item.id), ['2', '3', '1']);
});

test('summary 派生在流程数 / 最深阶段 / 谈薪 / 期望年包 / 重点顾虑 / 总体判断', () => {
  const summary = EO.summary({
    opportunities: [
      { id: '1', companyName: '智动未来', stage: 'Offer', updatedAt: '2026-08-18T10:30:00.000Z' },
      { id: '2', companyName: '精锋医疗', stage: 'Offer', updatedAt: '2026-08-17T16:45:00.000Z' },
      { id: '3', companyName: '优奇智能', stage: '谈第一轮薪资', updatedAt: '2026-08-16T09:20:00.000Z' },
      { id: '4', companyName: '百曜科技', stage: '待谈薪', updatedAt: '2026-08-15T18:10:00.000Z' },
      { id: '5', companyName: '老公司', stage: '已结束', updatedAt: '2026-08-10T10:00:00.000Z' },
    ],
    preferences: {
      expectedCompensation: '60W+',
      concerns: ['岗位内容陌生度', '薪资与 Base', '公司稳定性'],
      overallAssessment: '更看重岗位落地空间和工作稳定性，对薪资及 Base 较为敏感。',
    },
  });
  assert.equal(summary.inProcess, 4);
  assert.equal(summary.deepestStage, 'Offer');
  assert.equal(summary.deepestStageCount, 2);
  assert.equal(summary.negotiatingCount, 2);
  assert.equal(summary.expectedCompensation, '60W+');
  assert.deepEqual(summary.keyConcerns, ['岗位内容陌生度', '薪资与 Base', '公司稳定性']);
  assert.match(summary.overallAssessment, /落地空间/);
});

test('summary 空数据全部回退到安全的默认值', () => {
  const summary = EO.summary({});
  assert.equal(summary.inProcess, 0);
  assert.equal(summary.deepestStage, null);
  assert.equal(summary.deepestStageCount, 0);
  assert.equal(summary.negotiatingCount, 0);
  assert.equal(summary.expectedCompensation, '');
  assert.deepEqual(summary.keyConcerns, []);
  assert.equal(summary.overallAssessment, '');
});

test('summary 即使 preferences.concerns 是字符串数组外的内容也能过滤空项', () => {
  const summary = EO.summary({
    opportunities: [],
    preferences: { concerns: ['A', '', 'B', null, '   '] },
  });
  assert.deepEqual(summary.keyConcerns, ['A', 'B']);
});

test('summary 阶段深度判定：Offer > 面试 > 已结束', () => {
  const summary = EO.summary({
    opportunities: [
      { id: '1', stage: '已结束' },
      { id: '2', stage: '面试' },
      { id: '3', stage: '初筛' },
    ],
  });
  assert.equal(summary.deepestStage, '面试');
  assert.equal(summary.deepestStageCount, 1);
  assert.equal(summary.negotiatingCount, 0);
});

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('index.html 在结构化信息 Tab 内挂载了求职进展 / 求职判断 / 求职摘要', () => {
  assert.match(INDEX_HTML, /求职进展（多公司机会）/);
  assert.match(INDEX_HTML, /求职判断/);
  assert.match(INDEX_HTML, /求职摘要/);
});

test('index.html 删除了原「推进摘要」入口（替换为求职摘要）', () => {
  assert.doesNotMatch(INDEX_HTML, /推进摘要/);
});

test('index.html 在结构化信息 Tab 内不再跳转 applications tab', () => {
  const overviewStart = INDEX_HTML.indexOf("workbenchRoute.tab === 'overview'");
  const overviewEnd = INDEX_HTML.indexOf("workbenchRoute.tab === 'resume'");
  assert.ok(overviewStart > 0 && overviewEnd > 0 && overviewEnd > overviewStart);
  const overviewBlock = INDEX_HTML.slice(overviewStart, overviewEnd);
  assert.doesNotMatch(overviewBlock, /workbenchRoute\.tab = 'applications'/);
});
