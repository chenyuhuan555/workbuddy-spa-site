(function (global) {
  'use strict';

  function duplicateTextOfResume(resume) {
    const source = resume && typeof resume === 'object' ? resume : {};
    return [
      source.name,
      source.candidateSummary,
      Array.isArray(source.candidateKeywords) ? source.candidateKeywords.join(' ') : '',
      source.candidateProfileText,
      source.electronicResumeText,
      source.bossImportedText,
      source.note,
    ].filter(Boolean).join('\n');
  }

  global.WorkBuddyResumeDuplicateText = { duplicateTextOfResume };
})(typeof window !== 'undefined' ? window : globalThis);
