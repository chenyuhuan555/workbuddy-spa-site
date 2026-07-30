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
    name: '雷艺旋',
    currentCompany: '',
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

test('createDraft 兼容只有 keywords 的旧人才，但不恢复已明确清空的 skills', () => {
  assert.deepEqual(Editor.createDraft({ keywords: ['Java', 'Vue'] }).skills, ['Java', 'Vue']);
  assert.deepEqual(Editor.createDraft({ skills: [], keywords: ['旧标签'] }).skills, []);
});

test('normalizeTags 支持数组和逗号分隔的待提交输入', () => {
  assert.deepEqual(
    Editor.normalizeTags([' Java ', '企业文化', 'Java', ''], '人才发展，HRBP, 企业文化'),
    ['Java', '企业文化', '人才发展', 'HRBP'],
  );
});

test('buildPatch 返回姓名、当前公司和既有核心字段，并清理首尾空格', () => {
  const patch = Editor.buildPatch({
    name: ' 雷艺旋 ',
    currentCompany: ' 百度（百度智能云） ',
    skills: [' 培训 '],
    directions: ['人才发展'],
    owner: ' 顾问B ',
    phone: ' 15500000000 ',
    email: ' lei@example.com ',
    resumeVersions: ['不得写入'],
  }, '企业文化', '组织发展');

  assert.deepEqual(patch, {
    name: '雷艺旋',
    currentCompany: '百度（百度智能云）',
    skills: ['培训', '企业文化'],
    directions: ['人才发展', '组织发展'],
    owner: '顾问B',
    phone: '15500000000',
    email: 'lei@example.com',
  });
});

test('buildPatch 拒绝空白候选人姓名，但允许清空当前公司', () => {
  assert.throws(() => Editor.buildPatch({ name: '   ' }), /姓名不能为空/);
  assert.equal(Editor.buildPatch({ name: '雷艺旋', currentCompany: '   ' }).currentCompany, '');
});

test('save 只应用核心字段并持久化一次', async () => {
  const candidate = {
    id: 'c1',
    currentCompany: '旧公司',
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
      name: '雷艺旋（更新）',
      currentCompany: '百度',
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
  assert.deepEqual(Object.keys(updates[0].patch).sort(), ['currentCompany', 'directions', 'email', 'name', 'owner', 'phone', 'skills']);
  assert.equal(candidate.name, '雷艺旋（更新）');
  assert.equal(candidate.currentCompany, '百度');
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
    name: '旧姓名',
    currentCompany: '旧公司',
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
    draft: { name: '雷艺旋', currentCompany: '', skills: ['新技能'], directions: [], owner: '', phone: '', email: '' },
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
    name: '旧姓名',
    currentCompany: '旧公司',
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

test('核心信息卡提供卡片级编辑动作和有标签的字段', () => {
  assert.match(INDEX_HTML, /candidate-core-editor\.js\?v=20260730-core2/);
  assert.match(INDEX_HTML, /@click="startCandidateCoreEdit"/);
  assert.match(INDEX_HTML, /@click="saveCandidateCoreEdit"/);
  assert.match(INDEX_HTML, /@click="cancelCandidateCoreEdit"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.name"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.currentCompany"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.owner"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.phone"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.email"/);
  assert.match(INDEX_HTML, /list="candidate-core-owner-options"/);
  assert.match(INDEX_HTML, /id="candidate-core-owner-options"/);
});

test('核心信息卡同时展示手机号和邮箱，并保留独立人才分类流程', () => {
  assert.match(INDEX_HTML, /v-if="selectedCandidate\.phone"[^>]*>手机号：/);
  assert.match(INDEX_HTML, /v-if="selectedCandidate\.email"[^>]*>邮箱：/);
  assert.doesNotMatch(INDEX_HTML, /selectedCandidate\.phone \|\| selectedCandidate\.email/);
  assert.match(INDEX_HTML, /updateSelectedCandidateCategories\(category\.id/);
  assert.doesNotMatch(INDEX_HTML, /Object\.assign\(selectedCandidate[^,]*,\s*candidateCoreEdit\.draft/);
});

test('核心信息编辑器提供可访问的标签和保存控件', () => {
  assert.match(INDEX_HTML, /aria-label="添加技术栈"/);
  assert.match(INDEX_HTML, /aria-label="添加人才方向"/);
  assert.match(INDEX_HTML, /:aria-label="'删除技术栈 '/);
  assert.match(INDEX_HTML, /:aria-label="'删除人才方向 '/);
  assert.match(INDEX_HTML, /role="alert"/);
  assert.match(INDEX_HTML, /candidateCoreEdit\.saving \? '保存中…' : '保存'/);
});
