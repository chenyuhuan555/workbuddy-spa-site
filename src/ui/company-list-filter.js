;(function initCompanyListFilter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCompanyListFilter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCompanyListFilter() {
  'use strict';

  function filterCompanies(companies = [], filters = {}) {
    const query = String(filters.query || '').trim().toLowerCase();
    return (Array.isArray(companies) ? companies : []).filter(company => {
      if (filters.status !== 'all' && filters.status && company.status !== filters.status) return false;
      if (filters.owner !== 'all' && filters.owner && company.owner !== filters.owner) return false;
      return !query || [company.name, company.industry, company.city, company.owner]
        .some(value => String(value || '').toLowerCase().includes(query));
    }).slice().sort((a, b) => (
      Date.parse(b.updatedAt || b.createdAt || '') || 0
    ) - (Date.parse(a.updatedAt || a.createdAt || '') || 0));
  }

  return Object.freeze({ filterCompanies });
});
