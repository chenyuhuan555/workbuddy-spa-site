function createResumeOriginalRecordLoader({ loadOriginal, getLocal, download, saveLocal, loadLegacy, persist }) {
  return async function loadResumeOriginalRecord(version) {
    if (!version) throw Object.assign(new Error('当前没有可用的简历版本'), { code: 'ORIGINAL_NOT_FOUND' });
    const createdFileId = !version.fileId;
    if (createdFileId) version.fileId = `fid_${version.id || Date.now().toString(36)}`;
    try {
      const record = await loadOriginal(version, { getLocal, download, saveLocal, loadLegacy });
      if (createdFileId && typeof persist === 'function') await persist();
      return record;
    } catch (error) {
      if (createdFileId) version.fileId = '';
      throw error;
    }
  };
}

if (typeof window !== 'undefined') window.WorkBuddyResumeOriginalRecordLoader = { createResumeOriginalRecordLoader };

export { createResumeOriginalRecordLoader };
