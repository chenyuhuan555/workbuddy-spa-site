;(function initAiGateway(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyAiGateway = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createAiGatewayModule() {
  'use strict';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function createAiGateway({ supabase, functionName = 'parse-resume' } = {}) {
    async function invoke(body = {}) {
      if (!supabase?.functions?.invoke) throw appError('AI_GATEWAY_UNAVAILABLE');
      const { data, error } = await supabase.functions.invoke(functionName, { body: { ...body } });
      if (error) throw appError('AI_GATEWAY_FAILED', error);
      return data;
    }

    async function summarizeDailyReview({ reviewDate, userName, metrics, issue, tomorrowFocus } = {}) {
      const data = await invoke({
        task: 'daily_review_summary',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: '你是猎头团队的每日复盘助手。只根据提供的数据，用中文输出一段不超过120字的客观总结；突出成果、问题和次日重点，不编造事实，不使用 Markdown。',
          },
          {
            role: 'user',
            content: JSON.stringify({
              reviewDate: String(reviewDate || ''),
              userName: String(userName || ''),
              metrics: metrics && typeof metrics === 'object' ? metrics : {},
              issue: String(issue || ''),
              tomorrowFocus: String(tomorrowFocus || ''),
            }),
          },
        ],
      });
      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      if (!content) throw appError('AI_GATEWAY_EMPTY_RESPONSE');
      return content;
    }

    return Object.freeze({
      parseResume: payload => invoke(payload),
      matchCandidates: payload => invoke({ ...payload, task: 'match_candidates' }),
      summarizeDailyReview,
    });
  }

  return Object.freeze({ createAiGateway });
});
