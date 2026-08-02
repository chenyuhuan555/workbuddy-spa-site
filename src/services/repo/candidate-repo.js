;(function initCandidateRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateRepoModule() {
  'use strict';

  const TABLE = 'candidates';

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

  function createCandidateRepo({ supabase, getProfile }) {

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

    // 版本元数据入库前剥离大文本（文本已在 resume_texts），保持候选人行轻量
    function stripVersionTexts(versions) {
      return (versions || []).map(v => {
        const o = Object.assign({}, v);
        delete o.rawText;
        delete o.formattedText;
        delete o.fileData;
        delete o.electronicResumeText;
        return o;
      });
    }

    function toRow(cand) {
      if (!cand || !cand.id) throw appError('INVALID_ARGUMENT');
      const row = {
        id: String(cand.id),
        workspace_id: 'main',
        name: String(cand.name || ''),
        phone: cand.phone != null ? String(cand.phone) : null,
        email: cand.email != null ? String(cand.email) : null,
        current_company: cand.currentCompany != null ? String(cand.currentCompany) : null,
        current_title: cand.currentTitle != null ? String(cand.currentTitle) : null,
        city: cand.city != null ? String(cand.city) : null,
        status: cand.status != null ? String(cand.status) : 'active',
        owner: cand.owner != null ? String(cand.owner) : null,
        source: cand.source != null ? String(cand.source) : null,
        education: cand.education != null ? String(cand.education) : null,
        experience_years: cand.experienceYears != null ? Number(cand.experienceYears) : null,
        tags: cand.tags || [],
        skills: cand.skills || [],
        keywords: cand.keywords || [],
        directions: cand.directions || [],
        category_ids: cand.categoryIds || [],
        summary: cand.summary != null ? String(cand.summary) : null,
        profile_text: cand.profileText != null ? String(cand.profileText) : null,
        resume_versions: stripVersionTexts(cand.resumeVersions),
      };
      if (cand.createdAt != null) row.created_at = String(cand.createdAt);
      if (cand.updatedAt != null) row.updated_at = String(cand.updatedAt);
      return row;
    }

    function toModel(row) {
      if (!row) return null;
      return {
        id: row.id,
        name: row.name || '',
        phone: row.phone || '',
        email: row.email || '',
        currentCompany: row.current_company || '',
        currentTitle: row.current_title || '',
        city: row.city || '',
        status: row.status || 'active',
        owner: row.owner || '',
        source: row.source || '',
        education: row.education || '',
        experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
        tags: row.tags || [],
        skills: row.skills || [],
        keywords: row.keywords || [],
        directions: row.directions || [],
        categoryIds: row.category_ids || [],
        summary: row.summary || '',
        profileText: row.profile_text || '',
        resumeVersions: row.resume_versions || [],
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        deletedAt: row.deleted_at || null,
      };
    }

    // 双写入口：upsert 单个候选人（含版本元数据）
    async function upsertCandidate(cand) {
      requireWriter();
      const { error } = await supabase.from(TABLE).upsert(toRow(cand), { onConflict: 'id' });
      if (error) throw mapError(error);
      return true;
    }

    // 双写入口：批量 upsert（回填/增量推送用）
    async function upsertCandidates(cands) {
      requireWriter();
      const rows = (cands || []).map(toRow);
      if (!rows.length) return 0;
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
      if (error) throw mapError(error);
      return rows.length;
    }

    // 阅读端：按 id 取候选人（Phase 2b 切换读路径时启用）
    async function getCandidate(id) {
      requireReader();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', String(id))
        .maybeSingle();
      if (error) throw mapError(error);
      return toModel(data);
    }

    // 增量拉取（Phase 2b 用）：按 updated_at 游标分页，cursor 取服务端返回的最大 updated_at
    async function getCandidatesSince(cursor, limit = 500) {
      requireReader();
      let q = supabase
        .from(TABLE)
        .select('*')
        .eq('workspace_id', 'main')
        .order('updated_at', { ascending: true })
        .limit(limit);
      if (cursor) q = q.gt('updated_at', cursor);
      const { data, error } = await q;
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    // 回填校验用：统计表内行数
    async function countCandidates() {
      requireReader();
      const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true });
      if (error) throw mapError(error);
      return count || 0;
    }

    // 合并原语（Phase 2b 增量对账用，纯函数可单测）：
    // 把一条云端候选人行合并进本地候选人对象。
    // 规则：云端为共享源，赢在标量/数组字段；版本文本以本地为准保留（表内版本已剥离文本）；
    //       云端独有版本追加；绝不删除本地数据。
    function mergeCandidateInto(local, cloud) {
      if (!local || !cloud) return local;
      const fields = [
        'name', 'phone', 'email', 'currentCompany', 'currentTitle', 'city',
        'status', 'owner', 'source', 'education', 'experienceYears',
        'tags', 'skills', 'keywords', 'directions', 'categoryIds',
        'summary', 'profileText',
      ];
      fields.forEach(f => {
        const v = cloud[f];
        if (v !== undefined && v !== null) local[f] = v;
      });
      const localVersions = new Map((local.resumeVersions || []).map(v => [v.id, v]));
      const merged = (local.resumeVersions || []).slice();
      (cloud.resumeVersions || []).forEach(cv => {
        if (!localVersions.has(cv.id)) merged.push(cv);
      });
      local.resumeVersions = merged;
      if (cloud.updatedAt) local.updatedAt = cloud.updatedAt;
      return local;
    }

    return Object.freeze({
      upsertCandidate,
      upsertCandidates,
      getCandidate,
      getCandidatesSince,
      countCandidates,
      mergeCandidateInto,
    });
  }

  return Object.freeze({ createCandidateRepo, TABLE });
});
