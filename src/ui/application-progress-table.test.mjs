import test from 'node:test';
import assert from 'node:assert/strict';

// 与浏览器经典脚本共用同一份实现（UMD 挂 globalThis）
globalThis.window = globalThis;
await import('../constants/pipeline-stages.js');
await import('./application-progress-table.js');
const Table = globalThis.WorkBuddyApplicationProgressTable;

const { buildRows, filterRows, sortRows, summarize, STAGE_FILTER_LABELS, QUICK_FILTERS } = Table;

/* 固定时间：2026-08-18（周二）12:00 本地 */
const NOW = new Date(2026, 7, 18, 12, 0, 0).toISOString();
const nowMs = Date.parse(NOW);
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (offsetDays, hour = 10) => new Date(2026, 7, 18 + offsetDays, hour, 0, 0).toISOString();

function baseFixture() {
  return {
    candidates: [
      { id: 'c1', name: '张三', currentCompany: '星河科技', currentTitle: 'AI产品负责人', owner: '顾问A' },
      { id: 'c2', name: '李四', currentCompany: '量子引擎', currentTitle: '量子算法工程师', owner: '顾问B' },
    ],
    companies: [
      { id: 'co1', name: '星河科技' },
      { id: 'co2', name: '量子引擎' },
    ],
    positions: [
      { id: 'p1', companyId: 'co1', title: 'AI产品负责人' },
      { id: 'p2', companyId: 'co2', title: '量子算法工程师' },
    ],
    applications: [
      { id: 'app1', candidateId: 'c1', positionId: 'p1', companyId: 'co1', stage: 'recommended', stageEnteredAt: iso(-3), pipelineEvents: [], owner: '顾问A' },
      { id: 'app2', candidateId: 'c2', positionId: 'p2', companyId: 'co2', stage: 'interviewing', stageEnteredAt: iso(-1), pipelineEvents: [], owner: '顾问B' },
    ],
    todos: [],
  };
}

test('同一 Candidate 有两个 Application → 表格显示两行（不合并）', () => {
  const fixture = baseFixture();
  fixture.applications.push({ id: 'app3', candidateId: 'c1', positionId: 'p2', companyId: 'co2', stage: 'offer', stageEnteredAt: iso(-1), pipelineEvents: [], owner: '顾问A' });
  const rows = buildRows({ ...fixture, now: NOW });
  assert.equal(rows.length, 3, '三条 Application 三条行');
  assert.equal(rows.filter(row => row.candidateId === 'c1').length, 2, '张三的两条推进分两行');
  assert.ok(rows.every(row => row.applicationId), '每行对应一条 Application');
});

test('Application stage → 正确读取 pipeline stage label', () => {
  const rows = buildRows({ ...baseFixture(), now: NOW });
  const app1 = rows.find(row => row.applicationId === 'app1');
  assert.equal(app1.stage, 'recommended');
  assert.equal(app1.stageLabel, '已推荐');
  assert.equal(app1.stageGroup, 'recommend');
});

test('pending client_feedback_due → nextTodo = 跟进客户反馈', () => {
  const fixture = baseFixture();
  fixture.todos.push({ id: 't1', applicationId: 'app1', ruleKey: 'application.client_feedback_due', title: '跟进客户反馈', status: 'pending', done: false, dueAt: iso(0) });
  const rows = buildRows({ ...fixture, now: NOW });
  const app1 = rows.find(row => row.applicationId === 'app1');
  assert.equal(app1.nextTodoTitle, '跟进客户反馈');
  assert.equal(app1.todoCount, 1);
});

test('一个 Application 有多个 Todo → 选择最紧急一条作为 nextTodo', () => {
  const fixture = baseFixture();
  fixture.todos.push(
    { id: 't1', applicationId: 'app1', ruleKey: 'application.client_feedback_due', title: '跟进客户反馈', status: 'pending', done: false, dueAt: iso(2) },
    { id: 't2', applicationId: 'app1', ruleKey: 'application.interview_reminder', title: '明日面试', status: 'pending', done: false, dueAt: iso(1) },
  );
  const rows = buildRows({ ...fixture, now: NOW });
  const app1 = rows.find(row => row.applicationId === 'app1');
  assert.equal(app1.nextTodoTitle, '明日面试', '面试提醒优先于客户反馈');
  assert.equal(app1.todoCount, 2);
});

test('今日 interviewAt → 命中「今日面试」筛选', () => {
  const fixture = baseFixture();
  fixture.applications[1].interviewAt = iso(0, 14);
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'today_interview' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app2');
  assert.equal(filtered[0].interviewLabel, `今天 14:00`);
});

