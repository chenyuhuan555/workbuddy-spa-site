export function createLegacyJobActions({
  columns,
  companyEdit,
  companyProfileEditor,
  inlineForm,
  editState,
  modal,
  showToast = () => {},
  touchEntity = () => {},
  localSave = () => {},
  schedulePush = () => {},
  cloudReady = false,
  currentTimeLabel = () => new Date().toISOString(),
  currentTimeFullLabel = currentTimeLabel,
  nextTick = callback => callback(),
  normalizePositionStructuredFields = value => value,
}) {
  function startCompanyNameEdit(job) {
    if (!job) return;
    companyEdit.jobId = job.id;
    companyEdit.name = job.company || '';
    nextTick(() => document.querySelector(`input[data-company-edit="${job.id}"]`)?.focus());
  }
  function cancelCompanyNameEdit() { companyEdit.jobId = null; companyEdit.name = ''; }
  function saveCompanyName(colIdx, jobId) {
    if (companyEdit.jobId !== jobId) return;
    const name = String(companyEdit.name || '').trim();
    if (!name) { showToast('公司名称不能为空', 'error'); return; }
    const job = columns[colIdx]?.jobs?.find(item => item.id === jobId);
    if (!job) { cancelCompanyNameEdit(); return; }
    if (job.company !== name) {
      job.company = name; touchEntity(job); localSave(); if (cloudReady) schedulePush();
      if (modal.show && modal.job?.id === jobId) modal.job.company = name;
      showToast('公司名称已更新');
    }
    cancelCompanyNameEdit();
  }
  function openCompanyProfileEditor(job) {
    if (!job) return;
    companyProfileEditor.show = true;
    companyProfileEditor.text = job.companyProfileText || '';
  }
  function saveCompanyProfile(job) {
    if (!job) return;
    job.companyProfileText = String(companyProfileEditor.text || '').trim();
    job.companyProfileUpdatedAt = currentTimeLabel(); touchEntity(job);
    companyProfileEditor.show = false; localSave(); if (cloudReady) schedulePush();
    showToast(job.companyProfileText ? '公司基础信息已保存' : '公司基础信息已清空');
  }
  function clearCompanyProfile(job) {
    if (!job) return;
    companyProfileEditor.text = ''; job.companyProfileText = '';
    job.companyProfileUpdatedAt = currentTimeLabel(); touchEntity(job);
    companyProfileEditor.show = false; localSave(); if (cloudReady) schedulePush();
    showToast('公司基础信息已清空');
  }
  function startInlineAdd(jobId) { inlineForm.jobId = jobId; inlineForm.name = ''; inlineForm.detail = ''; }
  function cancelInlineAdd() { inlineForm.jobId = null; }
  function saveInlineAdd(colIdx, jobId) {
    const name = String(inlineForm.name || '').trim();
    const detail = String(inlineForm.detail || '').trim();
    if (!name || !detail) { showToast('请填写岗位名称和需求', 'error'); return; }
    const job = columns[colIdx]?.jobs?.find(item => item.id === jobId);
    if (!job?.positions) return;
    job.positions.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name, detail, completed: false, resumes: [], updatedAt: currentTimeFullLabel() });
    touchEntity(job); showToast(`已添加「${name}」到「${job.company}」`); cancelInlineAdd();
  }
  function startEditPosition(colIdx, jobId, posId, posOrName, detail, openModalFlag) {
    const sourcePos = typeof posOrName === 'object' && posOrName ? posOrName : null;
    const fields = normalizePositionStructuredFields(sourcePos || {});
    Object.assign(editState, { colIdx, jobId, posId, editName: sourcePos ? (sourcePos.name || '') : (posOrName || ''), editDetail: sourcePos ? (sourcePos.detail || '') : (detail || ''), editLocation: fields.location, editSalary: fields.salary, editReportLine: fields.reportLine, editMustHave: fields.mustHave, editNiceToHave: fields.niceToHave, editExclusions: fields.exclusions, editClientPreferences: fields.clientPreferences });
    if (openModalFlag) {
      const job = columns[colIdx]?.jobs?.find(item => item.id === jobId);
      if (job) { modal.job = job; modal.assigneeName = columns[colIdx]?.name; modal.colIdx = colIdx; modal.show = true; }
    }
  }
  function saveEditPosition() {
    const name = String(editState.editName || '').trim();
    const detail = String(editState.editDetail || '').trim();
    if (!name || !detail) { showToast('请填写岗位名称和需求描述', 'error'); return; }
    const col = columns[editState.colIdx]; const job = col?.jobs?.find(item => item.id === editState.jobId); const pos = job?.positions?.find(item => item.id === editState.posId);
    if (!pos) return;
    Object.assign(pos, { name, detail }, normalizePositionStructuredFields({ location: editState.editLocation, salary: editState.editSalary, reportLine: editState.editReportLine, mustHave: editState.editMustHave, niceToHave: editState.editNiceToHave, exclusions: editState.editExclusions, clientPreferences: editState.editClientPreferences }));
    touchEntity(pos); touchEntity(job); localSave(); if (cloudReady) schedulePush();
    if (pos.systemMatches?.length) pos.matchVersion = (pos.matchVersion || 1) + 1;
    showToast(`已更新「${name}」`); editState.posId = null;
  }
  function cancelEditPosition() { editState.posId = null; }
  return { startCompanyNameEdit, cancelCompanyNameEdit, saveCompanyName, openCompanyProfileEditor, saveCompanyProfile, clearCompanyProfile, startInlineAdd, cancelInlineAdd, saveInlineAdd, startEditPosition, saveEditPosition, cancelEditPosition };
}

if (typeof window !== 'undefined') window.WorkBuddyLegacyJobActions = { createLegacyJobActions };
