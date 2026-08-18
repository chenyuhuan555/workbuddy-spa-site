;(function initCompanyCountMaps(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCompanyCountMaps = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCompanyCountMapsModule() {
  'use strict';

  function increment(map, key) {
    if (key) map.set(key, (map.get(key) || 0) + 1);
  }

  function buildCompanyCountMaps({ positions = [], applications = [] } = {}, {
    closedStage = 'closed', interviewStages = [],
  } = {}) {
    const openPositions = new Map();
    const activeApplications = new Map();
    const interviews = new Map();
    positions.forEach(position => {
      if (position.status === 'open') increment(openPositions, position.companyId);
    });
    applications.forEach(application => {
      if (application.stage !== closedStage) increment(activeApplications, application.companyId);
      if (interviewStages.includes(application.stage)) increment(interviews, application.companyId);
    });
    return { openPositions, activeApplications, interviews };
  }

  return Object.freeze({ buildCompanyCountMaps });
});
