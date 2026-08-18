;(function initResumeNameHelpers(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeNameHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeNameHelpers() {
  'use strict';

  function fallbackNameFromFileName(fileName) {
    return String(fileName || '').replace(/\.[^.]+$/, '').replace(/[-_（(].*$/, '').trim();
  }

  function looksLikeFileName(name) {
    const value = String(name || '').trim();
    if (!value) return false;
    if (/简历|附件|个人|候选|cv|resume|[-_]|（|\(|\)|）|@|\.|\d/i.test(value)) return true;
    if (/^[\u4e00-\u9fa5]{2,4}([A-Za-z]{1,20})?$/.test(value)) return false;
    if (/^[A-Za-z]{1,20}([ -][A-Za-z]{1,20}){0,2}$/.test(value)) return false;
    return true;
  }

  return Object.freeze({ fallbackNameFromFileName, looksLikeFileName });
});
