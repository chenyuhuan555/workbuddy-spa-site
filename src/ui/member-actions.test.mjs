import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemberActions } from './member-actions.js';

function setup() {
  const state = { members: [], loading: false, error: '', form: { username: 'new', displayName: '新成员', role: 'member', password: 'password1' } };
  const calls = [];
  const actions = createMemberActions({
    state,
    canManageMembers: true,
    invoke: async body => { calls.push(body); return body.action === 'list' ? { members: [{ id: 'm1' }] } : {}; },
    showToast: (...args) => calls.push(['toast', ...args]),
    confirmAction: () => true,
    promptAction: () => 'password2',
  });
  return { actions, state, calls };
}

test('loads and creates members through the injected backend action', async () => {
  const { actions, state, calls } = setup();
  await actions.loadMembers();
  assert.deepEqual(state.members, [{ id: 'm1' }]);
  await actions.createMember();
  assert.deepEqual(state.form, { username: '', displayName: '', role: 'member', password: '' });
  assert.deepEqual(calls.at(-1), ['toast', '普通成员创建成功', 'success']);
});

test('resets a member password and rejects short passwords', async () => {
  const { actions, state, calls } = setup();
  const short = createMemberActions({ ...setup(), state, canManageMembers: true, promptAction: () => 'short' });
  await short.resetMemberPassword({ id: 'm1', display_name: '成员' });
  assert.equal(state.error, '临时密码至少需要 8 位');
  await actions.resetMemberPassword({ id: 'm1', display_name: '成员' });
  assert.deepEqual(calls.at(-1), ['toast', '临时密码已重置', 'success']);
});

test('status and delete actions require confirmation', async () => {
  const { actions, calls } = setup();
  await actions.setMemberStatus({ id: 'm1', display_name: '成员' }, false);
  await actions.deleteMember({ id: 'm1', display_name: '成员' });
  assert.equal(calls.filter(call => call.action === 'disable' || call.action === 'delete').length, 2);
});
