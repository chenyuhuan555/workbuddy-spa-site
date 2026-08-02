import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexHtml = fs.readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../../../supabase/phase4-search-matching.sql', import.meta.url), 'utf8');

test('Phase 4 搜索与匹配 Repository 已加载且未启用时有明确 RPC 契约', () => {
  assert.match(indexHtml, /resume-search-repo\.js\?v=/);
  assert.match(indexHtml, /candidate-matching-repo\.js\?v=/);
  assert.match(sql, /create or replace function public\.search_resumes/);
  assert.match(sql, /create or replace function public\.match_candidates/);
  assert.match(sql, /pg_trgm/);
});
