;(function initCompanyListFilter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCompanyListFilter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCompanyListFilter() {
  'use strict';

  const ownerMatcher = (value, owner) => (globalThis.WorkBuddyWorkbenchOwners?.hasOwner || ((actual, wanted) => String(actual || '').split(/[、,，/／|\n;；]+/).map(item => item.trim()).includes(String(wanted || '').trim())))(value, owner);

  function filterCompanies(companies = [], filters = {}) {
    const query = String(filters.query || '').trim().toLowerCase();
    const currentOwner = String(filters.owner || '').trim();
    return (Array.isArray(companies) ? companies : []).filter(company => {
      if (filters.status !== 'all' && filters.status && company.status !== filters.status) return false;
      if (filters.owner !== 'all' && filters.owner && !ownerMatcher(company.owner, currentOwner)) return false;
      return !query || [company.name, company.industry, company.city, company.owner]
        .some(value => String(value || '').toLowerCase().includes(query));
    }).slice().sort((a, b) => (
      Date.parse(b.updatedAt || b.createdAt || '') || 0
    ) - (Date.parse(a.updatedAt || a.createdAt || '') || 0));
  }

  return Object.freeze({ filterCompanies });
});