test('本周 interviewAt → 命中「本周面试」筛选', () => {
  const fixture = baseFixture();
  fixture.applications[1].interviewAt = iso(3, 15);
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'week_interview' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app2');
});

test('进入面试阶段但无 interviewAt → 命中「待约面」', () => {
  const fixture = baseFixture();
  // app2 已在 interviewing 但无 interviewAt
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'to_schedule' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app2');
});

test('存在 interview_feedback_due → 命中「面试后待反馈」', () => {
  const fixture = baseFixture();
  fixture.todos.push({ id: 't9', applicationId: 'app2', ruleKey: 'application.interview_feedback_due', title: '补充面试反馈', status: 'pending', done: false, dueAt: iso(-1) });
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'interview_feedback' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app2');
});

test('Offer stage → 命中 Offer', () => {
  const fixture = baseFixture();
  fixture.applications[1].stage = 'offer';
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'offer' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app2');
});

test('stage 超 SLA → 命中「逾期未更新」', () => {
  const fixture = baseFixture();
  fixture.applications[0].stageEnteredAt = iso(-2); // recommended 3 天 SLA，2 天不超
  fixture.applications.push({ id: 'app4', candidateId: 'c2', positionId: 'p1', companyId: 'co1', stage: 'offer', stageEnteredAt: iso(-6), pipelineEvents: [], owner: '顾问B' });
  const rows = buildRows({ ...fixture, now: NOW });
  const filtered = filterRows(rows, { quick: 'overdue' }, NOW);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].applicationId, 'app4', 'offer 阶段 6 天 > slaDays=5');
});

test('owner filter → 正确过滤 Application（application.owner 优先）', () => {
  const fixture = baseFixture();
  fixture.applications[0].owner = '顾问A';
  fixture.applications[1].owner = '';
  const rows = buildRows({ ...fixture, now: NOW });
  const mine = filterRows(rows, { owner: '顾问A' }, NOW);
  assert.deepEqual(mine.map(row => row.applicationId), ['app1']);
  // fallback：app2 无 owner → candidate.owner（顾问B）
  const other = filterRows(rows, { owner: '顾问B' }, NOW);
  assert.deepEqual(other.map(row => row.applicationId), ['app2']);
});

test('默认排序：逾期 > 今日面试 > 明日面试 > 普通', () => {
  const fixture = baseFixture();
  fixture.applications = [
    { id: 'a-normal', candidateId: 'c1', positionId: 'p1', companyId: 'co1', stage: 'interviewing', stageEnteredAt: iso(-1), pipelineEvents: [], owner: '顾问A', updatedAt: iso(0, 8) },
    { id: 'a-overdue', candidateId: 'c2', positionId: 'p1', companyId: 'co1', stage: 'recommended', stageEnteredAt: iso(-5), pipelineEvents: [], owner: '顾问B' },
    { id: 'a-today', candidateId: 'c1', positionId: 'p2', companyId: 'co2', stage: 'interview_pending', interviewAt: iso(0, 14), stageEnteredAt: iso(-1), pipelineEvents: [], owner: '顾问A' },
    { id: 'a-tomorrow', candidateId: 'c2', positionId: 'p2', companyId: 'co2', stage: 'interviewing', interviewAt: iso(1, 10), stageEnteredAt: iso(-1), pipelineEvents: [], owner: '顾问B' },
  ];
  fixture.todos = [{ id: 't0', applicationId: 'a-overdue', ruleKey: 'application.client_feedback_due', title: '跟进客户反馈', status: 'pending', done: false, dueAt: iso(-1) }];
  const rows = buildRows({ ...fixture, now: NOW });
  const sorted = sortRows(rows).map(row => row.applicationId);
  assert.deepEqual(sorted, ['a-overdue', 'a-today', 'a-tomorrow', 'a-normal']);
});

test('Application stage change → table row 实时更新', () => {
  const fixture = baseFixture();
  const first = buildRows({ ...fixture, now: NOW });
  assert.equal(first.find(row => row.applicationId === 'app1').stage, 'recommended');
  fixture.applications[0].stage = 'interviewing';
  const second = buildRows({ ...fixture, now: NOW });
  const row = second.find(item => item.applicationId === 'app1');
  assert.equal(row.stage, 'interviewing');
  assert.equal(row.stageLabel, '面试中');
});

