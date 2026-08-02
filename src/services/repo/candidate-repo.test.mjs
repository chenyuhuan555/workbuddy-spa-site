import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./candidate-repo.js');
const Repo = globalThis.WorkBuddyCandidateRepo;

function mockSupabase(behavior = {}) {
  const calls = [];
  const builder = {
    upsert: (row, opts) => {
      calls.push({ op: 'upsert', row, opts });
      return Promise.resolve(behavior.upsertResult || { error: null });
    },
    select: (cols, opts) => {
      calls.push({ op: 'select', cols, opts });
      return builder;
    },
    eq: (col, val) => {
      calls.push({ op: 'eq', col, val });
      return builder;
    },
    gt: (col, val) => {
      calls.push({ op: 'gt', col, val });
      return builder;
    },
    order: (col, opts) => {
      calls.push({ op: 'order', col, opts });
      return builder;
    },
    limit: (n) => {
      calls.push({ op: 'limit', n });
      return builder;
    },
    maybeSingle: () => Promise.resolve(behavior.singleResult || { data: null, error: null }),
    then: resolve => resolve(behavior.selectResult || { data: [], error: null, count: 0 }),
  };
  return {
    calls,
    from: table => {
      calls.push({ op: 'from', table });
      return builder;
    },
  };
}

const adminProfile = { status: 'active', role: 'admin' };
const editorProfile = { status: 'active', role: 'editor' };
const memberProfile = { status: 'active', role: 'member' };

test('repo 模块已加载', () => {
  assert.ok(Repo);
  assert.equal(Repo.TABLE, 'candidates');
});

test('upsertCandidate 写入 text 主键行并剥离版本文本', async () => {
  const sb = mockSupabase();
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => adminProfile });
  const cand = {
    id: 'cand_abc', name: '张三', phone: '123', email: 'a@b.c',
    tags: ['x'], skills: ['Java'],
    resumeVersions: [{ id: 'resume_1', fileName: 'a.pdf', rawText: '大文本', fileData: 'base64' }],
  };
  const ok = await repo.upsertCandidate(cand);
  assert.equal(ok, true);
  const up = sb.calls.find(c => c.op === 'upsert');
  assert.equal(up.row.id, 'cand_abc');
  assert.equal(up.opts.onConflict, 'id');
  // 版本大文本被剥离，元数据保留
  assert.equal(up.row.resume_versions[0].rawText, undefined);
  assert.equal(up.row.resume_versions[0].fileName, 'a.pdf');
});

test('upsertCandidates 批量写入多行', async () => {
  const sb = mockSupabase();
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => editorProfile });
  const n = await repo.upsertCandidates([{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }]);
  assert.equal(n, 2);
  const up = sb.calls.find(c => c.op === 'upsert');
  assert.equal(up.row.length, 2);
});

test('upsertCandidates 空入参返回 0 且不发请求', async () => {
  const sb = mockSupabase();
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => adminProfile });
  assert.equal(await repo.upsertCandidates([]), 0);
  assert.equal(sb.calls.filter(c => c.op === 'from').length, 0);
});

test('member 角色写入被拒绝', async () => {
  const sb = mockSupabase();
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => memberProfile });
  await assert.rejects(() => repo.upsertCandidate({ id: 'c1', name: 'A' }), /WRITE_REQUIRED/);
});

test('未登录读取被拒绝', async () => {
  const sb = mockSupabase();
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => null });
  await assert.rejects(() => repo.getCandidate('c1'), /AUTH_REQUIRED/);
});

test('getCandidate 命中返回模型', async () => {
  const hit = mockSupabase({
    singleResult: {
      data: { id: 'c1', name: 'A', resume_versions: [], tags: [], skills: [], keywords: [], directions: [], category_ids: [] },
      error: null,
    },
  });
  const repo = Repo.createCandidateRepo({ supabase: hit, getProfile: () => memberProfile });
  const m = await repo.getCandidate('c1');
  assert.equal(m.id, 'c1');
  assert.equal(m.name, 'A');
  assert.deepEqual(m.categoryIds, []);
});

test('getCandidatesSince 按游标分页', async () => {
  const sb = mockSupabase({
    selectResult: {
      data: [{ id: 'c1', name: 'A', resume_versions: [], tags: [], skills: [], keywords: [], directions: [], category_ids: [] }],
      error: null,
    },
  });
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => adminProfile });
  const list = await repo.getCandidatesSince('2026-01-01T00:00:00Z', 100);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'c1');
  const gt = sb.calls.find(c => c.op === 'gt');
  assert.equal(gt.col, 'updated_at');
  assert.equal(gt.val, '2026-01-01T00:00:00Z');
});

test('countCandidates 返回数量', async () => {
  const sb = mockSupabase({ selectResult: { count: 5, error: null } });
  const repo = Repo.createCandidateRepo({ supabase: sb, getProfile: () => adminProfile });
  assert.equal(await repo.countCandidates(), 5);
});

test('mergeCandidateInto 云端赢标量字段、本地文本优先、云端独有版本追加、不删本地', () => {
  const repo = Repo.createCandidateRepo({ supabase: mockSupabase(), getProfile: () => adminProfile });
  const local = {
    id: 'c1', name: '旧名', phone: '111', status: 'open',
    resumeVersions: [
      { id: 'rv_local', fileName: 'a.pdf', rawText: '本地全文', fileData: 'base64' },
      { id: 'rv_drop', fileName: 'drop.pdf' },
    ],
  };
  const cloud = {
    id: 'c1', name: '新名', phone: '222', status: 'active',
    resumeVersions: [
      { id: 'rv_local', fileName: 'a.pdf' },          // 云端已剥离文本
      { id: 'rv_cloud_only', fileName: 'b.pdf' },       // 云端独有
    ],
  };
  const merged = repo.mergeCandidateInto(local, cloud);
  assert.equal(merged.name, '新名');        // 云端赢
  assert.equal(merged.phone, '222');        // 云端赢
  assert.equal(merged.resumeVersions.length, 3);  // local 两个 + cloud 独有一个
  const localVer = merged.resumeVersions.find(v => v.id === 'rv_local');
  assert.equal(localVer.rawText, '本地全文');   // 本地文本保留
  assert.equal(localVer.fileData, 'base64');      // 本地 fileData 保留
  const dropped = merged.resumeVersions.find(v => v.id === 'rv_drop');
  assert.ok(dropped, '本地独有版本未被删除');     // 不删本地
  const cloudOnly = merged.resumeVersions.find(v => v.id === 'rv_cloud_only');
  assert.ok(cloudOnly, '云端独有版本已追加');
});

test('mergeCandidateInto 空参安全返回', () => {
  const repo = Repo.createCandidateRepo({ supabase: mockSupabase(), getProfile: () => adminProfile });
  assert.equal(repo.mergeCandidateInto(null, null), null);
  const only = { id: 'x' };
  assert.equal(repo.mergeCandidateInto(only, null), only);
});
