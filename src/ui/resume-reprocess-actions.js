export function createResumeReprocessActions({
  selectedCandidate,
  activeVersion,
  requireWritePermission = () => true,
  requireAiPermission = () => true,
  validateRequest,
  successMessage,
  enqueue,
  showToast = () => {},
}) {
  async function run({ refreshRawText }) {
    if (!requireWritePermission() || !requireAiPermission()) return;
    const candidate = selectedCandidate?.value ?? selectedCandidate;
    const version = activeVersion?.value ?? activeVersion;
    const validation = validateRequest(version, refreshRawText);
    if (!validation.ok) { showToast(validation.reason, 'error'); return; }
    try {
      await enqueue(candidate.id, version.id, { refreshRawText });
      showToast(successMessage(refreshRawText));
    } catch (error) {
      showToast(error.message || '简历重新处理失败，请重试', 'error');
    }
  }
  return {
    run,
    fromText: () => run({ refreshRawText: false }),
    fromOriginal: () => run({ refreshRawText: true }),
  };
}

if (typeof window !== 'undefined') window.WorkBuddyResumeReprocessActions = { createResumeReprocessActions };
