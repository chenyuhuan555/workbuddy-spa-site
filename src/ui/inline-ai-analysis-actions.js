export function createInlineAiAnalysisActions({
  findTarget,
  ensureAiNotes,
  findTool = () => null,
  save = async () => false,
  showToast = () => {},
  now = () => new Date(),
}) {
  async function saveInlineAiAnalysis(panel, entityType, entityId) {
    if (!panel.output || !entityId) return;
    const target = findTarget(entityType, entityId);
    if (!target) { showToast('保存目标不存在', 'error'); return; }
    ensureAiNotes(target);
    const tool = findTool(panel.toolKey);
    const timestamp = now();
    const stamp = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
    target.aiNotes.push({
      id: `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      toolKey: panel.toolKey || '',
      toolTitle: tool?.title || 'AI分析',
      title: `${tool?.title || 'AI分析'} - ${stamp}`,
      content: panel.output,
      createdAt: timestamp.toISOString(),
    });
    target.updatedAt = timestamp.toISOString();
    const saved = await save();
    if (!saved) { showToast('保存失败，请重试', 'error'); return; }
    panel.output = '';
    panel.input = '';
    const labelMap = { company: '公司', position: '岗位', candidate: '候选人' };
    showToast(`已保存到${labelMap[entityType]}AI分析`);
  }

  return { saveInlineAiAnalysis };
}

if (typeof window !== 'undefined') window.WorkBuddyInlineAiAnalysisActions = { createInlineAiAnalysisActions };
