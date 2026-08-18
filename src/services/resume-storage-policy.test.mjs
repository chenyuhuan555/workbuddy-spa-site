import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const policyUrl = new URL('../../supabase/workbuddy-files-storage.sql', import.meta.url);

test('私有简历桶限制大小和允许格式', () => {
  assert.equal(existsSync(fileURLToPath(policyUrl)), true, '缺少简历私有存储策略');
  const sql = readFileSync(policyUrl, 'utf8');
  assert.match(sql, /'workbuddy-files'/);
  assert.match(sql, /public\s*=\s*false/i);
  assert.match(sql, /file_size_limit\s*=\s*20971520/i);
  for (const mime of ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'text/plain']) {
    assert.match(sql, new RegExp(mime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('原件只允许活跃成员读取，且只有管理员和编辑者可以新增', () => {
  const sql = readFileSync(policyUrl, 'utf8');
  assert.match(sql, /for\s+select[\s\S]*?status\s*=\s*'active'/i);
  assert.match(sql, /for\s+insert[\s\S]*?role\s+in\s*\(\s*'admin'\s*,\s*'editor'\s*\)/i);
  assert.match(sql, /bucket_id\s*=\s*'workbuddy-files'/i);
  assert.match(sql, /storage\.foldername\(name\)[\s\S]*?'workspace'[\s\S]*?'main'[\s\S]*?'resumes'/i);
  assert.doesNotMatch(sql, /for\s+(?:update|delete)/i);
  assert.doesNotMatch(sql, /to\s+(?:anon|public)/i);
});
