;(function initJobOpportunityPreferences(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyJobOpportunityPreferences = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createJobOpportunityPreferences() {
  'use strict';

  // 求职判断的四个固定展示行
  const PREFERENCE_ROWS = [
    { key: 'workload', label: '工作强度' },
    { key: 'salaryExpectation', label: '薪资期望' },
    { key: 'landingExpectation', label: '落地诉求' },
    { key: 'pipelineSummary', label: '流程情况' },
  ];

  function readPreferences(candidate) {
    if (!candidate || typeof candidate !== 'object') return createEmptyPreferences();
    const raw = candidate.jobOpportunityPreferences;
    if (!raw || typeof raw !== 'object') return createEmptyPreferences();
    return normalizePreferences(raw);
  }

  function createEmptyPreferences() {
    return normalizePreferences({});
  }

  function normalizePreferences(raw) {
    return {
      workload: String(raw.workload || ''),
      salaryExpectation: String(raw.salaryExpectation || ''),
      landingExpectation: String(raw.landingExpectation || ''),
      pipelineSummary: String(raw.pipelineSummary || ''),
      overallAssessment: String(raw.overallAssessment || ''),
      concerns: Array.isArray(raw.concerns) ? raw.concerns.map(item => String(item || '').trim()).filter(Boolean) : [],
      expectedCompensation: String(raw.expectedCompensation || ''),
      updatedAt: String(raw.updatedAt || ''),
    };
  }

  function createDraft(existing) {
    const base = existing && typeof existing === 'object' ? existing : {};
    const concerns = Array.isArray(base.concerns) ? base.concerns.slice() : [];
    return {
      workload: String(base.workload || ''),
      salaryExpectation: String(base.salaryExpectation || ''),
      landingExpectation: String(base.landingExpectation || ''),
      pipelineSummary: String(base.pipelineSummary || ''),
      overallAssessment: String(base.overallAssessment || ''),
      concernsInput: concerns.join('、'),
      concernsList: concerns,
      expectedCompensation: String(base.expectedCompensation || ''),
    };
  }

  function parseConcerns(input) {
    if (Array.isArray(input)) return input.map(item => String(item || '').trim()).filter(Boolean);
    return String(input || '')
      .split(/[，,\n、；;\/]/)
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }

  function buildPatch(draft, nowIso) {
    const now = typeof nowIso === 'function' ? nowIso() : new Date().toISOString();
    return {
      workload: String(draft.workload || '').trim(),
      salaryExpectation: String(draft.salaryExpectation || '').trim(),
      landingExpectation: String(draft.landingExpectation || '').trim(),
      pipelineSummary: String(draft.pipelineSummary || '').trim(),
      overallAssessment: String(draft.overallAssessment || '').trim(),
      concerns: parseConcerns(draft.concernsInput || draft.concernsList),
      expectedCompensation: String(draft.expectedCompensation || '').trim(),
      updatedAt: now,
    };
  }

  return {
    PREFERENCE_ROWS,
    readPreferences,
    createDraft,
    parseConcerns,
    buildPatch,
  };
});
