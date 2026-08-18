(function (global) {
  'use strict';

  function extractCandidateName(text, fileName) {
    const raw = `${text || ''}\n${fileName || ''}`;
    const explicit = raw.match(/(?:姓名|候选人|名字)[:：\s]+([\u4e00-\u9fa5]{2,4})/);
    if (explicit) return explicit[1];
    const cleanName = String(fileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/简历|候选人|附件|个人|resume|cv/ig, '')
      .replace(/[（(].*?[）)]/g, ' ')
      .trim();
    const fileMatch = cleanName.match(/[\u4e00-\u9fa5]{2,4}/);
    return fileMatch ? fileMatch[0] : '';
  }

  function extractCandidateGender(text) {
    const raw = String(text || '').replace(/\s+/g, ' ');
    if (/性别[:：\s]*男|(?:^|[，,；;\s])男(?:性|士)?(?:[，,；;\s]|$)/.test(raw)) return '男';
    if (/性别[:：\s]*女|(?:^|[，,；;\s])女(?:性|士)?(?:[，,；;\s]|$)/.test(raw)) return '女';
    return '';
  }

  global.WorkBuddyCandidateIdentityParser = { extractCandidateName, extractCandidateGender };
})(typeof window !== 'undefined' ? window : globalThis);
