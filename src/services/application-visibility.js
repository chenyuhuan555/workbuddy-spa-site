;(function initApplicationVisibility(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyApplicationVisibility = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createApplicationVisibilityModule() {
  'use strict';

  function activeIds(items) {
    return new Set((Array.isArray(items) ? items : [])
      .filter(item => item?.id && !item.deletedAt)
      .map(item => item.id));
  }

  function filterVisibleApplications({ applications = [], candidates = [], companies = [], positions = [] } = {}) {
    if (!Array.isArray(applications)) return [];
    const candidateIds = activeIds(candidates);
    const companyIds = activeIds(companies);
    const positionIds = activeIds(positions);
    return applications.filter(application => (
      application?.id
      && !application.deletedAt
      && candidateIds.has(application.candidateId)
      && companyIds.has(application.companyId)
      && positionIds.has(application.positionId)
    ));
  }

  return Object.freeze({ filterVisibleApplications });
});
