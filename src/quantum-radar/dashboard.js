(function (global) {
  'use strict';
  global.WorkBuddyQuantumRadarDashboard = {
    buildMetrics(data) {
      const jobs = Array.isArray(data?.externalJobs) ? data.externalJobs : [];
      const companies = Array.isArray(data?.quantumCompanies) ? data.quantumCompanies : [];
      const talents = Array.isArray(data?.talentLeads) ? data.talentLeads : [];
      return {
        newJobs: jobs.filter(job => Number(job.postedDays) <= 7).length,
        priorityJobs: jobs.filter(job => Number(job.score) >= 85).length,
        activeCompanies: companies.filter(company => company.hiringStatus === '招聘活跃').length,
        matchedTalents: talents.filter(talent => Number(talent.matchScore) >= 85).length,
        talentLeads: talents.length,
      };
    },
    getPriorityJobs(jobs, limit) {
      return [...(Array.isArray(jobs) ? jobs : [])].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, limit || 5);
    },
  };
})(window);
