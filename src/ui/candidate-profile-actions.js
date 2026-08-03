export function createCandidateProfileActions({
  selectedCandidate,
  editState,
  bundle,
  canWrite,
  requireWritePermission = () => true,
  editor,
  updateTalent,
  persist,
  reset,
  schedulePush = () => {},
  showToast = () => {},
}) {
  async function saveCore() {
    if (!requireWritePermission() || !selectedCandidate?.value || editState.saving) return;
    editState.saving = true;
    editState.error = '';
    try {
      await editor.save({ canWrite, bundle, candidateId: selectedCandidate.value.id, draft: editState.draft, skillInput: editState.skillInput, directionInput: editState.directionInput, updateTalent, persist });
      reset(); schedulePush(); showToast('核心信息已保存');
    } catch (error) {
      editState.saving = false;
      editState.error = error?.message || '核心信息保存失败，请重试';
    }
  }
  return { saveCore };
}

if (typeof window !== 'undefined') window.WorkBuddyCandidateProfileActions = { createCandidateProfileActions };
