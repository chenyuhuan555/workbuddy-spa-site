export function createCandidatePipelineActions({
  dialog,
  modal,
  ensureDefaults,
  pipeline,
  candidatePipelineLabel,
  touchEntity = () => {},
  localSave = () => {},
  schedulePush = () => {},
  cloudReady = false,
  currentTime = () => new Date().toISOString(),
  showToast = () => {},
}) {
  function requestStageChange(resume, toStage) {
    if (!resume || !toStage) return;
    ensureDefaults(resume);
    if (resume.pipelineStage === toStage) return;
    Object.assign(dialog, { resume, fromStage: resume.pipelineStage || '', toStage, occurredAt: currentTime().slice(0, 10), reasonCode: '', reasonNote: '', show: true });
  }
  function closeStageChange() {
    Object.assign(dialog, { show: false, resume: null, fromStage: '', toStage: '', occurredAt: '', reasonCode: '', reasonNote: '' });
  }
  function saveStageChange() {
    const resume = dialog.resume;
    if (!resume) return;
    try {
      const occurredAt = dialog.occurredAt ? new Date(`${dialog.occurredAt}T12:00:00`).toISOString() : currentTime();
      pipeline.appendStageEvent(resume, { toStage: dialog.toStage, occurredAt, reasonCode: dialog.reasonCode, reasonNote: dialog.reasonNote, actor: modal.assigneeName || '本机顾问' });
      touchEntity(resume); localSave(); if (cloudReady) schedulePush();
      showToast(`已推进到${candidatePipelineLabel(resume.pipelineStage)}`); closeStageChange();
    } catch (error) { showToast(error.message || '阶段变更失败', 'error'); }
  }
  function saveBusinessMeta(resume, message = '候选人业务数据已保存') {
    if (!resume) return;
    ensureDefaults(resume); touchEntity(resume); localSave(); if (cloudReady) schedulePush(); showToast(message);
  }
  function recordFollowup(resume, action = '') {
    if (!resume) return;
    ensureDefaults(resume);
    const content = String(action || resume.followupDraft || '').trim();
    if (!content && !resume.pipelineStage && !resume.nextFollowupAt) return;
    resume.followups.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), stage: resume.pipelineStage || '', note: content || `阶段更新为 ${candidatePipelineLabel(resume.pipelineStage)}`, nextFollowupAt: resume.nextFollowupAt || '', createdAt: currentTime() });
    resume.lastFollowupAt = currentTime(); resume.followupDraft = '';
    saveBusinessMeta(resume, '跟进记录已保存');
  }
  function startFollowupEdit(resume, followup) { if (resume && followup) { resume.editingFollowupId = followup.id; resume.followupEditDraft = followup.note || ''; resume.followupEditDate = followup.nextFollowupAt || ''; } }
  function cancelFollowupEdit(resume) { if (resume) { resume.editingFollowupId = ''; resume.followupEditDraft = ''; resume.followupEditDate = ''; } }
  function saveFollowupEdit(resume, followup) {
    if (!resume || !followup) return;
    ensureDefaults(resume);
    followup.note = String(resume.followupEditDraft || '').trim() || followup.note || `阶段更新为 ${candidatePipelineLabel(followup.stage)}`;
    followup.nextFollowupAt = resume.followupEditDate || ''; followup.updatedAt = currentTime(); cancelFollowupEdit(resume); saveBusinessMeta(resume, '跟进记录已更新');
  }
  function deleteFollowup(resume, followupId) {
    if (!resume || !Array.isArray(resume.followups)) return;
    resume.followups = resume.followups.filter(item => item.id !== followupId); resume.lastFollowupAt = resume.followups[0]?.createdAt || '';
    if (resume.editingFollowupId === followupId) cancelFollowupEdit(resume);
    saveBusinessMeta(resume, '跟进记录已删除');
  }
  return { requestStageChange, closeStageChange, saveStageChange, saveBusinessMeta, recordFollowup, startFollowupEdit, cancelFollowupEdit, saveFollowupEdit, deleteFollowup };
}

if (typeof window !== 'undefined') window.WorkBuddyCandidatePipelineActions = { createCandidatePipelineActions };
