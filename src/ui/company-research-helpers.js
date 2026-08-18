;(function initCompanyResearchHelpers(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCompanyResearchHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCompanyResearchHelpers() {
  'use strict';

  function normalizeCompanyName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function buildCandidateProfiles(candidates = []) {
    return (Array.isArray(candidates) ? candidates : []).map(candidate => ({
      id: candidate.id,
      name: String(candidate.name || '').trim(),
      currentCompany: String(candidate.currentCompany || '').trim(),
      currentTitle: String(candidate.currentTitle || '').trim(),
      city: String(candidate.city || '').trim(),
      directions: (candidate.directions || []).map(item => String(item || '').trim()).filter(Boolean).slice(0, 6),
      skills: (candidate.skills || candidate.keywords || []).map(item => String(item || '').trim()).filter(Boolean).slice(0, 12),
    })).filter(candidate => candidate.id && candidate.name);
  }

  return Object.freeze({ normalizeCompanyName, buildCandidateProfiles });
});
