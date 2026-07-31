;(function initResumeTextRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeTextRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeTextRepoModule() {
  'use strict';

  const TABLE = 'resume_texts';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function mapError(error) {
    const text = `${error?.code || ''} ${error?.message || ''}`;
    if (/unauthorized|\b401\b|jwt/i.test(text)) return appError('AUTH_REQUIRED', error);
    if (/forbidden|row.level.security|\b403\b|42501/i.test(text)) return appError('WRITE_FORBIDDEN', error);
    return appError('BACKEND_REQUEST_FAILED', error);
  }

  function createResumeTextRepo({ supabase, getProfile }) {

    function requireReader() {
      const profile = typeof getProfile === 'function' ? getProfile() : null;
      if (!profile) throw appError('AUTH_REQUIRED');
      if (profile.status !== 'active') throw appError('ACCOUNT_DISABLED');
      return profile;
    }

    function requireWriter() {
      const profile = requireReader();
      if (profile.role !== 'admin' && profile.role !== 'editor') throw appError('WRITE_REQUIRED');
      return profile;
    }

    function toRow({ resumeVersionId, rawText, formattedText }) {
      const row = { resume_version_id: String(resumeVersionId) };
      if (rawText !== undefined && rawText !== null) row.raw_text = String(rawText);
      if (formattedText !== undefined && formattedText !== null) row.formatted_text = String(formattedText);
      return row;
    }

    function toModel(row) {
      if (!row) return null;
      return {
        resumeVersionId: row.resume_version_id,
        rawText: String(row.raw_text || ''),
        formattedText: String(row.formatted_text || ''),
        updatedAt: row.updated_at || null,
      };
    }

    // 双写入口：upsert 一份简历版本的文本（raw/formatted 可只传其一）
    async function upsertText(payload) {
      requireWriter();
      if (!payload || !payload.resumeVersionId) throw appError('INVALID_ARGUMENT');
      const { error } = await supabase.from(TABLE).upsert(toRow(payload), { onConflict: 'resume_version_id' });
      if (error) throw mapError(error);
      return true;
    }

    // 阅读端：按版本 id 取文本；无行返回 null（由调用方回退旧 JSON / 本地快照）
    async function getText(resumeVersionId) {
      requireReader();
      const { data, error } = await supabase
        .from(TABLE)
        .select('resume_version_id, raw_text, formatted_text, updated_at')
        .eq('resume_version_id', String(resumeVersionId))
        .maybeSingle();
      if (error) throw mapError(error);
      return toModel(data);
    }

    // 批量取（回填校验 / 详情页预加载用）
    async function getTexts(resumeVersionIds) {
      requireReader();
      const ids = (resumeVersionIds || []).map(String).filter(Boolean);
      if (!ids.length) return new Map();
      const { data, error } = await supabase
        .from(TABLE)
        .select('resume_version_id, raw_text, formatted_text, updated_at')
        .in('resume_version_id', ids);
      if (error) throw mapError(error);
      const map = new Map();
      (data || []).forEach(row => map.set(row.resume_version_id, toModel(row)));
      return map;
    }

    // 回填用：统计表内行数
    async function countTexts() {
      requireReader();
      const { count, error } = await supabase
        .from(TABLE)
        .select('resume_version_id', { count: 'exact', head: true });
      if (error) throw mapError(error);
      return count || 0;
    }

    return Object.freeze({ upsertText, getText, getTexts, countTexts });
  }

  return Object.freeze({ createResumeTextRepo, TABLE });
});
