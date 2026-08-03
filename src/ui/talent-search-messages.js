;(function initTalentSearchMessages(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentSearchMessages = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentSearchMessages() {
  'use strict';

  function errorMessage(error) {
    if (error?.code === 'AUTH_REQUIRED') return '请先登录后使用云端全文搜索';
    if (error?.code === 'SEARCH_UNAVAILABLE' || error?.code === 'RPC_NOT_DEPLOYED') return '云端全文搜索暂不可用，请确认 search_resumes RPC 已部署';
    return '云端全文搜索请求失败，已保留本地人才列表';
  }

  return Object.freeze({ errorMessage });
});
