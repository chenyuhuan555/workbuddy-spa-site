export function createCandidateOriginalFileActions({
  selectedCandidate,
  activeVersion,
  view,
  requireWritePermission = () => true,
  loadRecord,
  enqueueSync,
  saveBackground,
  markMissing = () => {},
  buildMetadata,
  saveBlob,
  toDataUrl,
  hashData,
  classify,
  cloudReady = false,
  schedulePush = () => {},
  loadOriginal = async () => {},
  showToast = () => {},
}) {
  async function retrySync() {
    if (!requireWritePermission()) return;
    const candidate = selectedCandidate?.value ?? selectedCandidate;
    const version = activeVersion?.value ?? activeVersion;
    if (!candidate || !version) return;
    try { await loadRecord(version); await enqueueSync(candidate.id, version.id); showToast('原始文件已同步，可在其他设备查看'); }
    catch (error) { if (error?.code === 'ORIGINAL_NOT_FOUND') { markMissing(version); await saveBackground(); } showToast(error.message || '原始文件同步失败，请重试', 'error'); }
  }
  async function replace(event) {
    if (!requireWritePermission()) return;
    const file = event.target.files?.[0]; event.target.value = '';
    const candidate = selectedCandidate?.value ?? selectedCandidate;
    const version = activeVersion?.value ?? activeVersion;
    if (!file || !candidate || !version) return;
    const classification = classify(file.name, file.type);
    if (!classification.ok) return showToast('仅支持 PDF、Word、图片或 TXT 简历', 'error');
    if (file.size > 20 * 1024 * 1024) return showToast('原始文件不能超过 20MB', 'error');
    try {
      const fileData = await toDataUrl(file); const fileId = crypto.randomUUID?.() || `fid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; const fileHash = await hashData(fileData);
      await saveBlob(fileId, file, { fileName: file.name, fileType: file.type || '', fileSize: file.size, fileHash });
      Object.assign(version, buildMetadata({ fileId, fileName: file.name, fileType: file.type || '', fileSize: file.size, fileHash }));
      candidate.updatedAt = new Date().toISOString(); await saveBackground(); if (cloudReady) schedulePush();
      void enqueueSync(candidate.id, version.id).catch(error => showToast(error.message, 'error'));
      if (view.mode === 'original') await loadOriginal();
      showToast('原始文件已补充，业务记录和历史版本保持不变');
    } catch (error) { showToast(error.message || '原始文件保存失败', 'error'); }
  }
  return { retrySync, replace };
}

if (typeof window !== 'undefined') window.WorkBuddyCandidateOriginalFileActions = { createCandidateOriginalFileActions };
