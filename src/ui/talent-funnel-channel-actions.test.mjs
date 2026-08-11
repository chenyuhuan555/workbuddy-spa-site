import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./talent-funnel-channel-actions.js');
const { createTalentFunnelChannelActions } = globalThis.WorkBuddyTalentFunnelChannelActions;

function createRepoStub(overrides = {}) {
  const calls = [];
  const repo = {
    async listForManagement() {
      calls.push({ op: 'listForManagement' });
      return overrides.channels || [];
    },
    async create(row) {
      calls.push({ op: 'create', row });
      if (overrides.createError) throw overrides.createError;
      return row;
    },
    async rename(id, name) {
      calls.push({ op: 'rename', id, name });
      if (overrides.renameError) throw overrides.renameError;
      return { id, name };
    },
    async setStatus(id, status) {
      calls.push({ op: 'setStatus', id, status });
      if (overrides.setStatusError) throw overrides.setStatusError;
      return { id, status };
    },
  };
  return { repo, calls };
}

test('createChannel trim 名称、生成稳定 id 并默认激活', async () => {
  const { repo, calls } = createRepoStub({
    channels: [{ id: 'career_site', name: '外宣网站', status: 'active', sortOrder: 10 }],
  });
  const actions = createTalentFunnelChannelActions({ repo, createId: () => 'channel_fixed' });
  const result = await actions.createChannel({ name: '  内推  ' });

  assert.deepEqual(result, {
    id: 'channel_fixed',
    name: '内推',
    status: 'active',
    sortOrder: 20,
  });
  assert.deepEqual(calls[1], {
    op: 'create',
    row: { id: 'channel_fixed', name: '内推', status: 'active', sortOrder: 20 },
  });
});

test('createChannel 拒绝空名称', async () => {
  const { repo, calls } = createRepoStub();
  const actions = createTalentFunnelChannelActions({ repo, createId: () => 'channel_fixed' });

  await assert.rejects(() => actions.createChannel({ name: '   ' }), error => error.code === 'CHANNEL_NAME_REQUIRED');
  assert.equal(calls.some(call => call.op === 'create'), false);
});

test('createChannel 与 renameChannel 都拒绝同名渠道（含已停用渠道）', async () => {
  const channels = [
    { id: 'career_site', name: '外宣网站', status: 'active', sortOrder: 10 },
    { id: 'legacy', name: '猎聘', status: 'inactive', sortOrder: 20 },
  ];
  const { repo } = createRepoStub({ channels });
  const actions = createTalentFunnelChannelActions({ repo, createId: () => 'channel_fixed' });

  await assert.rejects(() => actions.createChannel({ name: ' 猎聘 ' }), error => error.code === 'CHANNEL_NAME_EXISTS');
  await assert.rejects(() => actions.renameChannel('career_site', ' 猎聘 '), error => error.code === 'CHANNEL_NAME_EXISTS');
});

test('renameChannel 只提交稳定 id 与 trim 后名称', async () => {
  const channels = [{ id: 'career_site', name: '外宣网站', status: 'active', sortOrder: 10 }];
  const { repo, calls } = createRepoStub({ channels });
  const actions = createTalentFunnelChannelActions({ repo, createId: () => 'unused' });
  const result = await actions.renameChannel({ id: 'career_site', name: '外宣网站' }, '  官网投递  ');

  assert.deepEqual(result, { id: 'career_site', name: '官网投递' });
  assert.deepEqual(calls.find(call => call.op === 'rename'), {
    op: 'rename',
    id: 'career_site',
    name: '官网投递',
  });
  assert.equal(calls.some(call => call.op === 'create'), false);
});

test('权限错误与数据库错误转换为稳定错误码', async () => {
  const writeForbidden = createRepoStub({
    channels: [],
    createError: Object.assign(new Error('forbidden'), { code: 'WRITE_FORBIDDEN' }),
  });
  const writeActions = createTalentFunnelChannelActions({ repo: writeForbidden.repo, createId: () => 'channel_fixed' });
  await assert.rejects(() => writeActions.createChannel({ name: '新增渠道' }), error => error.code === 'CHANNEL_PERMISSION_DENIED');

  const backendFailure = createRepoStub({
    channels: [{ id: 'career_site', name: '外宣网站', status: 'active', sortOrder: 10 }],
    renameError: Object.assign(new Error('db down'), { code: 'BACKEND_REQUEST_FAILED' }),
  });
  const renameActions = createTalentFunnelChannelActions({ repo: backendFailure.repo });
  await assert.rejects(() => renameActions.renameChannel('career_site', '官网投递'), error => error.code === 'CHANNEL_BACKEND_ERROR');
});

test('数据库唯一冲突即使绕过前端预检仍保持可识别错误码', async () => {
  const conflict = Object.assign(new Error('duplicate key'), { code: 'CHANNEL_NAME_CONFLICT' });
  const { repo } = createRepoStub({ createError: conflict, renameError: conflict });
  const actions = createTalentFunnelChannelActions({ repo, createId: () => 'channel_fixed' });

  await assert.rejects(() => actions.createChannel({ name: '数据库已存在' }), error => error.code === 'CHANNEL_NAME_CONFLICT');
  await assert.rejects(() => actions.renameChannel('career_site', '数据库已存在'), error => error.code === 'CHANNEL_NAME_CONFLICT');
});

test('toggleChannel 支持停用与启用', async () => {
  const { repo, calls } = createRepoStub();
  const actions = createTalentFunnelChannelActions({ repo });

  assert.deepEqual(await actions.toggleChannel({ id: 'career_site', status: 'active' }), { id: 'career_site', status: 'inactive' });
  assert.deepEqual(await actions.toggleChannel('career_site', true), { id: 'career_site', status: 'active' });
  assert.deepEqual(
    calls.filter(call => call.op === 'setStatus'),
    [
      { op: 'setStatus', id: 'career_site', status: 'inactive' },
      { op: 'setStatus', id: 'career_site', status: 'active' },
    ],
  );
});

test('index.html 按顺序加载渠道 repo 和 action 模块', () => {
  const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const repoPos = indexHtml.indexOf('./src/services/repo/talent-source-channel-repo.js');
  const actionPos = indexHtml.indexOf('./src/ui/talent-funnel-channel-actions.js');

  assert.ok(repoPos >= 0, '应加载 talent-source-channel-repo.js');
  assert.ok(actionPos >= 0, '应加载 talent-funnel-channel-actions.js');
  assert.ok(repoPos < actionPos, 'repo 脚本应早于 action 脚本加载');
});
