import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
globalThis.window = globalThis;
await import('./quantum-radar-repo.js');
const repo = globalThis.WorkBuddyQuantumRadarRepo;

test('量子雷达仓储默认关闭云端读写闸门', async () => {
  const api = repo.createQuantumRadarRepo({ getProfile: () => ({ status: 'active', role: 'admin' }) });
  assert.equal(api.cloudEnabled, false);
  await assert.rejects(() => api.list('jobs'), error => error.code === 'CLOUD_READ_DISABLED');
  await assert.rejects(() => api.upsert('jobs', [{ id: 'j1', title: 'demo' }]), error => error.code === 'CLOUD_WRITE_DISABLED');
});

test('量子雷达仓储映射 Supabase 行并保留扩展字段', async () => {
  const calls = [];
  const query = { select: () => query, eq: () => query, is: () => query, order: () => query, limit: async () => ({ data: [{ id: 'j1', title: 'Compiler', score: '88.5', extra: { tag: 'demo' } }], error: null }) };
  const supabase = { from(table) { calls.push(table); return { ...query, upsert(rows) { calls.push(rows); return Promise.resolve({ error: null }); } }; } };
  const api = repo.createQuantumRadarRepo({ supabase, cloudEnabled: true, getProfile: () => ({ status: 'active', role: 'editor' }) });
  const rows = await api.list('jobs');
  assert.deepEqual(rows[0], { id: 'j1', title: 'Compiler', score: 88.5, tag: 'demo' });
  assert.equal(await api.upsert('jobs', [{ id: 'j2', title: 'Cloud' }]), 1);
  assert.equal(calls[0], 'external_jobs');
});

test('量子雷达业务关联只更新雷达表，不自动创建现有岗位或人才', async () => {
  const calls = [];
  const builder = {
    update(payload) { calls.push({ op: 'update', payload }); return builder; },
    eq(column, value) { calls.push({ op: 'eq', column, value }); return calls.filter(call => call.op === 'eq').length % 2 === 0 ? Promise.resolve({ error: null }) : builder; },
  };
  const api = repo.createQuantumRadarRepo({ supabase: { from(table) { calls.push({ op: 'from', table }); return builder; } }, cloudEnabled: true, getProfile: () => ({ status: 'active', role: 'editor' }) });
  assert.deepEqual(await api.linkJobToPosition('qj-001', 'position-1'), { jobId: 'qj-001', positionId: 'position-1' });
  assert.deepEqual(await api.linkTalentToCandidate('qt-001', 'candidate-1'), { talentId: 'qt-001', candidateId: 'candidate-1' });
  assert.deepEqual(calls.filter(call => call.op === 'from').map(call => call.table), ['external_jobs', 'talent_leads']);
  assert.equal(calls.filter(call => call.op === 'update').length, 2);
});

test('Sprint 2 SQL 创建独立表并启用 RLS', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/quantum-radar.sql'), 'utf8');
  for (const table of ['quantum_radar_companies', 'external_jobs', 'talent_leads', 'quantum_company_sources', 'quantum_crawl_tasks']) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /candidates|positions/i);
});

test('量子雷达种子数据使用可重复执行的 UPSERT', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/quantum-radar-seed.sql'), 'utf8');
  assert.match(sql, /insert into public\.external_jobs/i);
  assert.match(sql, /on conflict \(id\) do update/i);
  assert.match(sql, /qt-001/);
  assert.match(sql, /qtask-001/);
});
