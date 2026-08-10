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

test('Sprint 2 SQL 创建独立表并启用 RLS', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/quantum-radar.sql'), 'utf8');
  for (const table of ['quantum_radar_companies', 'external_jobs', 'talent_leads', 'quantum_company_sources', 'quantum_crawl_tasks']) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /candidates|positions/i);
});
