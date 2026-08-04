export function createApplicationMatchAnalysisActions({ getContext, callAi, getApiKey, save = async () => true, showToast = () => {}, now = () => new Date().toISOString() }) {
  let running = false;

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
    if (value == null || String(value).trim() === '') return [];
    return [String(value).trim()];
  }

  function parseAnalysis(value) {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('AI 返回格式无法识别');
    const score = Number(data.score);
    if (!Number.isFinite(score)) throw new Error('AI 未返回有效匹配度');
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      conclusion: String(data.conclusion || '').trim(),
      strengths: asArray(data.strengths),
      risks: asArray(data.risks),
      verifyQuestions: asArray(data.verifyQuestions),
      recommendation: String(data.recommendation || '').trim(),
    };
  }

  async function analyze() {
    if (running) return { ok: false, error: '分析正在进行中' };
    const { application, candidate, position } = getContext?.() || {};
    if (!application || !candidate || !position) return { ok: false, error: '候选人、岗位或推进记录不存在' };
    const resumeText = String(candidate.formattedText || candidate.electronicResumeText || candidate.rawText || candidate.candidateProfileText || '').trim();
    const jobText = [position.title, position.description, ...(Array.isArray(position.skills) ? position.skills : [])].filter(Boolean).join('\n').trim();
    if (!jobText) return { ok: false, error: '岗位信息不足，请先补充岗位职责或匹配关键词' };
    if (!resumeText) return { ok: false, error: '候选人简历文本不足，请先完成简历提取' };
    running = true;
    try {
      const content = await callAi({ task: 'application-match-analysis', getApiKey, temperature: 0.2, messages: [
        { role: 'system', content: '你是资深猎头顾问。只返回 JSON，不要 markdown。必须基于输入事实，区分匹配优势、风险缺口和待核实问题。' },
        { role: 'user', content: `候选人：${candidate.name || '未命名'}\n候选人简历：\n${resumeText}\n\n岗位信息：\n${jobText}\n\n请返回 JSON：{"score":0,"conclusion":"强匹配/基本匹配/谨慎推荐/不建议","strengths":[""],"risks":[""],"verifyQuestions":[""],"recommendation":""}` },
      ] });
      const analysis = { ...parseAnalysis(content), generatedAt: now() };
      const previous = application.aiMatchAnalysis;
      application.aiMatchAnalysis = analysis;
      if (!await save()) {
        application.aiMatchAnalysis = previous;
        return { ok: false, error: '匹配分析保存失败，请重试' };
      }
      showToast('候选人与岗位匹配分析已完成');
      return { ok: true, analysis };
    } catch (error) {
      return { ok: false, error: error.message || '匹配分析失败' };
    } finally {
      running = false;
    }
  }

  return { analyze, parseAnalysis };
}

if (typeof window !== 'undefined') window.WorkBuddyApplicationMatchAnalysisActions = { createApplicationMatchAnalysisActions };
