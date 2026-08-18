;(function initWorkbenchOwners(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchOwners = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchOwners() {
  'use strict';

  function splitOwners(value) {
    return String(value || '')
      .split(/[、,，/／|\n;；]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function hasOwner(value, owner) {
    const wanted = String(owner || '').trim();
    return !wanted || splitOwners(value).some(item => item === wanted);
  }

  // 从 owner 字段中移除指定顾问，保留同一字段里的其他共有人。
  // 例如 '李芷婷、王顾问' 移除 '李芷婷' → '王顾问'；完全移除后返回空串。
  function removeOwner(value, owner) {
    const unwanted = String(owner || '').trim();
    if (!unwanted) return String(value || '').trim();
    return splitOwners(value)
      .filter(item => item !== unwanted)
      .join('、');
  }

  function collectOwners({ companies = [], positions = [], candidates = [] } = {}) {
    return Array.from(new Set([
      ...companies.flatMap(item => splitOwners(item.owner)),
      ...positions.flatMap(item => splitOwners(item.owner)),
      ...candidates.flatMap(item => splitOwners(item.owner)),
    ].filter(Boolean)));
  }

  return Object.freeze({ collectOwners, splitOwners, hasOwner, removeOwner });
});
