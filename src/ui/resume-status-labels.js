;(function initResumeStatusLabels(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeStatusLabels = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeStatusLabels() {
  'use strict';

  function resumeAiStageLabel(stage) {
    return ({ source: '原始文件提取', basic: '基础信息提取', profile: '候选人画像提取', format: '电子简历排版' })[stage]
      || '简历 AI 处理';
  }

  function resumeOriginalStatusLabel(version) {
    if (!version) return '暂无原始文件';
    if (version.originalFileStatus === 'syncing') return '原件正在同步到私有云端';
    if (version.originalFileStatus === 'synced') return '原件已同步，可跨设备查看';
    if (version.originalFileStatus === 'sync-failed') return '原件缺失';
    if (version.originalFileStatus === 'missing') return '原件缺失';
    return '';
  }

  return Object.freeze({ resumeAiStageLabel, resumeOriginalStatusLabel });
});
