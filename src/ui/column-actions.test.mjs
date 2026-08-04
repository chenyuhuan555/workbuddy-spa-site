import test from 'node:test';
import assert from 'node:assert/strict';
import { createColumnActions } from './column-actions.js';

function setup(columns = [{ name: '个人', jobs: [] }, { name: '公共', jobs: [] }]) {
  const newColName = { value: '' };
  const messages = [];
  const actions = createColumnActions({ columns, newColName, showToast: (...args) => messages.push(args), confirmAction: () => true });
  return { actions, columns, newColName, messages };
}

test('adds a new column before the public column and rejects duplicates', () => {
  const { actions, columns, newColName, messages } = setup();
  newColName.value = '新承接方';
  actions.addColumn();
  assert.deepEqual(columns.map(column => column.name), ['个人', '新承接方', '公共']);
  newColName.value = '新承接方';
  actions.addColumn();
  assert.deepEqual(messages.at(-1), ['该名称已存在', 'error']);
});

test('protects the public column and keeps at least one column', () => {
  const { actions, columns, messages } = setup([{ name: '公共', jobs: [] }]);
  actions.deleteColumn(0);
  assert.deepEqual(messages.at(-1), ['至少保留一个承接方', 'error']);
  const other = setup([{ name: '个人', jobs: [] }, { name: '公共', jobs: [] }]);
  other.actions.deleteColumn(1);
  assert.deepEqual(other.messages.at(-1), ['公共承接方不能删除', 'error']);
});

test('requires confirmation when deleting a non-empty column', () => {
  const columns = [{ name: '个人', jobs: [{ id: 'job1' }] }, { name: '公共', jobs: [] }];
  let confirmed = false;
  const actions = createColumnActions({ columns, newColName: { value: '' }, confirmAction: () => { confirmed = true; return true; } });
  actions.deleteColumn(0);
  assert.equal(confirmed, true);
  assert.deepEqual(columns.map(column => column.name), ['公共']);
});
