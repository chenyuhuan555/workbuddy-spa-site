;(function initQuantumRadarRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyQuantumRadarRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createQuantumRadarRepoModule() {
  'use strict';

  const TABLES = Object.freeze({ companies: 'quantum_radar_companies', jobs: 'external_jobs', talents: 'talent_leads', sources: 'quantum_company_sources', tasks: 'quantum_crawl_tasks' });
  const CONTRACTS = Object.freeze({
    companies: { name: 'name', domain: 'domain', hiringStatus: 'hiring_status', jobCount: 'job_count', focus: 'focus', source: 'source' },
    jobs: { title: 'title', company: 'company', location: 'location', quantumDomain: 'quantum_domain', score: 'score', status: 'status', postedDays: 'posted_days', source: 'source', sourceUrl: 'source_url', publishedAt: 'published_at', positionId: 'position_id' },
    talents: { name: 'name', institution: 'institution', researchDirection: 'research_direction', matchedJobs: 'matched_jobs', matchScore: 'match_score', stage: 'stage', source: 'source', candidateId: 'candidate_id' },
    sources: { companyId: 'company_id', sourceType: 'source_type', sourceUrl: 'source_url', enabled: 'enabled', lastCrawledAt: 'last_crawled_at' },
    tasks: { name: 'name', status: 'status', lastRunAt: 'last_run_at', source: 'source', resultCount: 'result_count', errorMessage: 'error_message' },
  });

  function appError(code, cause) { const error = new Error(code); error.code = code; error.cause = cause; return error; }
  function requireProfile(getProfile) {
    const profile = typeof getProfile === 'function' ? getProfile() : null;
    if (!profile || profile.status !== 'active') throw appError('AUTH_REQUIRED');
    return profile;
  }
  function toRow(kind, model) {
    const contract = CONTRACTS[kind];
    if (!contract || !model?.id) throw appError('INVALID_ARGUMENT');
    const row = { id: String(model.id), workspace_id: 'main', extra: {} };
    Object.entries(contract).forEach(([field, column]) => { if (model[field] !== undefined) row[column] = model[field]; });
    Object.keys(model).forEach(key => { if (key !== 'id' && !Object.prototype.hasOwnProperty.call(contract, key)) row.extra[key] = model[key]; });
    return row;
  }
  function toModel(kind, row) {
    const contract = CONTRACTS[kind];
    if (!contract || !row) return null;
    const model = Object.assign({}, row.extra && typeof row.extra === 'object' ? row.extra : {}, { id: row.id });
    Object.entries(contract).forEach(([field, column]) => { if (row[column] !== undefined) model[field] = row[column]; });
    if (kind === 'jobs' || kind === 'talents') { if (model.score != null) model.score = Number(model.score); if (model.matchScore != null) model.matchScore = Number(model.matchScore); }
    return model;
  }

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();
  }
  function textScore(left, right) {
    const a = normalizeSearchText(left);
    const b = normalizeSearchText(right);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;
    const aTokens = new Set(a.split(/\s+/).filter(Boolean));
    const bTokens = new Set(b.split(/\s+/).filter(Boolean));
    const overlap = [...aTokens].filter(token => bTokens.has(token)).length;
    return overlap ? Math.round((overlap / Math.max(aTokens.size, bTokens.size)) * 70) : 0;
  }
  function suggestJobPositions(job, positions, companyNameById = {}) {
    const sourceTitle = job?.title || '';
    const sourceCompany = job?.company || '';
    return (Array.isArray(positions) ? positions : []).filter(Boolean).map(position => {
      const titleScore = textScore(sourceTitle, position.title);
      const companyScore = textScore(sourceCompany, companyNameById[position.companyId] || position.company || '');
      const score = Math.min(99, Math.round(titleScore * 0.7 + companyScore * 0.3));
      return { item: position, score, reason: titleScore >= 80 ? '岗位名称高度匹配' : companyScore >= 80 ? '公司高度匹配' : '岗位信息部分匹配' };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  }
  function suggestTalentCandidates(talent, candidates) {
    const sourceName = talent?.name || '';
    const sourceDirection = talent?.researchDirection || '';
    return (Array.isArray(candidates) ? candidates : []).filter(Boolean).map(candidate => {
      const nameScore = textScore(sourceName, candidate.name);
      const profileText = [candidate.skills, candidate.directions, candidate.summary, candidate.currentCompany].flat().join(' ');
      const directionScore = textScore(sourceDirection, profileText);
      const score = Math.min(99, Math.round(nameScore * 0.65 + directionScore * 0.35));
      return { item: candidate, score, reason: nameScore >= 80 ? '姓名高度匹配' : directionScore >= 40 ? '方向/技能部分匹配' : '候选人信息部分匹配' };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  }

  function createQuantumRadarRepo({ supabase, getProfile, cloudEnabled = false } = {}) {
    async function list(kind, { limit = 500 } = {}) {
      if (!cloudEnabled) throw appError('CLOUD_READ_DISABLED');
      requireProfile(getProfile);
      if (!TABLES[kind]) throw appError('INVALID_ARGUMENT');
      const safeLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      const { data, error } = await supabase.from(TABLES[kind]).select('*').eq('workspace_id', 'main').is('deleted_at', null).order('updated_at', { ascending: false }).limit(safeLimit);
      if (error) throw appError('BACKEND_REQUEST_FAILED', error);
      return (data || []).map(row => toModel(kind, row));
    }
    async function upsert(kind, models) {
      if (!cloudEnabled) throw appError('CLOUD_WRITE_DISABLED');
      const profile = requireProfile(getProfile);
      if (!['admin', 'editor'].includes(profile.role) || !TABLES[kind]) throw appError('WRITE_REQUIRED');
      const rows = (Array.isArray(models) ? models : []).map(model => toRow(kind, model));
      if (!rows.length) return 0;
      const { error } = await supabase.from(TABLES[kind]).upsert(rows, { onConflict: 'id' });
      if (error) throw appError('BACKEND_REQUEST_FAILED', error);
      return rows.length;
    }
    async function linkJobToPosition(jobId, positionId) {
      if (!cloudEnabled) throw appError('CLOUD_WRITE_DISABLED');
      const profile = requireProfile(getProfile);
      if (!['admin', 'editor'].includes(profile.role)) throw appError('WRITE_REQUIRED');
      const id = String(jobId || '').trim();
      const target = String(positionId || '').trim();
      if (!id || !target) throw appError('INVALID_ARGUMENT');
      const { error } = await supabase.from(TABLES.jobs).update({ position_id: target, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', 'main');
      if (error) throw appError('BACKEND_REQUEST_FAILED', error);
      return { jobId: id, positionId: target };
    }
    async function linkTalentToCandidate(talentId, candidateId) {
      if (!cloudEnabled) throw appError('CLOUD_WRITE_DISABLED');
      const profile = requireProfile(getProfile);
      if (!['admin', 'editor'].includes(profile.role)) throw appError('WRITE_REQUIRED');
      const id = String(talentId || '').trim();
      const target = String(candidateId || '').trim();
      if (!id || !target) throw appError('INVALID_ARGUMENT');
      const { error } = await supabase.from(TABLES.talents).update({ candidate_id: target, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', 'main');
      if (error) throw appError('BACKEND_REQUEST_FAILED', error);
      return { talentId: id, candidateId: target };
    }
    return Object.freeze({ list, upsert, linkJobToPosition, linkTalentToCandidate, cloudEnabled });
  }
  return Object.freeze({ TABLES, CONTRACTS, createQuantumRadarRepo, normalizeSearchText, textScore, suggestJobPositions, suggestTalentCandidates });
});
