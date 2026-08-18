import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./resume-status-labels.js');
const labels = globalThis.WorkBuddyResumeStatusLabels;

test('简历 AI 阶段标签覆盖已定义阶段并提供安全回退', () => {
  assert.equal(labels.resumeAiStageLabel('source'), '原始文件提取');
  assert.equal(labels.resumeAiStageLabel('format'), '电子简历排版');
  assert.equal(labels.resumeAiStageLabel('unknown'), '简历 AI 处理');
});

test('原始文件状态标签明确反映跨设备可用性', () => {
  assert.equal(labels.resumeOriginalStatusLabel(null), '暂无原始文件');
  assert.equal(labels.resumeOriginalStatusLabel({ originalFileStatus: 'synced' }), '原件已同步，可跨设备查看');
  assert.equal(labels.resumeOriginalStatusLabel({ originalFileStatus: 'sync-failed', originalFileError: '网络错误' }), '原件缺失');
  assert.equal(labels.resumeOriginalStatusLabel({ originalFileStatus: 'missing' }), '原件缺失');
});
