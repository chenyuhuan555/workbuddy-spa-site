;(function initTalentFunnelAi(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelAi = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelAiModule() {
  'use strict';

  function normalizeString(value) { return String(value || '').trim(); }

  function buildTalentFunnelDiagnosisMessages({ companyName = '', analytics = {} } = {}) {
    const facts = {
      companyName: normalizeString(companyName) || '当前公司',
      channels: (Array.isArray(analytics.channels) ? analytics.channels : []).map(channel => ({
        channelId: channel.channelId,
        channelName: channel.channelName,
        counts: channel.counts,
        adjacentRates: channel.adjacentRates,
        cumulativeRates: channel.cumulativeRates,
      })),
      bottlenecks: Array.isArray(analytics.bottlenecks) ? analytics.bottlenecks : [],
    };
    return [
      {
        role: 'system',
        content: '你是招聘漏斗复盘助手。只能依据用户提供的系统统计事实进行解释和优化建议，不得修改、补造或重新计算统计数字。请严格输出 JSON：{"summary":"结论","suggestions":["建议1","建议2"]}。建议要具体、可执行，并指出对应渠道或阶段。',
      },
      {
        role: 'user',
        content: `请分析以下单家公司、仅限试点基线之后的渠道漏斗事实：\n${JSON.stringify(facts)}\n\n要求：先用 1-3 句话总结最值得关注的渠道和卡点；再给出最多 5 条优化建议。数据不足时明确说“样本不足”，不要把未知当成结论。`,
      },
    ];
  }

  function normalizeTalentFunnelAiResult(result) {
    const source = result && typeof result === 'object' ? result : {};
    const suggestions = Array.isArray(source.suggestions)
      ? source.suggestions.map(normalizeString).filter(Boolean).slice(0, 5)
      : [];
    return {
      summary: normalizeString(source.summary) || 'AI 暂未生成可用结论。',
      suggestions,
    };
  }

  function createTalentFunnelAiService({ invoke, getApiKey } = {}) {
    async function analyze({ companyName, analytics } = {}) {
      if (typeof invoke !== 'function') throw new Error('AI_SERVICE_UNAVAILABLE');
      const result = await invoke({
        task: 'talent-funnel-diagnosis',
        schema: 'json',
        temperature: 0.2,
        getApiKey,
        messages: buildTalentFunnelDiagnosisMessages({ companyName, analytics }),
      });
      return normalizeTalentFunnelAiResult(result);
    }
    return Object.freeze({ analyze });
  }

  return Object.freeze({ buildTalentFunnelDiagnosisMessages, normalizeTalentFunnelAiResult, createTalentFunnelAiService });
});
