;(function initDashboardMetrics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyDashboardMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createDashboardMetricsModule() {
  'use strict';

  function buildDashboardMetrics({ companies = [], positions = [], candidates = [], applications = [] } = {}, {
    closedStage = 'closed', interviewStages = [], offerStages = [],
  } = {}) {
    return {
      companies: companies.filter(item => item.status !== 'paused').length,
      positions: positions.filter(item => item.status === 'open').length,
      candidates: candidates.length,
      applications: applications.filter(item => item.stage !== closedStage).length,
      interviews: applications.filter(item => interviewStages.includes(item.stage)).length,
      offers: applications.filter(item => offerStages.includes(item.stage)).length,
    };
  }

  return Object.freeze({ buildDashboardMetrics });
});
