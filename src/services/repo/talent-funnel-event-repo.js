;(function initTalentFunnelEventRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelEventRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelEventRepoModule() {
  'use strict';

  const TABLE = 'talent_funnel_events';

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

  function normalizeBoolean(value) {
    return value === true;
  }

  function toModel(row) {
    if (!row) return null;
    return {
      id: normalizeString(row.id),
      companyId: normalizeString(row.company_id),
      positionId: normalizeString(row.position_id),
      candidateId: normalizeString(row.candidate_id),
      applicationId: normalizeString(row.application_id),
      channelId: normalizeString(row.channel_id),
      stage: normalizeString(row.stage),
      occurredAt: row.occurred_at || '',
      result: normalizeString(row.result),
      reasonCode: normalizeString(row.reason_code),
      reasonNote: normalizeString(row.reason_note),
      actorId: normalizeString(row.actor_id),
      isPilot: normalizeBoolean(row.is_pilot),
      createdAt: row.created_at || '',
    };
  }

  function createTalentFunnelEventRepo({ supabase, getProfile }) {
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

    async function appendEvent(event) {
      requireWriter();
      const id = normalizeString(event?.id);
      const stage = normalizeString(event?.stage);
      if (!id || !stage) throw appError('INVALID_ARGUMENT');
      const row = {
        id,
        company_id: normalizeString(event?.companyId) || null,
        position_id: normalizeString(event?.positionId) || null,
        candidate_id: normalizeString(event?.candidateId) || null,
        application_id: normalizeString(event?.applicationId) || null,
        channel_id: normalizeString(event?.channelId) || null,
        stage,
        occurred_at: event?.occurredAt || null,
        result: normalizeString(event?.result) || null,
        reason_code: normalizeString(event?.reasonCode),
        reason_note: normalizeString(event?.reasonNote),
        is_pilot: normalizeBoolean(event?.isPilot),
      };
      if (!row.occurred_at) delete row.occurred_at;
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw mapError(error);
      return toModel({
        ...row,
        company_id: row.company_id || '',
        position_id: row.position_id || '',
        candidate_id: row.candidate_id || '',
        application_id: row.application_id || '',
        channel_id: row.channel_id || '',
        result: row.result || '',
        reason_code: row.reason_code || '',
        reason_note: row.reason_note || '',
        actor_id: '',
        occurred_at: row.occurred_at || '',
        created_at: row.created_at || '',
      });
    }

    async function listEventsByCompany(companyId) {
      requireReader();
      const id = normalizeString(companyId);
      if (!id) throw appError('INVALID_ARGUMENT');
      const { data, error } = await supabase.from(TABLE).select('*')
        .eq('company_id', id)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    async function listEventsByCompanyAndChannel(companyId, channelId) {
      requireReader();
      const company = normalizeString(companyId);
      const channel = normalizeString(channelId);
      if (!company || !channel) throw appError('INVALID_ARGUMENT');
      const { data, error } = await supabase.from(TABLE).select('*')
        .eq('company_id', company)
        .eq('channel_id', channel)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    return Object.freeze({
      appendEvent,
      listEventsByCompany,
      listEventsByCompanyAndChannel,
    });
  }

  return Object.freeze({
    TABLE,
    createTalentFunnelEventRepo,
  });
});
