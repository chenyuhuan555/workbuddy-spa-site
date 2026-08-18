(function (global) {
  'use strict';
  global.WorkBuddyQuantumRadarTalents = {
    filterTalents(talents, query) {
      const value = String(query || '').trim().toLowerCase();
      return (Array.isArray(talents) ? talents : []).filter(talent => !value || [talent.name, talent.institution, talent.researchDirection, ...(talent.matchedJobs || [])].some(field => String(field || '').toLowerCase().includes(value)));
    },
  };
})(window);
