export function createTalentIntakeActions({
  batchUpload,
  candidateUpload,
  directForm,
  directEntryOpen,
  directExtracting,
  directError,
  requireWritePermission = () => true,
  resetCandidateUploadForm,
  resetDirectForm,
  saveCandidateOnly,
  batchAddFiles,
  batchPump,
  batchRetryFailed,
  showCreateMenu = () => {},
}) {
  function openBatchUpload() {
    if (!requireWritePermission()) return;
    batchUpload.open = true;
    showCreateMenu(false);
  }
  function openTalentIntake() {
    if (!requireWritePermission()) return;
    if (!batchUpload.batchTaskId) resetCandidateUploadForm();
    resetDirectForm();
    directEntryOpen.value = false;
    openBatchUpload();
  }
  async function saveDirectEntry() {
    if (!requireWritePermission()) return;
    Object.assign(candidateUpload.form, directForm);
    candidateUpload.error = '';
    candidateUpload.open = true;
    await saveCandidateOnly(false);
    if (candidateUpload.step === 'form' && candidateUpload.error) {
      directError.value = candidateUpload.error;
      candidateUpload.open = false;
    }
  }
  function addFiles(fileList) {
    if (!requireWritePermission()) return;
    batchAddFiles(Array.from(fileList || []));
    batchPump();
  }
  function startAll() {
    if (!requireWritePermission()) return;
    batchUpload.running = true;
    batchPump();
  }
  function retryFailed() {
    if (!requireWritePermission()) return;
    batchRetryFailed();
    batchPump();
  }
  return { openBatchUpload, openTalentIntake, saveDirectEntry, addFiles, startAll, retryFailed };
}

if (typeof window !== 'undefined') window.WorkBuddyTalentIntakeActions = { createTalentIntakeActions };
