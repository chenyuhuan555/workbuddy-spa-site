;(function initResumeSearchRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeSearchRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeSearchRepoModule() {
  'use strict';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function createResumeSearchRepo({ supabase, getProfile }) {
    function requireReader() {
      const profile = typeof getProfile === 'function' ? getProfile() : null;
      if (!profile || profile.status !== 'active') throw appError('AUTH_REQUIRED');
    }

    async function search({ query = '', limit = 50, offset = 0 } = {}) {
      requireReader();
      const searchQuery = String(query || '').trim();
      if (!searchQuery) return Object.freeze({ rows: [], total: 0, query: '' });
      const resultLimit = Math.min(100, Math.max(1, Number(limit) || 50));
      const resultOffset = Math.max(0, Number(offset) || 0);
      const { data, error } = await supabase.rpc('search_resumes', {
        search_query: searchQuery,
        result_limit: resultLimit,
        result_offset: resultOffset,
      });
      if (error) throw appError('SEARCH_UNAVAILABLE', error);
      const rows = Array.isArray(data) ? data : [];
      return Object.freeze({ rows, total: rows.length, query: searchQuery });
    }

    return Object.freeze({ search });
  }

  return Object.freeze({ createResumeSearchRepo });
});
