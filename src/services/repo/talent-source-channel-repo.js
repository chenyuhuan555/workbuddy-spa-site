;(function initTalentSourceChannelRepo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentSourceChannelRepo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentSourceChannelRepoModule() {
  'use strict';

  const TABLE = 'talent_source_channels';
  const ADMIN_LIST_RPC = 'admin_list_talent_source_channels';
  const ACTIVE_STATUS = 'active';
  const INACTIVE_STATUS = 'inactive';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function mapError(error) {
    const text = `${error?.code || ''} ${error?.message || ''}`;
    if (/23505|duplicate key|unique constraint|talent_source_channels_name/i.test(text)) {
      return appError('CHANNEL_NAME_CONFLICT', error);
    }
    if (/unauthorized|\b401\b|jwt/i.test(text)) return appError('AUTH_REQUIRED', error);
    if (/admin_or_editor_required|forbidden|row.level.security|\b403\b|42501/i.test(text)) {
      return appError('WRITE_FORBIDDEN', error);
    }
    return appError('BACKEND_REQUEST_FAILED', error);
  }

  function normalizeStatus(status) {
    const value = String(status || '').trim() || ACTIVE_STATUS;
    if (value !== ACTIVE_STATUS && value !== INACTIVE_STATUS) throw appError('INVALID_ARGUMENT');
    return value;
  }

  function normalizeSortOrder(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function toModel(row) {
    if (!row) return null;
    return {
      id: String(row.id || ''),
      name: String(row.name || ''),
      status: normalizeStatus(row.status),
      sortOrder: normalizeSortOrder(row.sort_order),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  }

  function createTalentSourceChannelRepo({ supabase, getProfile }) {
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

    async function listActive() {
      requireReader();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('status', ACTIVE_STATUS)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    async function listForManagement() {
      requireWriter();
      const { data, error } = await supabase.rpc(ADMIN_LIST_RPC);
      if (error) throw mapError(error);
      return (data || []).map(toModel);
    }

    async function create(channel) {
      requireWriter();
      const id = String(channel?.id || '').trim();
      const name = String(channel?.name || '').trim();
      if (!id || !name) throw appError('INVALID_ARGUMENT');
      const row = {
        id,
        name,
        status: normalizeStatus(channel?.status),
        sort_order: normalizeSortOrder(channel?.sortOrder),
      };
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw mapError(error);
      return toModel(row);
    }

    async function rename(id, name) {
      requireWriter();
      const channelId = String(id || '').trim();
      const nextName = String(name || '').trim();
      if (!channelId || !nextName) throw appError('INVALID_ARGUMENT');
      const { data, error, count } = await supabase
        .from(TABLE)
        .update({ name: nextName })
        .eq('id', channelId)
        .select('id');
      if (error) throw mapError(error);
      if ((count ?? data?.length ?? 0) < 1) throw appError('CHANNEL_NOT_FOUND_OR_FORBIDDEN');
      return { id: channelId, name: nextName };
    }

    async function setStatus(id, status) {
      requireWriter();
      const channelId = String(id || '').trim();
      if (!channelId) throw appError('INVALID_ARGUMENT');
      const nextStatus = normalizeStatus(status);
      const { data, error, count } = await supabase
        .from(TABLE)
        .update({ status: nextStatus })
        .eq('id', channelId)
        .select('id');
      if (error) throw mapError(error);
      if ((count ?? data?.length ?? 0) < 1) throw appError('CHANNEL_NOT_FOUND_OR_FORBIDDEN');
      return { id: channelId, status: nextStatus };
    }

    return Object.freeze({ listActive, listForManagement, create, rename, setStatus });
  }

  return Object.freeze({
    TABLE,
    ADMIN_LIST_RPC,
    ACTIVE_STATUS,
    INACTIVE_STATUS,
    createTalentSourceChannelRepo,
  });
});
