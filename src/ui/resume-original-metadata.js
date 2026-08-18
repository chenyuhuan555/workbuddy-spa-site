(function (global) {
  'use strict';

  function buildResumeOriginalMetadata(metadata = {}) {
    return {
      fileId: metadata.fileId || '',
      fileName: metadata.fileName || '',
      fileType: metadata.fileType || '',
      fileSize: metadata.fileSize || 0,
      fileHash: metadata.fileHash || '',
      cloudFilePath: '',
      originalFileStatus: 'local-only',
      originalFileError: '',
      originalFileSyncedAt: '',
    };
  }

  global.WorkBuddyResumeOriginalMetadata = { buildResumeOriginalMetadata };
})(typeof window !== 'undefined' ? window : globalThis);