test('reconcile 后 Todo 变化 → nextTodo / todoCount 更新', () => {
  const fixture = baseFixture();
  const rows0 = buildRows({ ...fixture, now: NOW });
  assert.equal(rows0.find(row => row.applicationId === 'app1').todoCount, 0);
  fixture.todos.push({ id: 't1', applicationId: 'app1', ruleKey: 'application.client_feedback_due', title: '跟进客户反馈', status: 'pending', done: false, dueAt: iso(0) });
  const rows1 = buildRows({ ...fixture, now: NOW });
  const row = rows1.find(item => item.applicationId === 'app1');
  assert.equal(row.todoCount, 1);
  assert.equal(row.nextTodoTitle, '跟进客户反馈');
  // 完成后不再计入
  fixture.todos[0].status = 'done';
  fixture.todos[0].done = true;
  const rows2 = buildRows({ ...fixture, now: NOW });
  assert.equal(rows2.find(item => item.applicationId === 'app1').todoCount, 0);
});

test('无 Application → 空状态正常（行数为 0）', () => {
  const rows = buildRows({ candidates: [], companies: [], positions: [], applications: [], todos: [], now: NOW });
  assert.deepEqual(rows, []);
  assert.equal(summarize(rows, NOW).total, 0);
});

test('关联公司或岗位已删除时不生成面试/推进展示行', () => {
  const fixture = baseFixture();
  fixture.companies[1].deletedAt = '2026-08-18T08:00:00.000Z';
  fixture.positions.push({ id: 'p3', companyId: 'co1', title: '已删除岗位', deletedAt: '2026-08-18T09:00:00.000Z' });
  fixture.applications.push(
    { id: 'app-deleted-company', candidateId: 'c1', positionId: 'p2', companyId: 'co2', stage: 'interviewing' },
    { id: 'app-deleted-position', candidateId: 'c2', positionId: 'p3', companyId: 'co1', stage: 'interviewing' },
    { id: 'app-missing-link', candidateId: 'c1', positionId: 'missing', companyId: 'co1', stage: 'interviewing' },
  );
  const rows = buildRows({ ...fixture, now: NOW });
  assert.deepEqual(rows.map(row => row.applicationId), ['app1']);
});

test('阶段筛选复用共享分组', () => {
  assert.equal(STAGE_FILTER_LABELS.interview, '面试');
  const fixture = baseFixture();
  fixture.applications = [
    { id: 'app-r', candidateId: 'c1', positionId: 'p1', companyId: 'co1', stage: 'recommended', stageEnteredAt: iso(-1), pipelineEvents: [] },
    { id: 'app-i', candidateId: 'c2', positionId: 'p2', companyId: 'co2', stage: 'interviewing', stageEnteredAt: iso(-1), pipelineEvents: [] },
    { id: 'app-o', candidateId: 'c1', positionId: 'p2', companyId: 'co2', stage: 'offer', stageEnteredAt: iso(-1), pipelineEvents: [] },
  ];
  const rows = buildRows({ ...fixture, now: NOW });
  assert.deepEqual(filterRows(rows, { stageGroup: 'interview' }, NOW).map(r => r.applicationId), ['app-i']);
  assert.deepEqual(filterRows(rows, { stageGroup: 'offer' }, NOW).map(r => r.applicationId), ['app-o']);
  assert.deepEqual(filterRows(rows, { stageGroup: 'recommend' }, NOW).map(r => r.applicationId), ['app-r']);
});

test('搜索：候选人姓名 / 公司 / 岗位', () => {
  const rows = buildRows({ ...baseFixture(), now: NOW });
  assert.equal(filterRows(rows, { query: '张三' }, NOW).length, 1);
  assert.equal(filterRows(rows, { query: '星河科技' }, NOW).length, 1);
  assert.equal(filterRows(rows, { query: '量子算法工程师' }, NOW).length, 1);
});

test('快捷筛选清单包含 8 项', () => {
  assert.deepEqual(QUICK_FILTERS.map(item => item.key), [
    'all', 'client_feedback', 'to_schedule', 'today_interview',
    'week_interview', 'interview_feedback', 'offer', 'overdue',
  ]);
});

test('interviewLabel：今天 / 明天 / 其他', () => {
  assert.equal(Table.interviewLabel(iso(0, 14), nowMs), '今天 14:00');
  assert.equal(Table.interviewLabel(iso(1, 10), nowMs), '明天 10:00');
  assert.equal(Table.interviewLabel(iso(3, 15), nowMs), '8月21日 15:00');
  assert.equal(Table.interviewLabel('', nowMs), '—');
});
