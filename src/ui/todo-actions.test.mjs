import test from 'node:test';
import assert from 'node:assert/strict';
import { createTodoActions } from './todo-actions.js';

function setup() {
  const todoForm = { open: false, mode: 'create', error: '', editingId: '', saving: false, form: { title: '', subtitle: '', type: 'custom', date: '', linkType: 'none', linkId: '', linkLabel: '' } };
  const todoDetail = { open: false, todo: null };
  const todoListView = { open: false, filter: 'pending' };
  const privateTodos = [];
  const calls = [];
  const actions = createTodoActions({
    todoForm, todoDetail, todoListView, privateTodos, todoLinkOptions: { value: [{ id: 'c1', label: '候选人一' }] },
    workbenchV2: { createTodo: payload => ({ id: 't1', ...payload }), applications: [] },
    getPrivateTodoClient: () => ({ save: async todo => ({ ...todo }), remove: async id => calls.push(['remove', id]) }),
    showToast: (...args) => calls.push(['toast', ...args]),
    openCandidateDetail: id => calls.push(['candidate', id]),
  });
  return { actions, todoForm, todoDetail, todoListView, privateTodos, calls };
}

test('saves a manual todo and resets the form', async () => {
  const { actions, todoForm, privateTodos, calls } = setup();
  todoForm.form.title = '跟进候选人';
  await actions.saveTodo();
  assert.equal(privateTodos.length, 1);
  assert.equal(todoForm.open, false);
  assert.deepEqual(calls.at(-1), ['toast', '待办已新增']);
});

test('toggles and deletes manual todo', async () => {
  const { actions, todoDetail, privateTodos, calls } = setup();
  privateTodos.push({ id: 't1', title: '跟进', done: false });
  await actions.toggleTodoDone({ id: 't1', source: 'manual' });
  assert.equal(privateTodos[0].done, true);
  await actions.deleteTodo({ id: 't1', source: 'manual' });
  assert.equal(privateTodos.length, 0);
  assert.equal(todoDetail.open, false);
  assert.deepEqual(calls.at(-1), ['toast', '待办已删除']);
});

test('jumps to a linked candidate', () => {
  const { actions, todoDetail, todoListView, calls } = setup();
  todoDetail.open = true; todoListView.open = true;
  actions.jumpToTodoLink({ linkType: 'candidate', linkId: 'c1' });
  assert.equal(todoDetail.open, false);
  assert.equal(todoListView.open, false);
  assert.deepEqual(calls.at(-1), ['candidate', 'c1']);
});

test('jumps to a linked application via application detail first', () => {
  const { actions, calls } = setup();
  const appOpen = [];
  const actionsWithApp = createTodoActions({
    todoForm: { open: false, mode: 'create', error: '', editingId: '', saving: false, form: {} },
    todoDetail: { open: true, todo: null }, todoListView: { open: true, filter: 'all' },
    privateTodos: [], todoLinkOptions: { value: [] },
    workbenchV2: { createTodo: p => ({ id: 't1', ...p }), applications: [] },
    getPrivateTodoClient: () => ({ save: async t => t, remove: async () => {} }),
    showToast: () => {}, openApplicationDetail: id => appOpen.push(id),
  });
  actionsWithApp.jumpToTodoLink({ linkType: 'application', linkId: 'app1' });
  assert.deepEqual(appOpen, ['app1']);
});

test('system todo can be marked done and restored', async () => {
  const { actions, privateTodos, todoDetail } = setup();
  privateTodos.push({ id: 't-sys', title: '跟进客户反馈', done: false, source: 'system', status: 'pending', dedupeKey: 'application.client_feedback_due:app1' });
  const view = { id: 't-sys', title: '跟进客户反馈', done: false, source: 'system', _raw: privateTodos[0] };
  todoDetail.todo = view;
  await actions.toggleTodoDone(view);
  assert.equal(privateTodos[0].done, true);
  assert.equal(privateTodos[0].status, 'done');
  assert.ok(privateTodos[0].completedAt, '完成时应写入 completedAt');
  await actions.toggleTodoDone({ id: 't-sys', source: 'system', _raw: privateTodos[0] });
  assert.equal(privateTodos[0].done, false);
  assert.equal(privateTodos[0].status, 'pending');
  assert.equal(privateTodos[0].completedAt, null, '恢复时清空 completedAt');
});

test('system todo cannot be deleted', async () => {
  const { actions, privateTodos, calls } = setup();
  privateTodos.push({ id: 't-sys', title: '跟进客户反馈', done: false, source: 'system', status: 'pending' });
  await actions.deleteTodo({ id: 't-sys', source: 'system', _raw: privateTodos[0] });
  assert.equal(privateTodos.length, 1, 'system todo 不应被删除');
  assert.deepEqual(calls.at(-1), ['toast', '系统待办不支持删除，可标记完成或忽略', 'error']);
});

test('legacy todo without source can still be toggled and deleted', async () => {
  const { actions, privateTodos } = setup();
  privateTodos.push({ id: 't-old', title: '旧待办', done: false });
  await actions.toggleTodoDone({ id: 't-old', _raw: privateTodos[0] });
  assert.equal(privateTodos[0].done, true);
  assert.equal(privateTodos[0].status, 'done');
  await actions.deleteTodo({ id: 't-old', _raw: privateTodos[0] });
  assert.equal(privateTodos.length, 0, '旧数据（无 source）应视为 manual 可删除');
});
