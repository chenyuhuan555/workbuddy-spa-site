import test from 'node:test';
import assert from 'node:assert/strict';
import { createNetworkIntroActions } from './network-intro-actions.js';

test('generates and stores a network introduction draft', async () => {
  const dialog = { selectedEdge: { relations: ['same_company'], otherResume: { id: 'r2', name: '线人' } }, resume: { id: 'r1', name: '目标' }, job: { company: '公司' }, pos: { name: '岗位' } };
  const actions = createNetworkIntroActions({ dialog, callAi: async () => '你好，想请你帮忙了解一下目标近期是否看机会。', relationLabel: () => '共同公司', genId: () => 'intro-1', currentTime: () => 'now' });
  assert.equal(await actions.generate(), true);
  assert.equal(dialog.draft, '你好，想请你帮忙了解一下目标近期是否看机会。');
  assert.equal(dialog.resume.networkIntroDrafts[0].id, 'intro-1');
});

test('reports missing relation target and copies text through the injected clipboard', async () => {
  const toasts = [];
  const dialog = {};
  const writes = [];
  const actions = createNetworkIntroActions({ dialog, showToast: message => toasts.push(message), clipboard: { writeText: async value => writes.push(value) } });
  assert.equal(await actions.generate(), false);
  assert.equal(await actions.copy('话术内容'), true);
  assert.deepEqual(writes, ['话术内容']);
  assert.deepEqual(toasts, ['请先选择一个可引荐候选人', '引荐话术已复制']);
});
