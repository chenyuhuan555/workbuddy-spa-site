(function (global) {
  'use strict';

  function listResumeAiBatchTasks(candidates) {
    return (Array.isArray(candidates) ? candidates : []).flatMap(candidate => (Array.isArray(candidate?.resumeVersions) ? candidate.resumeVersions : [])
      .filter(version => version && !version.deletedAt)
      .map(version => ({
        candidateId: candidate.id,
        versionId: version.id,
        fileName: version.fileName || version.file_name || '未命名简历',
        formatStatus: version.formatStatus || 'queued',
        formattedText: version.formattedText || '',
      })));
  }

  global.WorkBuddyResumeAiTaskList = { listResumeAiBatchTasks };
})(typeof window !== 'undefined' ? window : globalThis);
