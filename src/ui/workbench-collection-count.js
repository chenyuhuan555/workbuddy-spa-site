;(function initWorkbenchCollectionCount(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCollectionCount = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchCollectionCount() {
  'use strict';

  function countByCompany(companyId, collection = [], predicate = () => true) {
    return (Array.isArray(collection) ? collection : [])
      .filter(item => item.companyId === companyId && predicate(item)).length;
  }

  return Object.freeze({ countByCompany });
});
