(function (global) {
  'use strict';

  function getCandidateResumeText(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    let text = String(source.electronicResumeText || '').trim();
    if (text.length < 40) {
      const versions = Array.isArray(source.resumeVersions) ? source.resumeVersions : [];
      for (const version of versions) {
        const rawText = String(version && version.rawText || '').trim();
        if (rawText.length >= 40) {
          text = rawText;
          break;
        }
      }
    }
    return text;
  }

  global.WorkBuddyCandidateResumeText = { getCandidateResumeText };
})(typeof window !== 'undefined' ? window : globalThis);
