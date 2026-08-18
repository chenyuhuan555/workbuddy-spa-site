;(function initCandidateMatchingRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateMatchingRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateMatchingRepoModule() {
  'use strict';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function createCandidateMatchingRepo({ supabase, getProfile }) {
    function requireReader() {
      const profile = typeof getProfile === 'function' ? getProfile() : null;
      if (!profile || profile.status !== 'active') throw appError('AUTH_REQUIRED');
    }

    async function matchPosition({ positionId, limit = 50, offset = 0 } = {}) {
      requireReader();
      const id = String(positionId || '').trim();
      if (!id) throw appError('INVALID_ARGUMENT');
      const resultLimit = Math.min(100, Math.max(1, Number(limit) || 50));
      const resultOffset = Math.max(0, Number(offset) || 0);
      const { data, error } = await supabase.rpc('match_candidates', {
        position_id: id,
        result_limit: resultLimit,
        result_offset: resultOffset,
      });
      if (error) throw appError('MATCHING_UNAVAILABLE', error);
      const rows = Array.isArray(data) ? data : [];
      return Object.freeze({ rows, total: rows.length, positionId: id });
    }

    return Object.freeze({ matchPosition });
  }

  return Object.freeze({ createCandidateMatchingRepo });
});
