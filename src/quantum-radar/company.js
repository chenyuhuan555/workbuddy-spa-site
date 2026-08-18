(function (global) {
  'use strict';
  global.WorkBuddyQuantumRadarCompany = {
    filterCompanies(companies, query) {
      const value = String(query || '').trim().toLowerCase();
      return (Array.isArray(companies) ? companies : []).filter(company => !value || [company.name, company.domain, company.focus].some(field => String(field || '').toLowerCase().includes(value)));
    },
  };
})(window);
