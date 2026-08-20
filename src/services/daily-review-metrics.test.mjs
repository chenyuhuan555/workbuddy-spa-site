import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./daily-review-metrics.js');
const {
  buildDailyReviewMetrics,
  buildTeamDailyReviewMetrics,
  toTimezoneDate,
} = globalThis.WorkBuddyDailyReviewMetrics;

const DATE = '2026-08-19';
const TODAY = '2026-08-19T03:00:00.000Z';      // 北京 08-19 11:00
const YESTERDAY = '2026-08-18T03:00:00.000Z';  // 北京 08-18 11:00

function candidate(id, opts = {}) {
  return { id, owner: '顾问A', ownerUserId: 'u_A', ...opts };
}
function application(id, opts = {}) {
  return { id, owner: '顾问A', ownerUserId: 'u_A', pipelineEvents: [], ...opts };
}
function todo(id, opts = {}) {
  return { id, owner: '顾问A', userId: 'u_A', status: 'done', ...opts };
}
function metrics(overrides = {}) {
  return buildDailyReviewMetrics({ userId: 'u_A', userName: '顾问A', reviewDate: DATE, ...overrides });
}

test('1. 今天新增人才计入 addedCandidates', () => {
  const m = metrics({ candidates: [candidate('c1', { intakeAt: TODAY })] });
  assert.equal(m.addedCandidates, 1);
});

test('2. 昨天新增人才不计入今天', () => {
  const m = metrics({ candidates: [candidate('c1', { intakeAt: YESTERDAY })] });
  assert.equal(m.addedCandidates, 0);
});

test('3. 今天 touchedAt 计入 touchedCandidates', () => {
  const m = metrics({ candidates: [candidate('c1', { touchedAt: TODAY })] });
  assert.equal(m.touchedCandidates, 1);
});

test('4. 同一候选人一天多次触达只计一次（touchedAt + contacted 事件 + followup 并存）', () => {
  const c = candidate('c1', {
    touchedAt: TODAY,
    pipelineEvents: [{ toStage: 'contacted', occurredAt: TODAY }],
    followups: [{ id: 'f1', createdAt: TODAY }],
  });
  const m = metrics({ candidates: [c] });
  assert.equal(m.touchedCandidates, 1);
});

test('5. Application 今天进入正式推荐计入 recommendations', () => {
  const a = application('a1', { pipelineEvents: [{ toStage: 'recommended', occurredAt: TODAY }] });
  const m = metrics({ applications: [a] });
  assert.equal(m.recommendations, 1);
});

test('6. 昨天推荐、今天仍处推荐阶段不重复计（按事件而非当前 stage）', () => {
  const a = application('a1', {
    stage: 'recommended',
    pipelineEvents: [{ toStage: 'recommended', occurredAt: YESTERDAY }],
  });
  const m = metrics({ applications: [a] });
  assert.equal(m.recommendations, 0);
});

test('7. 今天进入 Interview Group 计入 interviews', () => {
  const a = application('a1', { pipelineEvents: [{ toStage: 'interview_pending', occurredAt: TODAY }] });
  const m = metrics({ applications: [a] });
  assert.equal(m.interviews, 1);
});

test('8. 昨天进入面试、今天仍处于面试不计（按事件而非当前 stage）', () => {
  const a = application('a1', {
    stage: 'interviewing',
    pipelineEvents: [{ toStage: 'interviewing', occurredAt: YESTERDAY }],
  });
  const m = metrics({ applications: [a] });
  assert.equal(m.interviews, 0);
});

test('9. 今天进入 Offer Group 计入 offers', () => {
  const a = application('a1', { pipelineEvents: [{ toStage: 'offer', occurredAt: TODAY }] });
  const m = metrics({ applications: [a] });
  assert.equal(m.offers, 1);
});

test('10. 今天完成待办计入 completedTodos', () => {
  const m = metrics({ todos: [todo('t1', { status: 'done', completedAt: TODAY })] });
  assert.equal(m.completedTodos, 1);
});

test('11. 昨天完成待办今天不计', () => {
  const m = metrics({ todos: [todo('t1', { status: 'done', completedAt: YESTERDAY })] });
  assert.equal(m.completedTodos, 0);
});

test('12. 顾问 A 的指标不包含顾问 B 数据', () => {
  const candidates = [
    candidate('cA', { owner: '顾问A', ownerUserId: 'u_A', intakeAt: TODAY }),
    candidate('cB', { owner: '顾问B', ownerUserId: 'u_B', intakeAt: TODAY }),
  ];
  const m = metrics({ candidates });
  assert.equal(m.addedCandidates, 1);
});

