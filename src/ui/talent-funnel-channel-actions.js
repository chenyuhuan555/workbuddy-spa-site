;(function initTalentFunnelChannelActions(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelChannelActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelChannelActionsModule() {
  'use strict';

  const ACTIVE_STATUS = 'active';
  const INACTIVE_STATUS = 'inactive';
  let generatedIdSeed = 0;

  function codeError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function normalizeName(value) {
    return String(value || '').trim();
  }

  function nameKey(value) {
    return normalizeName(value).toLocaleLowerCase();
  }

  function defaultCreateId() {
    generatedIdSeed += 1;
    return `channel_${Date.now().toString(36)}_${generatedIdSeed.toString(36)}`;
  }

  function mapActionError(error) {
    const code = error?.code || error?.message || 'CHANNEL_BACKEND_ERROR';
    if (/^CHANNEL_/.test(code)) return error;
    if (code === 'AUTH_REQUIRED' || code === 'ACCOUNT_DISABLED' || code === 'WRITE_REQUIRED' || code === 'WRITE_FORBIDDEN') {
      return codeError('CHANNEL_PERMISSION_DENIED', error);
    }
    if (code === 'INVALID_ARGUMENT') return codeError('CHANNEL_INVALID_ARGUMENT', error);
    return codeError('CHANNEL_BACKEND_ERROR', error);
  }

  function resolveChannelId(channelOrId) {
    if (channelOrId && typeof channelOrId === 'object') return String(channelOrId.id || '').trim();
    return String(channelOrId || '').trim();
  }

  function ensureName(name) {
    const normalized = normalizeName(name);
    if (!normalized) throw codeError('CHANNEL_NAME_REQUIRED');
    return normalized;
  }

  function ensureUniqueName(channels, name, currentId = '') {
    const expected = nameKey(name);
    const duplicate = (Array.isArray(channels) ? channels : []).find(item =>
      item
      && String(item.id || '') !== String(currentId || '')
      && nameKey(item.name) === expected,
    );
    if (duplicate) throw codeError('CHANNEL_NAME_EXISTS');
  }

  function nextSortOrder(channels) {
    const max = (Array.isArray(channels) ? channels : []).reduce((result, item) => {
      const value = Number(item?.sortOrder);
      return Number.isFinite(value) && value > result ? value : result;
    }, 0);
    return max + 10;
  }

  function createTalentFunnelChannelActions({ repo, createId = defaultCreateId } = {}) {
    if (!repo || typeof repo.listForManagement !== 'function' || typeof repo.create !== 'function' || typeof repo.rename !== 'function' || typeof repo.setStatus !== 'function') {
      throw codeError('INVALID_ARGUMENT');
    }

    async function createChannel(input = {}) {
      try {
        const draft = typeof input === 'string' ? { name: input } : (input || {});
        const name = ensureName(draft.name);
        const channels = await repo.listForManagement();
        ensureUniqueName(channels, name);
        const id = String(draft.id || createId({ name, channels }) || '').trim();
        if (!id) throw codeError('CHANNEL_INVALID_ARGUMENT');
        const sortOrder = draft.sortOrder != null ? Number(draft.sortOrder) : nextSortOrder(channels);
        return await repo.create({
          id,
          name,
          status: ACTIVE_STATUS,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : nextSortOrder(channels),
        });
      } catch (error) {
        throw mapActionError(error);
      }
    }

    async function renameChannel(channelOrId, nextName) {
      try {
        const channelId = resolveChannelId(channelOrId);
        if (!channelId) throw codeError('CHANNEL_INVALID_ARGUMENT');
        const name = ensureName(nextName);
        const channels = await repo.listForManagement();
        ensureUniqueName(channels, name, channelId);
        return await repo.rename(channelId, name);
      } catch (error) {
        throw mapActionError(error);
      }
    }

    async function toggleChannel(channelOrId, enabled = null) {
      try {
        const channelId = resolveChannelId(channelOrId);
        if (!channelId) throw codeError('CHANNEL_INVALID_ARGUMENT');
        let nextStatus = enabled === true ? ACTIVE_STATUS : enabled === false ? INACTIVE_STATUS : '';
        if (!nextStatus) {
          const currentStatus = normalizeName(channelOrId?.status) || ACTIVE_STATUS;
          nextStatus = currentStatus === ACTIVE_STATUS ? INACTIVE_STATUS : ACTIVE_STATUS;
        }
        return await repo.setStatus(channelId, nextStatus);
      } catch (error) {
        throw mapActionError(error);
      }
    }

    return Object.freeze({ createChannel, renameChannel, toggleChannel });
  }

  return Object.freeze({
    ACTIVE_STATUS,
    INACTIVE_STATUS,
    createTalentFunnelChannelActions,
  });
});
