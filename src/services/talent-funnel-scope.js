;(function initTalentFunnelScope(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelScope = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelScopeModule() {
  'use strict';

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizeCompanyIds(scope) {
    const direct = Array.isArray(scope?.companyIds) ? scope.companyIds : [];
    return Array.from(new Set(direct
      .map(normalizeString)
      .filter(Boolean)));
  }

  function normalizeScope(scope) {
    return {
      companyIds: normalizeCompanyIds(scope),
      baselineAt: normalizeString(scope?.baselineAt),
    };
  }

  function isCompanyInPilot(companyId, scope) {
    const id = normalizeString(companyId);
    if (!id) return false;
    return normalizeScope(scope).companyIds.includes(id);
  }

  function isEventInPilot(event, scope) {
    const normalized = normalizeScope(scope);
    if (!normalized.baselineAt) return false;
    if (!isCompanyInPilot(event?.companyId, normalized)) return false;
    const occurredAt = Date.parse(event?.occurredAt || '');
    const baselineAt = Date.parse(normalized.baselineAt);
    if (!Number.isFinite(occurredAt) || !Number.isFinite(baselineAt)) return false;
    return occurredAt >= baselineAt;
  }

  return Object.freeze({
    normalizeScope,
    isCompanyInPilot,
    isEventInPilot,
  });
});
