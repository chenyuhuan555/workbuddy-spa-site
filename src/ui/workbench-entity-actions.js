function createWorkbenchEntityActions({ canWrite, state, route, nav, companyCreate, companyPositionCreate, companyProfileEdit, selectedCompany, selectedPosition, WorkbenchV2, save, schedulePush, cloudReady, showToast, openCompanyDetail, openPositionDetail, workbenchMode, aiToolbox, getAiToolbox, positionApplications, confirmAction = globalThis.confirm }) {
  const routeCompany = typeof openCompanyDetail === 'function'
    ? openCompanyDetail
    : id => { nav.value = 'companies'; Object.assign(route, { type: 'company', id, parentId: '', tab: 'overview' }); };
  const routePosition = typeof openPositionDetail === 'function'
    ? openPositionDetail
    : id => { nav.value = 'companies'; Object.assign(route, { type: 'position', id, parentId: '', tab: 'overview' }); };
  function persist(message) {
    return Promise.resolve(save()).then(saved => {
      if (cloudReady) schedulePush();
      showToast(saved ? message : `${message}，已暂存到浏览器`);
      return saved;
    });
  }
  function openCompanyCreateAction() {
    if (!canWrite) return;
    nav.value = 'companies';
    Object.assign(route, { type: 'list', id: '', parentId: '', tab: 'overview' });
    Object.assign(companyCreate, { open: true, name: '', industry: '', city: '', owner: '', status: 'potential' });
  }
  async function createWorkbenchCompany(input = null) {
    const source = input || companyCreate;
    const name = String(source.name || '').trim();
    if (!name) { showToast('请填写公司名称', 'error'); return; }
    const company = WorkbenchV2.createCompany({ name, industry: String(source.industry || '').trim(), city: String(source.city || '').trim(), owner: String(source.owner || '').trim(), status: source.status || 'potential' });
    state.companies.push(company);
    const saved = await save();
    if (cloudReady) schedulePush();
    companyCreate.open = false;
    routeCompany(company.id);
    showToast(saved ? '公司已创建' : '公司已暂存到浏览器');
    return company;
  }
  function openCompanyPositionCreateAction() {
    if (!canWrite || !selectedCompany.value) return;
    Object.assign(companyPositionCreate, { open: true, title: '', city: '', salary: '', owner: selectedCompany.value.owner || '' });
  }
  function openCompanyProfileEditAction() {
    if (!canWrite || !selectedCompany.value || !companyProfileEdit) return;
    Object.assign(companyProfileEdit, { open: true, name: selectedCompany.value.name || '', text: selectedCompany.value.profileText || '' });
  }
  function cancelCompanyProfileEditAction() {
    if (!companyProfileEdit) return;
    Object.assign(companyProfileEdit, { open: false, name: '', text: '' });
  }
  async function saveCompanyProfileEditAction() {
    if (!canWrite || !selectedCompany.value || !companyProfileEdit) return;
    const name = String(companyProfileEdit.name || '').trim();
    if (!name) { showToast('请填写公司名称', 'error'); return; }
    selectedCompany.value.name = name;
    selectedCompany.value.profileText = String(companyProfileEdit.text || '').trim();
    selectedCompany.value.updatedAt = new Date().toISOString();
    const saved = await persist('公司信息已保存');
    Object.assign(companyProfileEdit, { open: false, name: '', text: '' });
    return saved;
  }
  async function createCompanyPosition() {
    if (!selectedCompany.value) return;
    const title = String(companyPositionCreate.title || '').trim();
    if (!title) { showToast('请填写岗位名称', 'error'); return; }
    const position = WorkbenchV2.createPosition({ companyId: selectedCompany.value.id, title, city: String(companyPositionCreate.city || '').trim(), salary: String(companyPositionCreate.salary || '').trim(), owner: String(companyPositionCreate.owner || '').trim() });
    state.positions.push(position);
    const saved = await save();
    if (cloudReady) schedulePush();
    companyPositionCreate.open = false;
    routePosition(position.id);
    showToast(saved ? '岗位已创建' : '岗位已暂存到浏览器');
    return position;
  }
  function openCompanyDetailAction(id) { nav.value = 'companies'; Object.assign(route, { type: 'company', id, parentId: '', tab: 'overview' }); }
  function openPositionDetailAction(id) {
    const position = state.positions.find(item => item.id === id);
    nav.value = 'companies';
    Object.assign(route, { type: 'position', id, parentId: position?.companyId || '', tab: 'overview' });
    const toolbox = typeof getAiToolbox === 'function' ? getAiToolbox() : aiToolbox;
    if (workbenchMode?.value === 'v2' && toolbox) toolbox.posId = id;
  }
  async function toggleWorkbenchPositionStatus() {
    if (!canWrite || !selectedPosition.value) return;
    const nextStatus = selectedPosition.value.status === 'closed' ? 'open' : 'closed';
    WorkbenchV2.setPositionStatus(state, selectedPosition.value.id, nextStatus);
    return persist(nextStatus === 'closed' ? '岗位已关闭' : '岗位已重新开放');
  }
  async function requestWorkbenchPositionDelete() {
    if (!canWrite || !selectedPosition.value) return;
    const position = selectedPosition.value;
    const count = positionApplications.value.length;
    if (count) {
      const closeNow = position.status !== 'closed' && confirmAction(`“${position.title}”已有 ${count} 条候选人推进记录，不能永久删除。是否关闭岗位并保留全部历史？`);
      if (closeNow) { WorkbenchV2.setPositionStatus(state, position.id, 'closed'); await persist('岗位已关闭，候选人推进历史已保留'); }
      else if (position.status === 'closed') showToast(`该岗位已有 ${count} 条候选人推进记录，不能永久删除`, 'error');
      return;
    }
    if (!confirmAction(`确认永久删除岗位“${position.title}”？此操作无法恢复。`)) return;
    const companyId = position.companyId;
    WorkbenchV2.deletePosition(state, position.id);
    await save();
    if (cloudReady) schedulePush();
    routeCompany(companyId);
    route.tab = 'positions';
    showToast('岗位已永久删除');
  }
  return { openCompanyCreate: openCompanyCreateAction, createWorkbenchCompany, openCompanyPositionCreate: openCompanyPositionCreateAction, createCompanyPosition, openCompanyProfileEdit: openCompanyProfileEditAction, cancelCompanyProfileEdit: cancelCompanyProfileEditAction, saveCompanyProfileEdit: saveCompanyProfileEditAction, openCompanyDetail: openCompanyDetailAction, openPositionDetail: openPositionDetailAction, toggleWorkbenchPositionStatus, requestWorkbenchPositionDelete, persistWorkbenchPosition: persist };
}

if (typeof window !== 'undefined') window.WorkBuddyWorkbenchEntityActions = { createWorkbenchEntityActions };

export { createWorkbenchEntityActions };
