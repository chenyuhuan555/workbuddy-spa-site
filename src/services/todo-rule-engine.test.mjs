import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSystemTodos, getTodoRuleMeta } from './todo-rule-engine.js';

const { KEYS, GROUPS, RULES } = getTodoRuleMeta();

function isoDaysFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** 本地时区 YYYY-MM-DD（与 input[type=date] 一致） */
function localDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function baseFixture() {
  return {
    candidates: [
      { id: 'c1', name: '张三', currentCompany: '星河科技', currentTitle: 'AI产品负责人', owner: '顾问A' },
      { id: 'c2', name: '李四', currentCompany: '量子引擎', currentTitle: '量子算法工程师', owner: '顾问B' },
    ],
    companies: [
      { id: 'co1', name: '星河科技', owner: '顾问A' },
      { id: 'co2', name: '量子引擎', owner: '顾问B' },
    ],
    positions: [
      { id: 'p1', companyId: 'co1', title: 'AI产品负责人', owner: '顾问A' },
      { id: 'p2', companyId: 'co2', title: '量子算法工程师', owner: '顾问B' },
    ],
    applications: [
      {
        id: 'app1', candidateId: 'c1', positionId: 'p1', companyId: 'co1',
        stage: KEYS.RECOMMENDED, stageEnteredAt: isoDaysFromNow(-3), pipelineEvents: [], owner: '顾问A',
      },
    ],
  };
}

test('Rule 2：推荐超过 2 天无更新 → 生成 client_feedback_due Todo', () => {
  const fixture = baseFixture();
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const due = todos.find(item => item.ruleKey === 'application.client_feedback_due');
  assert.ok(due, '应生成 client_feedback_due');
  assert.equal(due.dedupeKey, 'application.client_feedback_due:app1');
  assert.equal(due.title, '跟进客户反馈');
  assert.equal(due.subtitle, '张三 · 星河科技 / AI产品负责人');
  assert.equal(due.entityType, 'application');
  assert.equal(due.entityId, 'app1');
  assert.equal(due.applicationId, 'app1');
  assert.equal(due.candidateId, 'c1');
  assert.equal(due.companyId, 'co1');
  assert.equal(due.positionId, 'p1');
  assert.equal(due.owner, '顾问A');
  assert.equal(due.source, 'system');
  assert.equal(due.status, 'pending');
});

test('Rule 2：推荐未满 2 天 → 不生成 client_feedback_due', () => {
  const fixture = baseFixture();
  fixture.applications[0].stageEnteredAt = isoDaysFromNow(-1);
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  assert.ok(!todos.some(item => item.ruleKey === 'application.client_feedback_due'), '不应生成 client_feedback_due');
});

test('Rule 2：已离开推荐阶段 → 不生成 client_feedback_due', () => {
  const fixture = baseFixture();
  fixture.applications[0].stage = KEYS.INTERVIEWING;
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  assert.ok(!todos.some(item => item.ruleKey === 'application.client_feedback_due'), '非推荐阶段不应生成');
});

test('Rule 1：候选人今日需跟进 → 生成 follow_up Todo', () => {
  const fixture = baseFixture();
  fixture.candidates[0].nextFollowupAt = localDateString(0);
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const follow = todos.find(item => item.ruleKey === 'candidate.follow_up' && item.candidateId === 'c1');
  assert.ok(follow, '应生成候选人跟进');
  assert.equal(follow.dedupeKey, `candidate.follow_up:c1:${localDateString(0)}`);
  assert.equal(follow.title, '跟进候选人');
  assert.equal(follow.subtitle, '张三 · 星河科技 / AI产品负责人');
  assert.equal(follow.entityType, 'candidate');
  assert.equal(follow.linkType, 'candidate');
  assert.equal(follow.linkId, 'c1');
});

test('Rule 1：候选人跟进日期在明天 → 不生成', () => {
  const fixture = baseFixture();
  fixture.candidates[0].nextFollowupAt = localDateString(1);
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  assert.ok(!todos.some(item => item.ruleKey === 'candidate.follow_up' && item.candidateId === 'c1'), '明天不应生成');
});

test('Rule 3：明日有 interviewAt → 生成 interview_reminder Todo', () => {
  const fixture = baseFixture();
  fixture.applications[0].interviewAt = `${localDateString(1)}T10:00:00`;
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const reminder = todos.find(item => item.ruleKey === 'application.interview_reminder');
  assert.ok(reminder, '应生成 interview_reminder');
  assert.equal(reminder.dedupeKey, `application.interview_reminder:app1:${localDateString(1)}`);
  assert.equal(reminder.title, '明日面试');
  assert.ok(reminder.subtitle.includes('面试时间'));
});

