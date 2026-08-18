(function (global) {
  'use strict';

  function getCandidateResumeVersions(candidate) {
    if (!candidate) return [];
    const versions = (Array.isArray(candidate.resumeVersions) ? candidate.resumeVersions : []).filter(version => !version?.deletedAt);
    if (versions.length) return versions;
    const rawText = String(candidate.electronicResumeText || candidate.profileText || '').trim();
    return rawText ? [{
      id: `${candidate.id}_electronic_resume`,
      fileName: `${candidate.name || '候选人'}-电子简历`,
      uploadedAt: candidate.updatedAt || candidate.createdAt || '',
      rawText,
    }] : [];
  }

  global.WorkBuddyCandidateResumeVersions = { getCandidateResumeVersions };
})(typeof window !== 'undefined' ? window : globalThis);
