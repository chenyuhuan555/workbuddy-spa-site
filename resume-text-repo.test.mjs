import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./resume-text-repo.js');
const Repo = globalThis.WorkBuddyResumeTextRepo;

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
    in: (col, vals) => {
      calls.push({ op: 'in', col, vals });
      return Promise.resolve(behavior.selectResult || { data: [], error: null });
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
  assert.equal(Repo.TABLE, 'resume_texts');
});

test('upsertText 写入 text 主键行', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => adminProfile });
  const ok = await repo.upsertText({ resumeVersionId: 'resume_abc', rawText: '原文', formattedText: '排版' });
  assert.equal(ok, true);
  const up = sb.calls.find(c => c.op === 'upsert');
  assert.deepEqual(up.row, { resume_version_id: 'resume_abc', raw_text: '原文', formatted_text: '排版' });
  assert.equal(up.opts.onConflict, 'resume_version_id');
});

test('upsertText 只传 rawText 时不覆盖 formatted_text 字段', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => editorProfile });
  await repo.upsertText({ resumeVersionId: 'resume_x', rawText: '只有原文' });
  const up = sb.calls.find(c => c.op === 'upsert');
  assert.deepEqual(up.row, { resume_version_id: 'resume_x', raw_text: '只有原文' });
  assert.ok(!('formatted_text' in up.row));
});

test('member 角色写入被拒绝', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => memberProfile });
  await assert.rejects(() => repo.upsertText({ resumeVersionId: 'r1', rawText: 'x' }), /WRITE_REQUIRED/);
});

test('未登录读取被拒绝', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => null });
  await assert.rejects(() => repo.getText('r1'), /AUTH_REQUIRED/);
});

test('getText 命中返回模型，未命中返回 null', async () => {
  const hit = mockSupabase({
    singleResult: { data: { resume_version_id: 'r1', raw_text: 'a', formatted_text: 'b', updated_at: 't' }, error: null },
  });
  const repo = Repo.createResumeTextRepo({ supabase: hit, getProfile: () => memberProfile });
  const model = await repo.getText('r1');
  assert.deepEqual(model, { resumeVersionId: 'r1', rawText: 'a', formattedText: 'b', updatedAt: 't' });

  const miss = mockSupabase({ singleResult: { data: null, error: null } });
  const repo2 = Repo.createResumeTextRepo({ supabase: miss, getProfile: () => memberProfile });
  assert.equal(await repo2.getText('r2'), null);
});

test('getTexts 批量返回 Map', async () => {
  const sb = mockSupabase({
    selectResult: {
      data: [
        { resume_version_id: 'r1', raw_text: 'a', formatted_text: '', updated_at: null },
        { resume_version_id: 'r2', raw_text: '', formatted_text: 'f', updated_at: null },
      ],
      error: null,
    },
  });
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => adminProfile });
  const map = await repo.getTexts(['r1', 'r2', 'r3']);
  assert.equal(map.size, 2);
  assert.equal(map.get('r1').rawText, 'a');
  assert.equal(map.get('r2').formattedText, 'f');
});

test('getTexts 空入参不请求', async () => {
  const sb = mockSupabase();
  const repo = Repo.createResumeTextRepo({ supabase: sb, getProfile: () => adminProfile });
  const map = await repo.getTexts([]);
  assert.equal(map.size, 0);
  assert.equal(sb.calls.filter(c => c.op === 'from').length, 0);
});
