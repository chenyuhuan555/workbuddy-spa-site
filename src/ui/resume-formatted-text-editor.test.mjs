import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./resume-formatted-text-editor.js');
const Editor = globalThis.WorkBuddyResumeFormattedTextEditor;
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function createBundle() {
  return {
    candidates: [{
      id: 'candidate-1',
      name: '雷艺旋',
      updatedAt: '2026-07-01T00:00:00.000Z',
      resumeVersions: [
        {
          id: 'resume-1',
          rawText: '原始提取文本必须保留',
          formattedText: '### 旧版电子简历',
          formatStatus: 'done',
          formatError: '旧错误',
          formatErrorCode: 'old_error',
          aiStage: 'format',
          formattedAt: '2026-07-01T00:00:00.000Z',
          fileId: 'file-1',
          cloudFilePath: 'workspace/main/resumes/candidate-1/resume-1.pdf',
        },
        {
          id: 'resume-2',
          rawText: '另一版本原文',
          formattedText: '### 另一历史版本',
          formatStatus: 'done',
        },
      ],
    }],
  };
}

test('createDraft 只复制当前版本的 formattedText', () => {
  const draft = Editor.createDraft({ formattedText: '### 简历', rawText: '原文', fileId: 'file-1' });
  assert.deepEqual(draft, { formattedText: '### 简历' });
});

test('save 只更新选中版本的电子简历并保留原文、原件和其他版本', async () => {
  const bundle = createBundle();
  const candidate = bundle.candidates[0];
  const originalRawText = candidate.resumeVersions[0].rawText;
  const originalFileId = candidate.resumeVersions[0].fileId;
  const otherVersion = structuredClone(candidate.resumeVersions[1]);
  let persistCalls = 0;

  const saved = await Editor.save({
    canWrite: true,
    bundle,
    candidateId: candidate.id,
    versionId: 'resume-1',
    draft: { formattedText: '  ### 人工编辑\n- 保留 Markdown  ' },
    now: () => '2026-07-30T08:00:00.000Z',
    async persist() { persistCalls++; return true; },
  });

  assert.equal(saved.formattedText, '### 人工编辑\n- 保留 Markdown');
  assert.equal(saved.formatStatus, 'done');
  assert.equal(saved.formatError, '');
  assert.equal(saved.formatErrorCode, '');
  assert.equal(saved.aiStage, '');
  assert.equal(saved.formattedAt, '2026-07-30T08:00:00.000Z');
  assert.equal(candidate.updatedAt, '2026-07-30T08:00:00.000Z');
  assert.equal(saved.rawText, originalRawText);
  assert.equal(saved.fileId, originalFileId);
  assert.deepEqual(candidate.resumeVersions[1], otherVersion);
  assert.equal(persistCalls, 1);
});

test('save 允许清空当前电子简历并将状态恢复为待处理', async () => {
  const bundle = createBundle();
  const saved = await Editor.save({
    canWrite: true,
    bundle,
    candidateId: 'candidate-1',
    versionId: 'resume-1',
    draft: { formattedText: '   ' },
    now: () => '2026-07-30T08:00:00.000Z',
    persist: async () => true,
  });
  assert.equal(saved.formattedText, '');
  assert.equal(saved.formatStatus, 'queued');
  assert.equal(saved.formattedAt, '');
  assert.equal(saved.rawText, '原始提取文本必须保留');
});

test('save 在权限不足或版本不存在时不修改数据', async () => {
  const bundle = createBundle();
  const before = structuredClone(bundle);
  await assert.rejects(() => Editor.save({ canWrite: false, bundle, candidateId: 'candidate-1', versionId: 'resume-1', draft: {} }), /无权编辑/);
  await assert.rejects(() => Editor.save({ canWrite: true, bundle, candidateId: 'candidate-1', versionId: 'missing', draft: {}, persist: async () => true }), /版本不存在/);
  assert.deepEqual(bundle, before);
});

test('save 持久化失败时回滚当前版本和候选人更新时间', async () => {
  const bundle = createBundle();
  const before = structuredClone(bundle);
  let persistCalls = 0;
  await assert.rejects(() => Editor.save({
    canWrite: true,
    bundle,
    candidateId: 'candidate-1',
    versionId: 'resume-1',
    draft: { formattedText: '### 不应残留' },
    now: () => '2026-07-30T08:00:00.000Z',
    async persist() { persistCalls++; return persistCalls > 1; },
  }), /保存失败/);
  assert.deepEqual(bundle, before);
  assert.equal(persistCalls, 2);
});

test('简历页提供当前版本电子简历编辑入口和可访问表单', () => {
  assert.match(INDEX_HTML, /resume-formatted-text-editor\.js\?v=20260730-resumeedit1/);
  assert.match(INDEX_HTML, /@click="startCandidateResumeEdit"/);
  assert.match(INDEX_HTML, /@click="saveCandidateResumeEdit"/);
  assert.match(INDEX_HTML, /@click="cancelCandidateResumeEdit"/);
  assert.match(INDEX_HTML, /v-model="candidateResumeEdit\.draft\.formattedText"/);
  assert.match(INDEX_HTML, /for="candidate-resume-formatted-text"/);
  assert.match(INDEX_HTML, /id="candidate-resume-formatted-text"/);
  assert.match(INDEX_HTML, /v-if="canWrite && activeCandidateResumeVersion && !candidateResumeEdit\.active"/);
  assert.match(INDEX_HTML, /candidateResumeEdit\.saving \? '保存中…' : '保存电子简历'/);
  assert.match(INDEX_HTML, /candidateResumeEdit\.error[^>]*role="alert"|role="alert"[^>]*candidateResumeEdit\.error/);
});
