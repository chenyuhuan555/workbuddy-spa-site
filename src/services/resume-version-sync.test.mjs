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
  assert.match(html, /runResumeVersionMigration\(\)[\s\S]*hydrateResumeVersionsFromCandidateCloud\(\)[\s\S]*syncResumeVersionsWithCloud/);
  assert.match(html, /查看简历版本差异清单/);
  assert.match(html, /archiveExtraResumeVersions/);
  assert.match(html, /归档本地多出版本/);
  assert.match(html, /filter\(version => !version\?\.deletedAt\)/);
});

test('Phase 2c 不在迁移完成前切换候选人版本读取来源', () => {
  assert.match(html, /仅双写，不切读/);
  assert.doesNotMatch(html, /loadResumeVersionsFromCloudAsAuthority/);
});

test('版本一致性指纹会规范化云端映射产生的类型和时间格式', () => {
  assert.match(html, /normalizeResumeVersionForFingerprint/);
  assert.match(html, /RESUME_VERSION_TIMESTAMP_FIELDS/);
  assert.match(html, /RESUME_VERSION_NUMBER_FIELDS/);
  assert.match(html, /parsed\.toISOString\(\)/);
  assert.match(html, /const parsed = Number\(value\)/);
});
