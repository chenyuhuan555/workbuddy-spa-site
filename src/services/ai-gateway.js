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

    return Object.freeze({
      parseResume: payload => invoke(payload),
      matchCandidates: payload => invoke({ ...payload, task: 'match_candidates' }),
    });
  }

  return Object.freeze({ createAiGateway });
});
