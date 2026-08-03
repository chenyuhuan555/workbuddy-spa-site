(function (global) {
  'use strict';

  const MISSING_ORIGINAL_ERROR = '当前设备和云端均没有原始文件';

  function hasResumeOriginalReference(version) {
    return !!(version
      && version.originalFileStatus !== 'missing'
      && (version.fileId || version.cloudFilePath || version.fileData || version.sourceResumeId));
  }

  function markOriginalMissing(version) {
    if (!version) return false;
    version.originalFileStatus = 'missing';
    version.originalFileError = MISSING_ORIGINAL_ERROR;
    return true;
  }

  global.WorkBuddyResumeOriginalGuards = { MISSING_ORIGINAL_ERROR, hasResumeOriginalReference, markOriginalMissing };
})(typeof window !== 'undefined' ? window : globalThis);
