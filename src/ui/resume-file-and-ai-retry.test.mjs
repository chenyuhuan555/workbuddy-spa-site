import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const ORIGINAL_GUARDS = readFileSync(new URL('./resume-original-guards.js', import.meta.url), 'utf8');
const REPROCESS_ACTIONS = readFileSync(new URL('./resume-reprocess-actions.js', import.meta.url), 'utf8');

test('简历页提供文本重试、原件重提取和原件恢复动作', () => {
  assert.match(INDEX_HTML, /使用现有文本重新处理/);
  assert.match(INDEX_HTML, /从原始文件重新提取并处理/);
  assert.match(INDEX_HTML, /同步原始文件/);
  assert.match(INDEX_HTML, /重新上传原件/);
  assert.match(INDEX_HTML, /originalFileStatus/);
  assert.match(INDEX_HTML, /cloudFilePath/);
});

test('文本重试不强制刷新原件，原件重提取明确 refreshRawText', () => {
  assert.match(REPROCESS_ACTIONS, /fromText:\s*\(\)\s*=>\s*run\(\{ refreshRawText: false \}\)/);
  assert.match(REPROCESS_ACTIONS, /fromOriginal:\s*\(\)\s*=>\s*run\(\{ refreshRawText: true \}\)/);
});

test('跨设备原件读取通过本机、私有云端和旧来源统一解析', () => {
  assert.match(INDEX_HTML, /loadCandidateOriginalRecord = window\.WorkBuddyResumeOriginalRecordLoader\.createResumeOriginalRecordLoader/);
  assert.match(INDEX_HTML, /ResumeFileSync\.loadOriginal\(version/);
  assert.match(INDEX_HTML, /download:\s*path => getWorkspaceStateClient\(\)\.downloadFile\(path\)/);
  assert.match(INDEX_HTML, /saveLocal:\s*saveResumeBlob/);
  assert.match(INDEX_HTML, /loadLegacy:/);
});

test('原件恢复产生的状态更新也进入简历后台串行保存', () => {
  assert.match(INDEX_HTML, /persist: saveResumeBackgroundState/);
  assert.doesNotMatch(INDEX_HTML, /if \(createdFileId\) await saveWorkbenchV2\(\)/);
  assert.match(ORIGINAL_GUARDS, /MISSING_ORIGINAL_ERROR = '当前设备和云端均没有原始文件'/);
  assert.match(INDEX_HTML, /markOriginalMissing\(version\)/);
  assert.match(INDEX_HTML, /candidate\.updatedAt = new Date\(\)\.toISOString\(\);\s+await saveResumeBackgroundState\(\)/);
});

test('失败时保留既有排版，只有没有排版时才降级显示原始文本', () => {
  assert.match(INDEX_HTML, /v-if="activeCandidateResumeVersion\?\.formattedText"/);
  assert.match(INDEX_HTML, /!activeCandidateResumeVersion\?\.formattedText\s*&&\s*activeCandidateResumeVersion\?\.formatStatus === 'failed'/);
  assert.match(INDEX_HTML, /resumeAiStageLabel/);
  assert.match(INDEX_HTML, /formatErrorCode/);
});

test('原件替换保留当前版本并只更新文件元数据', () => {
  const body = INDEX_HTML.match(/async function replaceCandidateResumeOriginal\(event\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(body, /Object\.assign\(version/);
  assert.match(body, /saveResumeBlob/);
  assert.match(body, /enqueueResumeFileSync\(candidate\.id, version\.id\)/);
  assert.doesNotMatch(body, /createTalent|appendTalentResumeVersion|createApplication/);
});

test('新增简历动作保持按钮类型和文件输入可访问名称', () => {
  assert.match(INDEX_HTML, /<button[^>]+type="button"[^>]*>使用现有文本重新处理<\/button>/);
  assert.match(INDEX_HTML, /<button[^>]+type="button"[^>]*>从原始文件重新提取并处理<\/button>/);
  assert.match(INDEX_HTML, /<input[^>]+aria-label="重新上传当前简历原件"[^>]+type="file"/);
});
