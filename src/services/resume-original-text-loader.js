function createResumeOriginalTextLoader({ ensureTexts, loadOriginal, blobToDataUrl, extractText }) {
  return async function loadResumeRawText(version, candidate, options = {}) {
    if (!options.refresh && String(version?.rawText || '').trim()) return String(version.rawText).trim();
    if (!options.refresh && version && !String(version.rawText || '').trim()) {
      await ensureTexts(version, candidate);
      if (String(version.rawText || '').trim()) return String(version.rawText).trim();
    }
    const record = await loadOriginal(version, candidate, options);
    const fileData = await blobToDataUrl(record.blob);
    const fileType = String(record.fileType || record.blob?.type || version.fileType || '');
    return String(await extractText({ name: version.fileName || '简历', type: fileType, data: fileData }) || '').trim();
  };
}

if (typeof window !== 'undefined') window.WorkBuddyResumeOriginalTextLoader = { createResumeOriginalTextLoader };

export { createResumeOriginalTextLoader };
