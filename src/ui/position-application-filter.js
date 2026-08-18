;(function initPositionApplicationFilter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyPositionApplicationFilter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createPositionApplicationFilter() {
  'use strict';

  function getPositionApplications(applications = [], positionId, closedStage = 'closed') {
    return (Array.isArray(applications) ? applications : []).filter(application => application.positionId === positionId);
  }

  function getActivePositionApplications(applications = [], positionId, closedStage = 'closed') {
    return getPositionApplications(applications, positionId, closedStage)
      .filter(application => application.stage !== closedStage);
  }

  return Object.freeze({ getPositionApplications, getActivePositionApplications });
});
