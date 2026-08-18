;(function initResumeFileData(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeFileData = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeFileData(root) {
  'use strict';

  async function resumeBlobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new root.FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('原始简历文件读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  function resumeDataUrlToBlob(dataUrl, fallbackType = 'application/octet-stream') {
    const match = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!match) return null;
    const mime = match[1] || fallbackType;
    const bytes = match[2]
      ? Uint8Array.from(root.atob(match[3]), char => char.charCodeAt(0))
      : new root.TextEncoder().encode(decodeURIComponent(match[3]));
    return new root.Blob([bytes], { type: mime });
  }

  return Object.freeze({ resumeBlobToDataUrl, resumeDataUrlToBlob });
});
