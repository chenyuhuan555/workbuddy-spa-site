export function createAiNoteActions({
  getTarget,
  ensureNotes = target => {
    if (!Array.isArray(target.aiNotes)) target.aiNotes = [];
    return target.aiNotes;
  },
  save = async () => true,
  showToast = () => {},
  now = () => new Date().toISOString(),
  random = () => Math.random().toString(36).slice(2, 7),
}) {
  async function saveAnalysis({ draft, output, tool }) {
    if (!output) {
      draft.error = '没有可保存的内容';
      return false;
    }
    if (!draft.targetId) {
      draft.error = '请选择保存目标';
      return false;
    }
    const target = getTarget(draft.targetType, draft.targetId);
    if (!target) {
      draft.error = '目标不存在，请重新选择';
      return false;
    }
    ensureNotes(target);
    target.aiNotes.push({
      id: `note_${Date.now().toString(36)}_${random()}`,
      toolKey: tool?.key || '',
      toolTitle: tool?.title || 'AI分析',
      title: (draft.title || '').trim() || (tool?.title || 'AI分析'),
      content: output,
      createdAt: now(),
    });
    target.updatedAt = now();
    if (!await save()) {
      draft.error = '保存失败，请重试';
      return false;
    }
    draft.open = false;
    const labelMap = { company: '公司', position: '岗位', candidate: '候选人' };
    showToast(`已保存到${labelMap[draft.targetType]}AI分析`);
    return true;
  }

  async function deleteNote(entityType, entityId, noteId) {
    const target = getTarget(entityType, entityId);
    if (!target || !Array.isArray(target.aiNotes)) return false;
    const idx = target.aiNotes.findIndex(note => note.id === noteId);
    if (idx < 0) return false;
    target.aiNotes.splice(idx, 1);
    target.updatedAt = now();
    await save();
    showToast('已删除该AI分析');
    return true;
  }

  function extractSummary(content, maxLen = 160) {
    if (!content) return '';
    const text = String(content)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1');
    const headingRe = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:一句话推荐语|核心结论|结论摘要|结论|摘要|总结|核心要点)(?:\*\*)?\s*[:：]?\s*$/i;
    const buf = [];
    let capture = false;
    for (const line of text.split('\n')) {
      if (headingRe.test(line)) { capture = true; continue; }
      if (capture) {
        if (/^\s{0,3}#{1,6}\s+/.test(line)) break;
        if (line.trim() === '') { if (buf.length) break; continue; }
        buf.push(line.replace(/^[-*]\s+/, '').trim());
        if (buf.join(' ').length > maxLen) break;
      }
    }
    let summary = buf.join(' ');
    if (!summary) {
      const paras = text.split(/\n\s*\n/)
        .map(value => value.replace(/[#>*_`\-]/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      summary = paras[0] || text.replace(/[#>*_`\-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    summary = summary.replace(/[#>*_`\-]/g, '').replace(/\s+/g, ' ').trim();
    return summary.length > maxLen ? `${summary.slice(0, maxLen)}…` : summary;
  }

  return { saveAnalysis, deleteNote, extractSummary };
}

if (typeof window !== 'undefined') window.WorkBuddyAiNoteActions = { createAiNoteActions };
