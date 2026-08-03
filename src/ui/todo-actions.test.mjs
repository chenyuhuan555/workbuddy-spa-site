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
