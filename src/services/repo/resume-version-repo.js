;(function initResumeVersionRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeVersionRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeVersionRepoModule() {
  'use strict';

  const TABLE = 'resume_versions';
  const LARGE_TEXT_FIELDS = new Set([
    'rawText', 'formattedText', 'fileData', 'electronicResumeText',
    'resumeText', 'bossImportedText',
  ]);
  const ROW_FIELDS = new Set([
    'id', 'candidateId', 'sourceResumeId', 'fileName', 'fileId', 'fileType', 'fileSize',
    'fileHash', 'cloudFilePath', 'originalFileStatus', 'originalFileError',
    'originalFileSyncedAt', 'uploadedAt', 'aiStage', 'formatStatus', 'formatErrorCode',
    'formatError', 'formattedAt', 'createdAt', 'updatedAt', 'deletedAt',
  ]);
  const FIELD_MAP = Object.freeze({
    candidateId: 'candidate_id', sourceResumeId: 'source_resume_id', fileName: 'file_name',
    fileId: 'file_id', fileType: 'file_type', fileSize: 'file_size', fileHash: 'file_hash',
    cloudFilePath: 'cloud_file_path', originalFileStatus: 'original_file_status',
    originalFileError: 'original_file_error', originalFileSyncedAt: 'original_file_synced_at',
    uploadedAt: 'uploaded_at', aiStage: 'ai_stage', formatStatus: 'format_status',
    formatErrorCode: 'format_error_code', formatError: 'format_error', formattedAt: 'formatted_at',
    createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
  });

  function appError(code, cause, message = code) {
    const error = new Error(message);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function mapError(error) {
    const text = `${error?.code || ''} ${error?.message || ''}`;
    if (/unauthorized|\b401\b|jwt/i.test(text)) return appError('AUTH_REQUIRED', error);
    if (/forbidden|row.level.security|\b403\b|42501/i.test(text)) return appError('WRITE_FORBIDDEN', error);
    const reason = String(error?.message || error?.details || error?.hint || '').trim();
    const safeReason = reason && reason.length <= 240 ? reason : '云端数据库拒绝了本次写入';
    return appError('BACKEND_REQUEST_FAILED', error, `BACKEND_REQUEST_FAILED: ${safeReason}`);
  }

  function createResumeVersionRepo({ supabase, getProfile }) {
    function normalizeTimestamp(value) {
      if (value == null || value === '') return null;
      const date = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
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

    function extraFields(version) {
      const extra = {};
      Object.keys(version || {}).forEach(key => {
        if (ROW_FIELDS.has(key) || LARGE_TEXT_FIELDS.has(key)) return;
        extra[key] = version[key];
      });
      return extra;
    }

    function toRow(candidateId, version) {
      if (!candidateId || !version?.id) throw appError('INVALID_ARGUMENT');
      const row = {
        id: String(version.id),
        candidate_id: String(candidateId),
        workspace_id: 'main',
        source_resume_id: version.sourceResumeId != null ? String(version.sourceResumeId) : null,
        file_name: version.fileName != null ? String(version.fileName) : null,
        file_id: version.fileId != null ? String(version.fileId) : null,
        file_type: version.fileType != null ? String(version.fileType) : null,
        file_size: version.fileSize != null ? Number(version.fileSize) : null,
        file_hash: version.fileHash != null ? String(version.fileHash) : null,
        cloud_file_path: version.cloudFilePath != null ? String(version.cloudFilePath) : null,
        original_file_status: version.originalFileStatus != null ? String(version.originalFileStatus) : null,
        original_file_error: version.originalFileError != null ? String(version.originalFileError) : null,
        original_file_synced_at: normalizeTimestamp(version.originalFileSyncedAt),
        uploaded_at: normalizeTimestamp(version.uploadedAt),
        ai_stage: version.aiStage != null ? String(version.aiStage) : null,
        format_status: version.formatStatus != null ? String(version.formatStatus) : null,
        format_error_code: version.formatErrorCode != null ? String(version.formatErrorCode) : null,
        format_error: version.formatError != null ? String(version.formatError) : null,
        formatted_at: normalizeTimestamp(version.formattedAt),
        extra: extraFields(version),
      };
      const createdAt = normalizeTimestamp(version.createdAt);
      const updatedAt = normalizeTimestamp(version.updatedAt);
      const deletedAt = normalizeTimestamp(version.deletedAt);
      if (createdAt) row.created_at = createdAt;
      if (updatedAt) row.updated_at = updatedAt;
      if (deletedAt) row.deleted_at = deletedAt;
      return row;
    }

    function toModel(row) {
      if (!row) return null;
      const model = Object.assign({}, row.extra && typeof row.extra === 'object' ? row.extra : {});
      Object.entries(FIELD_MAP).forEach(([field, column]) => {
        if (row[column] !== undefined) model[field] = row[column];
      });
      model.id = row.id;
      model.candidateId = row.candidate_id;
      if (model.fileSize != null) model.fileSize = Number(model.fileSize);
      return model;
    }

    async function upsertVersionRows(versionRows) {
      requireWriter();
      const rows = (versionRows || []).map(item => toRow(item?.candidateId, item?.version));
      if (!rows.length) return 0;
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
      if (error) throw mapError(error);
      return rows.length;
    }

    async function upsertVersions(candidateId, versions) {
      return upsertVersionRows((versions || []).map(version => ({ candidateId, version })));
    }

    async function listVersionsPage(offset = 0, limit = 500, candidateIds = []) {
      requireReader();
      const safeOffset = Math.max(0, Number(offset) || 0);
      const safeLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('workspace_id', 'main')
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true });
      const ids = (candidateIds || []).map(String).filter(Boolean);
      if (ids.length) query = query.in('candidate_id', ids);
      const { data, error } = await query.range(safeOffset, safeOffset + safeLimit - 1);
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    async function listAllVersions(pageSize = 500) {
      const safePageSize = Math.min(500, Math.max(1, Number(pageSize) || 500));
      const rows = [];
      let page = [];
      do {
        page = await listVersionsPage(rows.length, safePageSize);
        rows.push(...page);
      } while (page.length === safePageSize);
      return rows;
    }

    async function countVersions() {
      requireReader();
      const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true });
      if (error) throw mapError(error);
      return count || 0;
    }

    return Object.freeze({ upsertVersions, upsertVersionRows, listVersionsPage, listAllVersions, countVersions });
  }

  return Object.freeze({ createResumeVersionRepo, TABLE });
});
