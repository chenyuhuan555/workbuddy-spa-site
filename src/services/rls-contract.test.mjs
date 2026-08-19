import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * RLS 静态契约测试（P0-3 安全收口）
 *
 * 作用：守护 supabase/workbench-permissions.sql 的关键安全约束不被后续改动回退：
 * 1. 顾问 INSERT 必须归属自己（禁止孤儿数据）；
 * 2. 无 owner 岗位顾问只读；
 * 3. 简历 Storage 按候选人属主收紧；
 * 4. 管理员可读团队 Todo。
 */
const SQL = readFileSync(new URL('../../supabase/workbench-permissions.sql', import.meta.url), 'utf8');

test('提供 is_workbench_admin / current_member_display_name 稳定 helper（SECURITY DEFINER）', () => {
  assert.match(SQL, /create or replace function public\.is_workbench_admin\(\)/);
  assert.match(SQL, /security definer/);
  assert.match(SQL, /set search_path = public/);
  assert.match(SQL, /create or replace function public\.current_member_display_name\(\)/);
});

test('顾问 INSERT：candidates / applications / positions 必须归属自己（ownerUserId = auth.uid() 或 owner=本人姓名）', () => {
  const policyBlocks = ['candidates_insert', 'applications_insert', 'positions_insert'];
  for (const policy of policyBlocks) {
    const block = SQL.match(new RegExp(`create policy ${policy} on public\\.\\w+[\\s\\S]*?;\n`))?.[0] || '';
    assert.ok(block, `应存在 ${policy} 策略`);
    assert.match(block, /\(extra ->> 'ownerUserId'\) = auth\.uid\(\)::text/, `${policy} 必须允许 ownerUserId = auth.uid()`);
    // 不允许"owner 为空放行"（安全收口前版本有 or (owner is null or owner = '')）
    assert.doesNotMatch(block, /owner is null or owner = ''/, `${policy} 不允许制造孤儿数据`);
  }
});

test('无 owner 岗位：顾问只读（positions_update 不放行空 owner）', () => {
  const block = SQL.match(/create policy positions_update on public\.positions[\s\S]*?;\n/)?.[0] || '';
  assert.ok(block, '应存在 positions_update 策略');
  assert.doesNotMatch(block, /owner is null or owner = ''/, '无 owner 岗位不得被顾问修改');
});

test('简历 Storage：read 按路径 candidateId 关联候选人属主，管理员全部', () => {
  const block = SQL.match(/create policy "workbuddy_resume_files_read"[\s\S]*?;\n/)?.[0] || '';
  assert.ok(block, '应存在 storage 简历读策略');
  assert.match(block, /storage\.foldername\(name\)\)\[4\]/, '路径第 4 段应为 candidateId');
  assert.match(block, /public\.is_workbench_admin\(\)/, '管理员可读全部简历文件');
  assert.match(block, /from public\.candidates c/, '按候选人属主关联判断');
});

test('管理员可读团队 Todo（user_todos_admin_read）', () => {
  assert.match(SQL, /create policy user_todos_admin_read on public\.user_todos/);
  assert.match(SQL, /using \(public\.is_workbench_admin\(\)\)/);
});

test('resume_versions / resume_texts 读策略跟随候选人属主', () => {
  assert.match(SQL, /create policy resume_versions_read on public\.resume_versions/);
  assert.match(SQL, /create policy resume_texts_read on public\.resume_texts/);
  const resumeTexts = SQL.match(/create policy resume_texts_read[\s\S]*?;\n/)?.[0] || '';
  assert.match(resumeTexts, /join public\.candidates c on c\.id = rv\.candidate_id/, 'resume_texts 经 resume_versions→candidates 关联');
});
