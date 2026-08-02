import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('Phase 2c 版本同步具备双写、迁移和一致性校验入口', () => {
  assert.match(html, /src\/services\/repo\/resume-version-repo\.js\?v=/);
  assert.match(html, /syncResumeVersionsWithCloud/);
  assert.match(html, /runResumeVersionMigration/);
  assert.match(html, /verifyResumeVersionParity/);
  assert.match(html, /resumeVersionMigrationMeta/);
  assert.match(html, /resume_versions/);
  assert.match(html, /resumeTextOfflineQueue/);
  assert.match(html, /resumeVersionOfflineQueue/);
  assert.match(html, /markFailure/);
  assert.match(html, /逐条重试/);
  assert.match(html, /resumeVersionMigration\.error/);
});

test('Phase 2c 不在迁移完成前切换候选人版本读取来源', () => {
  assert.match(html, /仅双写，不切读/);
  assert.doesNotMatch(html, /loadResumeVersionsFromCloudAsAuthority/);
});
