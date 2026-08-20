;(function initDailyReviewRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyDailyReviewRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createDailyReviewRepoModule() {
  'use strict';

  const TABLE = 'daily_reviews';

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

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function toModel(row) {
    if (!row) return null;
    return {
      id: normalizeString(row.id),
      workspaceId: normalizeString(row.workspace_id) || 'main',
      userId: normalizeString(row.user_id),
      userName: normalizeString(row.user_name),
      reviewDate: normalizeString(row.review_date),
      metrics: row.metrics && typeof row.metrics === 'object' ? row.metrics : {},
      issue: normalizeString(row.issue),
      tomorrowFocus: normalizeString(row.tomorrow_focus),
      summary: normalizeString(row.summary),
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  function toRow(review) {
    return {
      id: normalizeString(review?.id),
      workspace_id: normalizeString(review?.workspaceId) || 'main',
      user_id: normalizeString(review?.userId),
      user_name: normalizeString(review?.userName) || null,
      review_date: normalizeString(review?.reviewDate),
      metrics: review?.metrics && typeof review.metrics === 'object' ? review.metrics : {},
      issue: normalizeString(review?.issue),
      tomorrow_focus: normalizeString(review?.tomorrowFocus),
      summary: normalizeString(review?.summary),
    };
  }

  function createDailyReviewRepo({ supabase, getProfile }) {
    function requireReader() {
      const profile = typeof getProfile === 'function' ? getProfile() : null;
      if (!profile) throw appError('AUTH_REQUIRED');
      if (profile.status !== 'active') throw appError('ACCOUNT_DISABLED');
      return profile;
    }

    // 单顾问某天的复盘；不存在返回 null。
    async function loadByDate({ workspaceId = 'main', userId, reviewDate } = {}) {
      requireReader();
      const uid = normalizeString(userId);
      const date = normalizeString(reviewDate);
      if (!uid || !date) throw appError('INVALID_ARGUMENT');
      const { data, error } = await supabase.from(TABLE).select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', uid)
        .eq('review_date', date)
        .maybeSingle();
      if (error) throw mapError(error);
      return data ? toModel(data) : null;
    }

    // 团队某天的复盘（管理员视角）；顾问调用时由 RLS 自然降级为只返回自己。
    async function loadTeamByDate({ workspaceId = 'main', reviewDate } = {}) {
      requireReader();
      const date = normalizeString(reviewDate);
      if (!date) throw appError('INVALID_ARGUMENT');
      const { data, error } = await supabase.from(TABLE).select('*')
        .eq('workspace_id', workspaceId)
        .eq('review_date', date)
        .order('user_name', { ascending: true })
        .order('updated_at', { ascending: false });
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    // 历史复盘：userId 为空或 'all' 时查团队全部（管理员）；否则限定本人。按日期倒序。
    async function loadHistory({ workspaceId = 'main', userId, startDate, endDate } = {}) {
      requireReader();
      let query = supabase.from(TABLE).select('*').eq('workspace_id', workspaceId);
      const uid = normalizeString(userId);
      if (uid && uid !== 'all') query = query.eq('user_id', uid);
      if (startDate) query = query.gte('review_date', normalizeString(startDate));
      if (endDate) query = query.lte('review_date', normalizeString(endDate));
      query = query.order('review_date', { ascending: false }).order('updated_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    // 保存 / 覆盖当天复盘。同一人同一天只保留一条（唯一约束 workspace_id+user_id+review_date）。
    async function upsertReview(review) {
      const profile = requireReader();
      const row = toRow(review);
      if (!row.id || !row.user_id || !row.review_date) throw appError('INVALID_ARGUMENT');
      // 应用层第二道防线：只能写自己的日报（RLS 是第一道），管理员也不代写他人。
      if (row.user_id !== normalizeString(profile.id)) throw appError('WRITE_FORBIDDEN');
      const { data, error } = await supabase.from(TABLE)
        .upsert(row, { onConflict: 'workspace_id,user_id,review_date' })
        .select('*')
        .single();
      if (error) throw mapError(error);
      return toModel(data);
    }

    return Object.freeze({ loadByDate, loadTeamByDate, loadHistory, upsertReview });
  }

  return Object.freeze({ TABLE, createDailyReviewRepo });
});
