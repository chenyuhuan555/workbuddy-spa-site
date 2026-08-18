export function createShortlistActions({
  dialog,
  getCandidates,
  pipelineLabel = value => value,
  clipboard = globalThis.navigator?.clipboard,
  showToast = () => {},
}) {
  function candidateSummary(resume) {
    const risks = resume.aiScore?.risks ? `风险：${resume.aiScore.risks}` : '';
    return [
      resume.candidateSummary || resume.electronicResumeText || resume.name || '未命名候选人',
      resume.aiScore?.score >= 0 ? `评分：${resume.aiScore.score}` : '',
      resume.pipelineStage ? `阶段：${pipelineLabel(resume.pipelineStage)}` : '',
      resume.nextFollowupAt ? `下次跟进：${resume.nextFollowupAt}` : '',
      risks,
    ].filter(Boolean).join('\n');
  }

  async function copySummary() {
    const job = dialog.job;
    const position = dialog.pos;
    const candidates = getCandidates(position);
    const text = [
      `岗位短名单：${job?.company || '未命名公司'} · ${position?.name || '未命名岗位'}`,
      '',
      ...candidates.map((resume, index) => `${index + 1}. ${resume.name || '未命名候选人'}\n${candidateSummary(resume)}`),
    ].join('\n\n');
    await clipboard.writeText(text);
    showToast('短名单对比摘要已复制');
  }

  return { candidateSummary, copySummary };
}

if (typeof window !== 'undefined') window.WorkBuddyShortlistActions = { createShortlistActions };
