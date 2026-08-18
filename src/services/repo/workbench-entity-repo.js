;(function initWorkbenchEntityRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyWorkbenchEntityRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createWorkbenchEntityRepoModule() {
  'use strict';

  const TABLES = Object.freeze({ companies: 'companies', positions: 'positions', applications: 'applications' });
  const LARGE_FIELDS = new Set(['rawText', 'formattedText', 'fileData', 'electronicResumeText', 'resumeText', 'bossImportedText']);
  const CONTRACTS = Object.freeze({
    companies: Object.freeze({
      name: 'name', status: 'status', owner: 'owner', profileText: 'profile_text',
      industry: 'industry', website: 'website', city: 'city', source: 'source',
      createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
    }),
    positions: Object.freeze({
      companyId: 'company_id', title: 'title', status: 'status', owner: 'owner',
      description: 'jd_text', city: 'city', salary: 'salary', requirements: 'requirements',
      createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
    }),
    applications: Object.freeze({
      candidateId: 'candidate_id', positionId: 'position_id', companyId: 'company_id',
      owner: 'owner', stage: 'stage', stageEnteredAt: 'stage_entered_at', pipelineEvents: 'pipeline_events',
      matchScore: 'match_score', matchReason: 'match_reason', evaluation: 'evaluation',
      clientReport: 'client_report', note: 'note', status: 'status',
      createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
    }),
  });

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

  function contractFor(kind) {
    if (!CONTRACTS[kind]) throw appError('INVALID_ARGUMENT');
    return CONTRACTS[kind];
  }

  function createWorkbenchEntityRepo({ supabase, getProfile }) {
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

    function toRow(kind, model) {
      const contract = contractFor(kind);
      if (!model || !model.id) throw appError('INVALID_ARGUMENT');
      const row = { id: String(model.id), workspace_id: 'main', extra: {} };
      Object.entries(contract).forEach(([field, column]) => {
        if (field === 'companyId' || field === 'positionId' || field === 'applicationId') return;
        if (model[field] !== undefined) row[column] = model[field];
      });
      if (kind === 'companies') row.name = String(model.name || '');
      if (kind === 'positions') {
        row.company_id = model.companyId != null ? String(model.companyId) : null;
        row.title = String(model.title || '');
      }
      if (kind === 'applications') {
        row.candidate_id = model.candidateId != null ? String(model.candidateId) : null;
        row.position_id = model.positionId != null ? String(model.positionId) : null;
        row.company_id = model.companyId != null ? String(model.companyId) : null;
      }
      Object.keys(model).forEach(key => {
        if (key === 'id' || LARGE_FIELDS.has(key) || Object.prototype.hasOwnProperty.call(contract, key)) return;
        row.extra[key] = model[key];
      });
      return row;
    }

    function toModel(kind, row) {
      const contract = contractFor(kind);
      if (!row) return null;
      const model = Object.assign({}, row.extra && typeof row.extra === 'object' ? row.extra : {});
      Object.entries(contract).forEach(([field, column]) => {
        if (row[column] !== undefined) model[field] = row[column];
      });
      model.id = row.id;
      if (kind === 'companies') model.name = row.name || '';
      if (kind === 'positions') {
        model.companyId = row.company_id || '';
        model.title = row.title || '';
      }
      if (kind === 'applications') {
        model.candidateId = row.candidate_id || '';
        model.positionId = row.position_id || '';
        model.companyId = row.company_id || '';
      }
      if (model.matchScore != null) model.matchScore = Number(model.matchScore);
      return model;
    }

    async function upsertMany(kind, models) {
      requireWriter();
      const rows = (models || []).map(model => toRow(kind, model));
      if (!rows.length) return 0;
      const { error } = await supabase.from(TABLES[kind]).upsert(rows, { onConflict: 'id' });
      if (error) throw mapError(error);
      return rows.length;
    }

    async function listPage(kind, offset = 0, limit = 500) {
      requireReader();
      contractFor(kind);
      const safeOffset = Math.max(0, Number(offset) || 0);
      const safeLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      const { data, error } = await supabase.from(TABLES[kind]).select('*')
        .eq('workspace_id', 'main')
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(safeOffset, safeOffset + safeLimit - 1);
      if (error) throw mapError(error);
      return (data || []).map(row => toModel(kind, row));
    }

    async function listAll(kind, pageSize = 500) {
      contractFor(kind);
      const safePageSize = Math.min(500, Math.max(1, Number(pageSize) || 500));
      const rows = [];
      let page = [];
      do {
        page = await listPage(kind, rows.length, safePageSize);
        rows.push(...page);
      } while (page.length === safePageSize);
      return rows;
    }

    async function listSince(kind, cursor = null, limit = 500) {
      requireReader();
      contractFor(kind);
      const safeLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      let query = supabase.from(TABLES[kind]).select('*')
        .eq('workspace_id', 'main')
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(safeLimit);
      if (cursor) query = query.gt('updated_at', cursor);
      const { data, error } = await query;
      if (error) throw mapError(error);
      return (data || []).map(row => toModel(kind, row));
    }

    return Object.freeze({ upsertMany, listPage, listAll, listSince });
  }

  return Object.freeze({ TABLES, CONTRACTS, createWorkbenchEntityRepo });
});
