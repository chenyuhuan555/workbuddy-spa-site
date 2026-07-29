import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./candidate-core-editor.js');
const Editor = globalThis.WorkBuddyCandidateCoreEditor;

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('createDraft 只复制允许编辑的核心字段', () => {
  const candidate = {
    id: 'c1',
    name: '雷艺旋',
    skills: ['培训', '企业文化'],
    directions: ['人才发展'],
    owner: '顾问A',
    phone: '15500000000',
    email: 'lei@example.com',
    resumeVersions: [{ id: 'r1' }],
    note: '业务备注',
  };

  const draft = Editor.createDraft(candidate);

  assert.deepEqual(draft, {
    skills: ['培训', '企业文化'],
    directions: ['人才发展'],
    owner: '顾问A',
    phone: '15500000000',
    email: 'lei@example.com',
  });
  draft.skills.push('新增');
  assert.deepEqual(candidate.skills, ['培训', '企业文化'], '草稿不得直接修改人才对象');
  assert.equal('resumeVersions' in draft, false);
});

test('normalizeTags 支持数组和逗号分隔的待提交输入', () => {
  assert.deepEqual(
    Editor.normalizeTags([' Java ', '企业文化', 'Java', ''], '人才发展，HRBP, 企业文化'),
    ['Java', '企业文化', '人才发展', 'HRBP'],
  );
});

test('buildPatch 只返回五个允许写入的底层字段', () => {
  const patch = Editor.buildPatch({
    skills: [' 培训 '],
    directions: ['人才发展'],
    owner: ' 顾问B ',
    phone: ' 15500000000 ',
    email: ' lei@example.com ',
    name: '不得写入',
  }, '企业文化', '组织发展');

  assert.deepEqual(patch, {
    skills: ['培训', '企业文化'],
    directions: ['人才发展', '组织发展'],
    owner: '顾问B',
    phone: '15500000000',
    email: 'lei@example.com',
  });
});

test('save 只应用核心字段并持久化一次', async () => {
  const candidate = {
    id: 'c1',
    name: '雷艺旋',
    skills: [],
    note: '保留',
    resumeVersions: [{ id: 'r1' }],
  };
  const bundle = { candidates: [candidate] };
  const updates = [];
  let persistCalls = 0;

  const result = await Editor.save({
    canWrite: true,
    bundle,
    candidateId: 'c1',
    draft: {
      skills: ['培训'],
      directions: ['人才发展'],
      owner: '顾问A',
      phone: '155',
      email: 'a@b.com',
    },
    updateTalent(currentBundle, id, patch) {
      assert.equal(currentBundle, bundle);
      updates.push({ id, patch });
      Object.assign(candidate, patch);
      return candidate;
    },
    async persist() {
      persistCalls++;
      return true;
    },
  });

  assert.equal(result, candidate);
  assert.deepEqual(Object.keys(updates[0].patch).sort(), ['directions', 'email', 'owner', 'phone', 'skills']);
  assert.equal(candidate.note, '保留');
  assert.deepEqual(candidate.resumeVersions, [{ id: 'r1' }]);
  assert.equal(persistCalls, 1);
});

test('save 在任何修改前拒绝只读调用', async () => {
  let updated = false;

  await assert.rejects(() => Editor.save({
    canWrite: false,
    bundle: {},
    candidateId: 'c1',
    draft: {},
    updateTalent() { updated = true; },
    persist: async () => true,
  }), /无权编辑/);

  assert.equal(updated, false);
});

test('save 持久化失败时回滚并再次持久化回滚状态', async () => {
  const candidate = {
    id: 'c1',
    skills: ['旧技能'],
    directions: ['旧方向'],
    owner: '旧顾问',
    phone: 'old-phone',
    email: 'old@example.com',
    updatedAt: 'old-time',
    note: '保留',
  };
  const bundle = { candidates: [candidate] };
  let persistCalls = 0;

  await assert.rejects(() => Editor.save({
    canWrite: true,
    bundle,
    candidateId: 'c1',
    draft: { skills: ['新技能'], directions: [], owner: '', phone: '', email: '' },
    updateTalent(_bundle, _id, patch) {
      Object.assign(candidate, patch, { updatedAt: 'new-time' });
      return candidate;
    },
    persist: async () => {
      persistCalls++;
      return persistCalls > 1;
    },
  }), /保存失败/);

  assert.deepEqual(candidate, {
    id: 'c1',
    skills: ['旧技能'],
    directions: ['旧方向'],
    owner: '旧顾问',
    phone: 'old-phone',
    email: 'old@example.com',
    updatedAt: 'old-time',
    note: '保留',
  });
  assert.equal(persistCalls, 2, '失败后必须尽力持久化回滚状态，避免备用快照保留未保存值');
});

// Task 2 会继续在本文件中使用线上入口源码做静态 UI 契约测试。
assert.ok(INDEX_HTML.includes('核心信息'));