test('13. 团队汇总正确累加所有成员', () => {
  const candidates = [
    candidate('cA', { owner: '顾问A', ownerUserId: 'u_A', intakeAt: TODAY }),
    candidate('cB', { owner: '顾问B', ownerUserId: 'u_B', intakeAt: TODAY }),
  ];
  const team = buildTeamDailyReviewMetrics({
    candidates,
    reviewDate: DATE,
    members: [{ userId: 'u_A', userName: '顾问A' }, { userId: 'u_B', userName: '顾问B' }],
  });
  assert.equal(team.addedCandidates, 2);
});

test('同一候选人推荐到两个岗位算两条 recommendation（按 Application 计）', () => {
  const apps = [
    application('a1', { candidateId: 'c1', pipelineEvents: [{ toStage: 'recommended', occurredAt: TODAY }] }),
    application('a2', { candidateId: 'c1', pipelineEvents: [{ toStage: 'recommended', occurredAt: TODAY }] }),
  ];
  const m = metrics({ applications: apps });
  assert.equal(m.recommendations, 2);
});

test('同一申请同一天多次进入面试组只计一次（去重到 Application）', () => {
  const a = application('a1', {
    pipelineEvents: [
      { toStage: 'interview_pending', occurredAt: TODAY },
      { toStage: 'interviewing', occurredAt: TODAY },
    ],
  });
  const m = metrics({ applications: [a] });
  assert.equal(m.interviews, 1);
});

test('今日跟进记录计入 followups（动作次数），昨天的不计', () => {
  const c = candidate('c1', {
    followups: [{ id: 'f1', createdAt: TODAY }, { id: 'f2', createdAt: YESTERDAY }],
  });
  const m = metrics({ candidates: [c] });
  assert.equal(m.followups, 1);
});

test('时区：UTC 深夜按北京时间归入正确日历日（跨天边界）', () => {
  assert.equal(toTimezoneDate('2026-08-18T16:00:00.000Z', 'Asia/Shanghai'), '2026-08-19');
  assert.equal(toTimezoneDate('2026-08-18T15:59:00.000Z', 'Asia/Shanghai'), '2026-08-18');
  // 纯日期串原样返回
  assert.equal(toTimezoneDate('2026-08-19', 'Asia/Shanghai'), '2026-08-19');
});

test('未指定 reviewDate 时返回全 0（安全兜底）', () => {
  const m = buildDailyReviewMetrics({ userId: 'u_A', userName: '顾问A', reviewDate: '', candidates: [candidate('c1', { intakeAt: TODAY })] });
  assert.deepEqual(m, {
    addedCandidates: 0, touchedCandidates: 0, recommendations: 0,
    interviews: 0, offers: 0, completedTodos: 0, followups: 0,
  });
});

test('归属按 ownerUserId 匹配；ownerUserId 缺失时回退 owner 姓名', () => {
  const byId = metrics({ candidates: [candidate('c1', { owner: '别人', ownerUserId: 'u_A', intakeAt: TODAY })] });
  assert.equal(byId.addedCandidates, 1, 'ownerUserId 命中');

  const byName = buildDailyReviewMetrics({
    userId: 'u_A', userName: '顾问A', reviewDate: DATE,
    candidates: [{ id: 'c2', owner: '顾问A', intakeAt: TODAY }],
  });
  assert.equal(byName.addedCandidates, 1, 'owner 姓名回退命中');
});

test('触达从 application contacted 事件统计并去重到候选人', () => {
  const apps = [
    application('a1', { candidateId: 'c1', pipelineEvents: [{ toStage: 'contacted', occurredAt: TODAY }] }),
    application('a2', { candidateId: 'c1', pipelineEvents: [{ toStage: 'contacted', occurredAt: TODAY }] }),
  ];
  const m = metrics({ applications: apps });
  assert.equal(m.touchedCandidates, 1, '同一候选人两个岗位触达只计一次');
});

test('触达可同时来自 candidate.touchedAt 与 application contacted，统一去重', () => {
  const candidates = [candidate('c1', { touchedAt: TODAY })];
  const apps = [application('a1', { candidateId: 'c1', pipelineEvents: [{ toStage: 'contacted', occurredAt: TODAY }] })];
  const m = metrics({ candidates, applications: apps });
  assert.equal(m.touchedCandidates, 1);
});
