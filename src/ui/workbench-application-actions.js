export function createWorkbenchApplicationActions({
  state,
  findApplication,
  showToast = () => {},
  saveWorkbenchV2 = async () => true,
  ensureResumeTexts = () => {},
  stages = { DISCOVERED: 'discovered', CLOSED: 'closed' },
  stageActions = null,
  workbenchV2Api = {},
  getWorkbenchBundle = () => state,
  requireWritePermission = () => true,
  now = () => new Date().toISOString(),
}) {
  const resolveApplication = id => findApplication ? findApplication(id) : state.applications?.find(item => item.id === id);

  function openApplicationDetail(id) {
    const application = resolveApplication(id);
    if (!application) { showToast('推进记录不存在', 'error'); return; }
    if (typeof application.progressNote !== 'string') application.progressNote = '';
    if (typeof application.communicationLog !== 'string') application.communicationLog = '';
    if (typeof application.owner !== 'string') application.owner = '';
    if (state.nav && typeof state.nav === 'object' && 'value' in state.nav) state.nav.value = 'companies';
    else state.nav = 'companies';
    Object.assign(state.route, { type: 'application', id, parentId: application.companyId || '', tab: 'overview' });
  }

  async function saveApplicationDetail() {
    if (!requireWritePermission()) return false;
    const saved = await saveWorkbenchV2();
    if (saved) showToast('推进记录已保存');
    return saved;
  }

  async function deletePipelineEvent(application, eventId) {
    if (!application || !Array.isArray(application.pipelineEvents)) return;
    const idx = application.pipelineEvents.findIndex(event => event.id === eventId);
    if (idx < 0) return;
    application.pipelineEvents.splice(idx, 1);
    const last = application.pipelineEvents.at(-1);
    application.stage = last?.toStage || stages.DISCOVERED;
    application.stageEnteredAt = last?.occurredAt || application.createdAt || now();
    application.updatedAt = now();
    await saveWorkbenchV2();
    showToast('已删除该条时间线事件');
  }

  async function createApplicationFromMatch(candidateId, positionId, match = {}) {
    if (!requireWritePermission()) return null;
    try {
      const application = workbenchV2Api.createApplication(getWorkbenchBundle(), {
        candidateId, positionId, matchScore: match.score ?? null, matchReason: match.reason || '',
        matchHighlights: match.highlights || [], matchGaps: match.gaps || [], matchRisks: match.risks || [],
      });
      if (await saveWorkbenchV2()) showToast('已创建推进记录');
      return application;
    } catch (error) {
      showToast(error.message, 'error');
      return null;
    }
  }

  async function changeWorkbenchApplicationStage(application, toStage) {
    try {
      if (stageActions && typeof stageActions.changeStage === 'function') {
        await stageActions.changeStage(application, {
          toStage,
          reasonCode: toStage === stages.CLOSED ? 'other' : '',
          reasonNote: toStage === stages.CLOSED ? '从推进中心结束' : '',
          manualConfirmed: true,
        });
      } else {
        workbenchV2Api.changeApplicationStage(application, {
          toStage,
          reasonCode: toStage === stages.CLOSED ? 'other' : '',
          reasonNote: toStage === stages.CLOSED ? '从推进中心结束' : '',
        });
      }
      return await saveWorkbenchV2();
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  }

  return {
    openApplicationDetail,
    saveApplicationDetail,
    deletePipelineEvent,
    createApplicationFromMatch,
    changeWorkbenchApplicationStage,
  };
}

if (typeof window !== 'undefined') window.WorkBuddyWorkbenchApplicationActions = { createWorkbenchApplicationActions };
