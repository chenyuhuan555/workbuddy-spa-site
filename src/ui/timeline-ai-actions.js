export function createTimelineAiActions({
  getResume,
  state,
  callAi,
  getApiKey,
  getEntries = () => [],
  formatDuration = value => value,
  getWindowScore = () => 0,
  getWindowLabel = () => '',
  getCurrentCompany = () => '',
  getCurrentRole = () => '',
  isRadarBoosted = () => false,
  persist = () => {},
}) {
  async function run(kind) {
    const resume = getResume();
    if (!resume) return false;
    state.loadingKey = kind;
    state.output = '';
    state.label = kind === 'destiny' ? '🔮 解读' : kind === 'script' ? '✍️ 触达话术' : '📊 跳槽动机分析';
    state.error = '';
    try {
      const entries = getEntries();
      const score = getWindowScore();
      let prompt = '';
      if (kind === 'destiny') {
        const trajectory = entries.map(entry => `${entry.period} ${entry.name} ${entry.role} (${formatDuration(entry.duration)})${entry.eraLabel ? ` [${entry.eraLabel}]` : ''}${entry.jumpType ? ` ${entry.jumpType === 'passive' ? '可能被动' : entry.jumpType === 'active' ? '可能主动' : ''}` : ''}`).join('\n');
        prompt = `候选人职业轨迹：\n${trajectory}\n\n窗口指数：${score}（${getWindowLabel()}）\n当前公司：${getCurrentCompany()}\n候选人的跳槽行为是追风口型、稳定深耕型还是被动漂流型？现在联系胜算如何？请给300-500字分析。`;
      } else if (kind === 'script') {
        const strategy = score >= 85 ? '黄金窗口，直接切入机会' : score >= 55 ? '观望期，先聊行业建立连接' : '稳定期，只问候不推岗';
        prompt = `候选人在 ${getCurrentCompany()} 担任 ${getCurrentRole()}，窗口指数${score}（${getWindowLabel()}）。策略：${strategy}。${isRadarBoosted() ? '该公司近期有利空信号，可委婉提及行业变化。' : ''}\n请生成触达话术。`;
      } else {
        const workEntries = entries.filter(entry => entry.type === 'work');
        const jumps = [];
        for (let i = 0; i < workEntries.length; i++) {
          if (i > 0 && !workEntries[i].isCurrent) jumps.push(`${workEntries[i].name} (${workEntries[i].period})${workEntries[i].jumpType ? ` - ${workEntries[i].jumpType}` : ''}`);
        }
        prompt = `候选人工作经历：\n${workEntries.map(entry => `- ${entry.name} ${entry.role} ${entry.period} (${formatDuration(entry.duration)})`).join('\n')}\n\n跳槽节点：\n${jumps.join('\n') || '无明显跳槽'}\n\n请分析：1.主动因素占比推断 2.被动因素分析 3.潜在风险提示 4.面试时建议核实的3个问题。300-400字。`;
      }
      const system = kind === 'destiny'
        ? '你是资深猎头顾问，擅长从职业轨迹中读出隐藏信息。用资深猎头视角，口语化、有判断力、不废话。'
        : kind === 'script'
          ? '你是猎头触达专家。生成可直接发送的微信/电话触达话术。第一人称，不带称谓（如“张总”），150-250字，自然口语化。'
          : '你是猎头行业的行为分析专家。分析候选人跳槽动机，输出结构化。';
      const content = await callAi({ task: `timeline-${kind}`, getApiKey, temperature: kind === 'script' ? 0.5 : kind === 'destiny' ? 0.4 : 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] });
      state.output = content || '';
      if (kind === 'destiny') persist('destinyAnalysis', { verdict: content, generatedAt: new Date().toISOString() });
      if (kind === 'motivation') persist('motivationAnalysis', { content, generatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      state.error = error.message;
      return false;
    } finally {
      state.loadingKey = '';
    }
  }
  return { generateDestinyReading: () => run('destiny'), generateOpeningScript: () => run('script'), generateMotivationAnalysis: () => run('motivation') };
}

if (typeof window !== 'undefined') window.WorkBuddyTimelineAiActions = { createTimelineAiActions };
