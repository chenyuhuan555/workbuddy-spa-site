import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTodo, isSystemTodo, reconcileSystemTodos } from './todo-reconciler.js';

function derivedFixture() {
  return [
    {
      source: 'system',
      ruleKey: 'application.client_feedback_due',
      dedupeKey: 'application.client_feedback_due:app1',
      title: '跟进客户反馈',
      subtitle: '张三 · 星河科技 / AI产品负责人',
      type: 'followup',
      dueAt: '2026-08-18',
      entityType: 'application',
      entityId: 'app1',
      applicationId: 'app1',
      candidateId: 'c1',
      companyId: 'co1',
      positionId: 'p1',
      owner: '顾问A',
      linkType: 'application',
      linkId: 'app1',
      status: 'pending',
    },
  ];
}

test('首次对账 → 创建 System Todo，且字段完整', () => {
  const result = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  assert.equal(result.todos.length, 1);
  assert.equal(result.changes.created, 1);
  const todo = result.todos[0];
  assert.ok(todo.id);
  assert.equal(todo.dedupeKey, 'application.client_feedback_due:app1');
  assert.equal(todo.source, 'system');
  assert.equal(todo.status, 'pending');
  assert.equal(todo.done, false);
  assert.ok(todo.createdAt);
  assert.ok(todo.updatedAt);
  assert.equal(todo.completedAt, null);
  assert.equal(todo.applicationId, 'app1');
  assert.equal(todo.candidateId, 'c1');
});

test('重复对账（同 derived）→ 不产生重复 Todo', () => {
  const first = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  const second = reconcileSystemTodos({ todos: first.todos, derived: derivedFixture(), now: '2026-08-18T11:00:00.000Z' });
  assert.equal(second.todos.length, 1, '同一 dedupeKey 不应重复创建');
  assert.equal(second.changes.created, 0);
  assert.equal(second.changes.kept, 1);
  assert.equal(second.todos[0].id, first.todos[0].id);
});

test('字段变化（dueAt / owner / 副标题）→ 更新而非新建', () => {
  const first = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  const changed = derivedFixture();
  changed[0].dueAt = '2026-08-19';
  changed[0].owner = '顾问B';
  const second = reconcileSystemTodos({ todos: first.todos, derived: changed, now: '2026-08-18T11:00:00.000Z' });
  assert.equal(second.todos.length, 1);
  assert.equal(second.changes.updated, 1);
  assert.equal(second.todos[0].dueAt, '2026-08-19');
  assert.equal(second.todos[0].owner, '顾问B');
});

test('Application 进入一面 → client_feedback_due 自动 cancelled', () => {
  const first = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  // 业务推进到一面后，规则不再产出 client_feedback_due
  const second = reconcileSystemTodos({ todos: first.todos, derived: [], now: '2026-08-18T11:00:00.000Z' });
  assert.equal(second.changes.cancelled, 1);
  assert.equal(second.todos[0].status, 'cancelled');
  assert.ok(second.todos[0].id, 'cancelled 不物理删除，保留记录');
});

test('System Todo 完成后再次对账 → 保持 done 不被重新拉起', () => {
  const first = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  const completed = { ...first.todos[0], done: true, status: 'done', completedAt: '2026-08-18T10:30:00.000Z' };
  const second = reconcileSystemTodos({ todos: [completed], derived: derivedFixture(), now: '2026-08-18T12:00:00.000Z' });
  assert.equal(second.changes.updated, 0);
  assert.equal(second.changes.kept, 1);
  assert.equal(second.todos[0].status, 'done');
  assert.equal(second.todos[0].done, true);
  assert.equal(second.todos[0].completedAt, '2026-08-18T10:30:00.000Z');
});

test('用户忽略（cancelled）的 System Todo → 不复活', () => {
  const first = reconcileSystemTodos({ todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  const ignored = { ...first.todos[0], done: false, status: 'cancelled' };
  const second = reconcileSystemTodos({ todos: [ignored], derived: derivedFixture(), now: '2026-08-18T12:00:00.000Z' });
  assert.equal(second.todos[0].status, 'cancelled');
  assert.equal(second.changes.created, 0);
});

test('旧 Todo 无 source/status → 兼容为 manual + done 推导', () => {
  assert.deepEqual(normalizeTodo({ done: true }), { done: true, source: 'manual', status: 'done' });
  assert.deepEqual(normalizeTodo({ done: false }), { done: false, source: 'manual', status: 'pending' });
  assert.equal(isSystemTodo({ source: 'system' }), true);
  assert.equal(isSystemTodo({ done: false }), false);
});

test('Manual Todo 不受对账影响', () => {
  const manual = { id: 'm1', title: '手工待办', done: false, source: 'manual', status: 'pending' };
  const result = reconcileSystemTodos({ todos: [manual], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z' });
  const kept = result.todos.find(todo => todo.id === 'm1');
  assert.ok(kept, 'manual todo 应保留');
  assert.equal(kept.status, 'pending');
  assert.equal(kept.title, '手工待办');
});

test('完整闭环：推荐 → 生成 → 推进到一面 → 旧 Todo 关闭', () => {
  const derived = derivedFixture();
  const step1 = reconcileSystemTodos({ todos: [], derived, now: '2026-08-18T10:00:00.000Z' });
  assert.equal(step1.changes.created, 1);
  const step2 = reconcileSystemTodos({ todos: step1.todos, derived, now: '2026-08-18T10:00:01.000Z' });
  assert.equal(step2.todos.length, 1, '重复执行不生成重复');
  const step3 = reconcileSystemTodos({ todos: step2.todos, derived: [], now: '2026-08-18T12:00:00.000Z' });
  assert.equal(step3.todos[0].status, 'cancelled', '推进后旧 Todo 自动关闭');
});

test('面试时间变更 → 旧面试提醒自动关闭，新面试提醒生成', () => {
  const base = {
    source: 'system', ruleKey: 'application.interview_reminder',
    title: '明日面试', subtitle: '张三 · 星河科技 / AI产品负责人', type: 'interview',
    entityType: 'application', entityId: 'app1', applicationId: 'app1',
    candidateId: 'c1', companyId: 'co1', positionId: 'p1', owner: '顾问A',
    linkType: 'application', linkId: 'app1', status: 'pending', dueAt: '2026-08-19',
  };
  const step1 = reconcileSystemTodos({
    todos: [],
    derived: [{ ...base, dedupeKey: 'application.interview_reminder:app1:2026-08-19' }],
    now: '2026-08-18T10:00:00.000Z',
  });
  assert.equal(step1.changes.created, 1);
  // 面试改到后天：dedupeKey 变化 → 旧 Todo cancelled、新 Todo 创建
  const step2 = reconcileSystemTodos({
    todos: step1.todos,
    derived: [{ ...base, dedupeKey: 'application.interview_reminder:app1:2026-08-20', dueAt: '2026-08-20' }],
    now: '2026-08-18T11:00:00.000Z',
  });
  assert.equal(step2.changes.created, 1);
  assert.equal(step2.changes.cancelled, 1);
  const statuses = step2.todos.map(todo => `${todo.dedupeKey}:${todo.status}`).sort();
  assert.deepEqual(statuses, [
    'application.interview_reminder:app1:2026-08-19:cancelled',
    'application.interview_reminder:app1:2026-08-20:pending',
  ]);
});

test('makeId 自定义生成器生效', () => {
  const result = reconcileSystemTodos({
    todos: [], derived: derivedFixture(), now: '2026-08-18T10:00:00.000Z',
    makeId: prefix => `${prefix}_custom_1`,
  });
  assert.equal(result.todos[0].id, 'todo_custom_1');
});
