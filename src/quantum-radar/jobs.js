(function (global) {
  'use strict';
  global.WorkBuddyQuantumRadarJobs = {
    filterJobs(jobs, query) {
      const value = String(query || '').trim().toLowerCase();
      return (Array.isArray(jobs) ? jobs : []).filter(job => !value || [job.title, job.company, job.location, job.quantumDomain].some(field => String(field || '').toLowerCase().includes(value)));
    },
    sortJobs(jobs) { return [...this.filterJobs(jobs, '')].sort((a, b) => Number(b.score) - Number(a.score)); },
  };
})(window);
