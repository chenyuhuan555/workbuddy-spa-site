export function createCandidateResumeActions({
  view,
  edit,
  selectedCandidate,
  activeVersion,
  requireWritePermission = () => true,
  resetEdit,
  ensureResumeTexts = () => {},
  loadOriginal = async () => {},
  editor,
  bundle,
  canWrite,
  persist,
  schedulePush = () => {},
  showToast = () => {},
}) {
  function clearPreview() {
    if (view.blobUrl) { URL.revokeObjectURL(view.blobUrl); view.blobUrl = ''; }
    view.imageSrc = ''; view.error = '';
  }
  function switchVersion(versionId) {
    if (edit.active) resetEdit();
    view.versionId = versionId; clearPreview();
    void ensureResumeTexts(activeVersion?.value ?? activeVersion);
    if (view.mode === 'original') void loadOriginal();
  }
  function switchMode(mode) {
    if (mode !== 'text' && edit.active) resetEdit();
    view.mode = mode;
    if (mode === 'original' && !view.blobUrl && !view.imageSrc && !view.error) void loadOriginal();
  }
  function startEdit() {
    const candidate = selectedCandidate?.value ?? selectedCandidate;
    const version = activeVersion?.value ?? activeVersion;
    if (!requireWritePermission() || !candidate || !version) return;
    if (version.formatStatus === 'processing') { showToast('AI 正在处理该简历，请完成后再编辑', 'warning'); return; }
    resetEdit(); view.mode = 'text'; edit.candidateId = candidate.id; edit.versionId = version.id; edit.draft = editor.createDraft(version); edit.active = true;
  }
  function cancelEdit() { if (!edit.saving) resetEdit(); }
  async function saveEdit() {
    if (!requireWritePermission() || edit.saving) return;
    edit.saving = true; edit.error = '';
    try {
      await editor.save({ canWrite, bundle, candidateId: edit.candidateId, versionId: edit.versionId, draft: edit.draft, persist });
      resetEdit(); schedulePush(); showToast('电子简历已保存');
    } catch (error) { edit.saving = false; edit.error = error?.message || '电子简历保存失败，请重试'; }
  }
  return { switchVersion, switchMode, startEdit, cancelEdit, saveEdit };
}

if (typeof window !== 'undefined') window.WorkBuddyCandidateResumeActions = { createCandidateResumeActions };
