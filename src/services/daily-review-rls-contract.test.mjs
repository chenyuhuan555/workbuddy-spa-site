import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * daily_reviews RLS 静态契约测试（P1-1 每日复盘团队化）
 *
 * 守护 supabase/daily-reviews.sql 的关键安全约束不被后续改动回退：
 * 1. 一个顾问一天只有一条（唯一约束 workspace_id + user_id + review_date）；
 * 2. 顾问 SELECT / INSERT / UPDATE / DELETE 仅限本人（user_id = auth.uid()）；
 * 3. 管理员可读全团队（SELECT 含 is_workbench_admin），但不代写（UPDATE 不含 is_workbench_admin）。
 */
const SQL = readFileSync(new URL('../../supabase/daily-reviews.sql', import.meta.url), 'utf8');

function policyBlock(name) {
  return SQL.match(new RegExp(`create policy ${name} on public\\.daily_reviews[\\s\\S]*?;`))?.[0] || '';
}

test('daily_reviews 表 + 唯一约束（workspace_id+user_id+review_date）+ metrics jsonb', () => {
  assert.match(SQL, /create table if not exists public\.daily_reviews/);
  assert.match(SQL, /unique\(workspace_id, user_id, review_date\)/);
  assert.match(SQL, /metrics\s+jsonb not null default '{}'::jsonb/);
  assert.match(SQL, /review_date\s+date not null/);
});

test('daily_reviews 开启 RLS', () => {
  assert.match(SQL, /alter table public\.daily_reviews enable row level security/);
});

test('SELECT：顾问仅自己（user_id = auth.uid()），管理员读全团队（is_workbench_admin）', () => {
  const block = policyBlock('daily_reviews_read');
  assert.ok(block, '应存在 daily_reviews_read 策略');
  assert.match(block, /user_id = auth\.uid\(\)/);
  assert.match(block, /public\.is_workbench_admin\(\)/);
});

test('INSERT：只能归属自己（with check user_id = auth.uid()）', () => {
  const block = policyBlock('daily_reviews_insert');
  assert.ok(block, '应存在 daily_reviews_insert 策略');
  assert.match(block, /with check \(user_id = auth\.uid\(\)\)/);
});

test('UPDATE：仅本人，管理员不代写他人（不含 is_workbench_admin）', () => {
  const block = policyBlock('daily_reviews_update');
  assert.ok(block, '应存在 daily_reviews_update 策略');
  assert.match(block, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(block, /with check \(user_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(block, /is_workbench_admin/, 'UPDATE 不应放行管理员代写他人日报');
});

test('DELETE：仅本人（轻量撤销）', () => {
  const block = policyBlock('daily_reviews_delete');
  assert.ok(block, '应存在 daily_reviews_delete 策略');
  assert.match(block, /using \(user_id = auth\.uid\(\)\)/);
});

test('updated_at 复用 touch_updated_at trigger', () => {
  assert.match(SQL, /create or replace function public\.touch_updated_at\(\)/);
  assert.match(SQL, /trg_daily_reviews_touch/);
});
