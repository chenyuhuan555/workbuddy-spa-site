import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./resume-version-repo.js');
const Repo = globalThis.WorkBuddyResumeVersionRepo;

const adminProfile = { id: 'admin-1', status: 'active', role: 'admin' };
const memberProfile = { id: 'member-1', status: 'active', role: 'member' };

function mockSupabase({ data = [], pages = null, error = null, count = null } = {}) {
  const calls = [];
  let queryIndex = 0;
  const builder = {
    select(...args) { calls.push({ op: 'select', args }); return this; },
    eq(col, value) { calls.push({ op: 'eq', col, value }); return this; },
    order(col, options) { calls.push({ op: 'order', col, options }); return this; },
    range(from, to) { calls.push({ op: 'range', from, to }); return this; },
    in(col, values) { calls.push({ op: 'in', col, values }); return this; },
    upsert(row, options) { calls.push({ op: 'upsert', row, options }); return Promise.resolve({ data: null, error }); },
    then(resolve) {
      const current = Array.isArray(pages) ? (pages[queryIndex++] || []) : data;
      return Promise.resolve({ data: current, error, count }).then(resolve);
    },
  };
  return { from() { return builder; }, calls };
}

test('repo 模块已加载并使用 resume_versions 表', () => {
  assert.equal(Repo.TABLE, 'resume_versions');
  assert.equal(typeof Repo.createResumeVersionRepo, 'function');
});

test('upsertVersions 写入版本元数据并剥离全部大字段', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeVersionRepo({ supabase: sb, getProfile: () => adminProfile });
  await repo.upsertVersions('cand_1', [{
    id: 'resume_1', fileName: 'a.pdf', fileId: 'file_1', rawText: '原文', formattedText: '排版',
    fileData: 'base64', electronicResumeText: '旧字段', customStatus: 'review',
  }]);
  const row = sb.calls.find(call => call.op === 'upsert').row[0];
  assert.equal(row.id, 'resume_1');
  assert.equal(row.candidate_id, 'cand_1');
  assert.equal(row.file_name, 'a.pdf');
  assert.equal(row.file_id, 'file_1');
  assert.equal(row.raw_text, undefined);
  assert.equal(row.formatted_text, undefined);
  assert.equal(row.file_data, undefined);
  assert.deepEqual(row.extra, { customStatus: 'review' });
});

test('upsertVersionRows 支持跨候选人批量写入且空时间归一为 null', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeVersionRepo({ supabase: sb, getProfile: () => adminProfile });
  const count = await repo.upsertVersionRows([
    { candidateId: 'cand_a', version: { id: 'v_a', uploadedAt: '' } },
    { candidateId: 'cand_b', version: { id: 'v_b', formattedAt: '' } },
  ]);
  assert.equal(count, 2);
  const rows = sb.calls.find(call => call.op === 'upsert').row;
  assert.deepEqual(rows.map(row => row.candidate_id), ['cand_a', 'cand_b']);
  assert.equal(rows[0].uploaded_at, null);
  assert.equal(rows[1].formatted_at, null);
});

test('toModel 保留 extra 并恢复前端字段', async () => {
  const sb = mockSupabase({ data: [{
    id: 'resume_1', candidate_id: 'cand_1', file_name: 'a.pdf', file_id: 'file_1',
    format_status: 'done', extra: { customStatus: 'review' }, raw_text: '不要返回', formatted_text: '不要返回',
  }] });
  const repo = Repo.createResumeVersionRepo({ supabase: sb, getProfile: () => adminProfile });
  const rows = await repo.listVersionsPage(0, 10);
  assert.equal(rows[0].id, 'resume_1');
  assert.equal(rows[0].candidateId, 'cand_1');
  assert.equal(rows[0].fileName, 'a.pdf');
  assert.equal(rows[0].customStatus, 'review');
  assert.equal(rows[0].rawText, undefined);
});

test('listAllVersions 使用 updated_at/id 稳定分页', async () => {
  const sb = mockSupabase({ pages: [
    [{ id: 'r1', candidate_id: 'c1' }, { id: 'r2', candidate_id: 'c1' }],
    [{ id: 'r3', candidate_id: 'c2' }],
  ] });
  const repo = Repo.createResumeVersionRepo({ supabase: sb, getProfile: () => adminProfile });
  const rows = await repo.listAllVersions(2);
  assert.deepEqual(rows.map(row => row.id), ['r1', 'r2', 'r3']);
});

test('写入权限和读取权限沿用 active 成员角色边界', async () => {
  const repo = Repo.createResumeVersionRepo({ supabase: mockSupabase(), getProfile: () => memberProfile });
  await assert.rejects(() => repo.upsertVersions('c1', [{ id: 'r1' }]), error => error.code === 'WRITE_REQUIRED');
  const reader = Repo.createResumeVersionRepo({ supabase: mockSupabase({ data: [] }), getProfile: () => memberProfile });
  await assert.doesNotReject(() => reader.listVersionsPage(0, 1));
});

test('resume-versions.sql 声明 text 关系、extra 和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/resume-versions.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public\.resume_versions/i);
  assert.match(sql, /candidate_id\s+text\s+not null/i);
  assert.match(sql, /extra\s+jsonb\s+not null\s+default\s+'\{\}'/i);
  assert.match(sql, /alter table public\.resume_versions enable row level security/i);
});