test('Rule 4：interviewAt 已结束且无反馈 → 生成 interview_feedback_due Todo', () => {
  const fixture = baseFixture();
  fixture.applications[0].stage = KEYS.INTERVIEWING;
  fixture.applications[0].interviewAt = `${localDateString(-1)}T10:00:00`;
  fixture.applications[0].pipelineEvents = [
    { id: 'e1', type: 'stage_changed', toStage: KEYS.INTERVIEWING, occurredAt: isoDaysFromNow(-2) },
  ];
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const feedback = todos.find(item => item.ruleKey === 'application.interview_feedback_due');
  assert.ok(feedback, '应生成 interview_feedback_due');
  assert.equal(feedback.title, '补充面试反馈');
  assert.equal(feedback.dedupeKey, `application.interview_feedback_due:app1:${localDateString(-1)}`);
});

test('Rule 4：面试后有后续事件 → 不生成 interview_feedback_due', () => {
  const fixture = baseFixture();
  fixture.applications[0].stage = KEYS.INTERVIEW_PASSED;
  fixture.applications[0].interviewAt = `${localDateString(-1)}T10:00:00`;
  fixture.applications[0].pipelineEvents = [
    { id: 'e1', type: 'stage_changed', toStage: KEYS.INTERVIEWING, occurredAt: `${localDateString(-2)}T10:00:00` },
    { id: 'e2', type: 'stage_changed', toStage: KEYS.INTERVIEW_PASSED, occurredAt: `${localDateString(0)}T09:00:00` },
  ];
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  assert.ok(!todos.some(item => item.ruleKey === 'application.interview_feedback_due'), '有后续事件不应生成');
});

test('Rule 5：Offer 超过 SLA 未更新 → 生成 offer_follow_up Todo', () => {
  const fixture = baseFixture();
  fixture.applications[0].stage = KEYS.OFFER;
  fixture.applications[0].stageEnteredAt = isoDaysFromNow(-6);
  fixture.applications[0].pipelineEvents = [];
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const offer = todos.find(item => item.ruleKey === 'application.offer_follow_up');
  assert.ok(offer, '应生成 offer_follow_up');
  assert.equal(offer.title, '跟进 Offer 意向');
  assert.equal(offer.dedupeKey, 'application.offer_follow_up:app1');
});

test('Rule 5：Offer 未超 SLA → 不生成 offer_follow_up', () => {
  const fixture = baseFixture();
  fixture.applications[0].stage = KEYS.OFFER;
  fixture.applications[0].stageEnteredAt = isoDaysFromNow(-2);
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  assert.ok(!todos.some(item => item.ruleKey === 'application.offer_follow_up'), '未超时不应生成');
});

test('重复执行 Rule Engine → 输出 dedupeKey 稳定不重复', () => {
  const fixture = baseFixture();
  fixture.candidates[0].nextFollowupAt = localDateString(0);
  fixture.applications[0].interviewAt = `${localDateString(1)}T10:00:00`;
  const first = deriveSystemTodos({ ...fixture, now: new Date() });
  const second = deriveSystemTodos({ ...fixture, now: new Date() });
  const keys1 = first.map(item => item.dedupeKey);
  const keys2 = second.map(item => item.dedupeKey);
  assert.equal(new Set(keys1).size, keys1.length, '单次输出 dedupeKey 不应重复');
  assert.deepEqual(keys1.sort(), keys2.sort(), '两次执行 dedupeKey 集合应一致');
});

test('同一条 Todo 可通过 candidateId / companyId / positionId / applicationId 派生展示', () => {
  const fixture = baseFixture();
  const todos = deriveSystemTodos({ ...fixture, now: new Date() });
  const due = todos.find(item => item.ruleKey === 'application.client_feedback_due');
  assert.ok(due.candidateId && due.companyId && due.positionId && due.applicationId, '应同时携带四个实体关联字段');
  const byCandidate = todos.filter(item => item.candidateId === 'c1' && item.status === 'pending');
  const byCompany = todos.filter(item => item.companyId === 'co1' && item.status === 'pending');
  const byPosition = todos.filter(item => item.positionId === 'p1' && item.status === 'pending');
  const byApplication = todos.filter(item => item.applicationId === 'app1' && item.status === 'pending');
  assert.ok(byCandidate.some(item => item.dedupeKey === due.dedupeKey));
  assert.ok(byCompany.some(item => item.dedupeKey === due.dedupeKey));
  assert.ok(byPosition.some(item => item.dedupeKey === due.dedupeKey));
  assert.ok(byApplication.some(item => item.dedupeKey === due.dedupeKey));
});

test('规则清单包含 5 条第一版规则', () => {
  assert.deepEqual(RULES.map(rule => rule.key), [
    'candidate.follow_up',
    'application.client_feedback_due',
    'application.interview_reminder',
    'application.interview_feedback_due',
    'application.offer_follow_up',
  ]);
  assert.ok(GROUPS.RECOMMEND.includes(KEYS.RECOMMENDED));
  assert.ok(GROUPS.INTERVIEW.includes(KEYS.INTERVIEWING));
  assert.ok(GROUPS.OFFER.includes(KEYS.OFFER));
});
