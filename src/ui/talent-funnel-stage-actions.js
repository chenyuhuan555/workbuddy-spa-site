;(function initTalentFunnelStageActions(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelStageActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelStageActionsModule(root) {
  'use strict';

  const CANONICAL_STAGES = Object.freeze(['imported', 'contacted', 'matched', 'interviewed', 'offered', 'hired']);
  const STAGE_MAP = Object.freeze({
    discovered: 'imported',
    contacted: 'contacted',
    responded: 'contacted',
    screening: 'matched',
    to_recommend: 'matched',
    recommended: 'matched',
    client_accepted: 'matched',
    interview_pending: 'interviewed',
    interviewing: 'interviewed',
    interview_passed: 'interviewed',
    offer: 'offered',
    offer_accepted: 'offered',
    preboarding: 'offered',
    onboarded: 'hired',
    probation: 'hired',
    regularized: 'hired',
  });

  function codeError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function fallbackIsCompanyInPilot(companyId, scope) {
    const id = normalizeString(companyId);
    if (!id) return false;
    const direct = Array.isArray(scope?.companyIds) ? scope.companyIds : [];
    return direct.map(normalizeString).filter(Boolean).includes(id);
  }

  function fallbackIsEventInPilot(event, scope) {
    const baselineAt = Date.parse(scope?.baselineAt || '');
    const occurredAt = Date.parse(event?.occurredAt || '');
    if (!Number.isFinite(baselineAt) || !Number.isFinite(occurredAt)) return false;
    if (!fallbackIsCompanyInPilot(event?.companyId, scope)) return false;
    return occurredAt >= baselineAt;
  }

  function isEventInPilot(event, scope) {
    const activeScopeApi = root.WorkBuddyTalentFunnelScope;
    if (activeScopeApi && typeof activeScopeApi.isEventInPilot === 'function') {
      return activeScopeApi.isEventInPilot(event, scope);
    }
    return fallbackIsEventInPilot(event, scope);
  }

  function canonicalStageFor(stage) {
    return STAGE_MAP[normalizeString(stage)] || '';
  }

  function isFailureTransition(toStage) {
    return normalizeString(toStage) === 'closed';
  }

  function buildEventStage(application, toStage) {
    if (isFailureTransition(toStage)) return canonicalStageFor(application?.stage);
    return canonicalStageFor(toStage);
  }

  function buildEventResult(toStage) {
    return isFailureTransition(toStage) ? 'failed' : 'success';
  }

  function validateTransition(application, input) {
    const toStage = normalizeString(input?.toStage);
    const eventStage = buildEventStage(application, toStage);
    if (!eventStage || !CANONICAL_STAGES.includes(eventStage)) throw codeError('FUNNEL_STAGE_INVALID');
    if (eventStage === 'matched' && !isFailureTransition(toStage) && input?.manualConfirmed !== true) {
      throw codeError('FUNNEL_MATCH_CONFIRM_REQUIRED');
    }
    const reasonCode = normalizeString(input?.reasonCode);
    const reasonNote = normalizeString(input?.reasonNote);
    if (isFailureTransition(toStage)) {
      if (!reasonCode) throw codeError('FUNNEL_REASON_REQUIRED');
      if (reasonCode === 'other' && !reasonNote) throw codeError('FUNNEL_REASON_NOTE_REQUIRED');
    }
    return { toStage, eventStage, reasonCode, reasonNote, result: buildEventResult(toStage) };
  }

  function makeEventId(applicationId, stage, occurredAt) {
    const encodedTime = Date.parse(occurredAt || '') || Date.now();
    return `funnel_evt_${normalizeString(applicationId) || 'unknown'}_${stage}_${encodedTime.toString(36)}`;
  }

  function createTalentFunnelStageActions({
    getEventRepo = () => null,
    getScope = () => ({}),
    applyStageChange,
    now = () => new Date().toISOString(),
  } = {}) {
    if (typeof applyStageChange !== 'function') throw codeError('INVALID_ARGUMENT');

    async function loadExistingEvents(application, channelId) {
      const repo = getEventRepo();
      if (!repo) return [];
      if (channelId && typeof repo.listEventsByCompanyAndChannel === 'function') {
        return await repo.listEventsByCompanyAndChannel(application.companyId, channelId);
      }
      if (typeof repo.listEventsByCompany === 'function') {
        return await repo.listEventsByCompany(application.companyId);
      }
      return [];
    }

    async function appendPilotEventIfNeeded(application, input, transition, occurredAt) {
      const eventPayload = {
        companyId: normalizeString(application?.companyId),
        positionId: normalizeString(application?.positionId),
        candidateId: normalizeString(application?.candidateId),
        applicationId: normalizeString(application?.id),
        channelId: normalizeString(input?.channelId),
        stage: transition.eventStage,
        occurredAt,
      };
      if (!isEventInPilot(eventPayload, getScope())) return { eventAppended: false, skipped: 'out_of_pilot' };
      const repo = getEventRepo();
      if (!repo || typeof repo.appendEvent !== 'function') throw codeError('FUNNEL_EVENT_WRITE_FAILED');

      const existing = await loadExistingEvents(application, eventPayload.channelId);
      const duplicated = existing.some(event =>
        normalizeString(event?.applicationId) === eventPayload.applicationId
        && normalizeString(event?.stage) === eventPayload.stage
        && normalizeString(event?.result || 'success') === 'success',
      );
      if (duplicated && transition.result === 'success') return { eventAppended: false, skipped: 'duplicate_success' };

      try {
        const event = await repo.appendEvent({
          id: makeEventId(eventPayload.applicationId, eventPayload.stage, occurredAt),
          ...eventPayload,
          result: transition.result,
          reasonCode: transition.reasonCode,
          reasonNote: transition.reasonNote,
          isPilot: true,
        });
        return { eventAppended: true, event };
      } catch (error) {
        throw codeError('FUNNEL_EVENT_WRITE_FAILED', error);
      }
    }

    async function changeStage(application, input = {}) {
      if (!application || !application.id) throw codeError('FUNNEL_APPLICATION_REQUIRED');
      const occurredAt = normalizeString(input?.occurredAt) || now();
      const transition = validateTransition(application, input);
      const appendResult = await appendPilotEventIfNeeded(application, input, transition, occurredAt);
      applyStageChange(application, {
        toStage: transition.toStage,
        reasonCode: transition.reasonCode,
        reasonNote: transition.reasonNote,
        occurredAt,
      });
      return {
        ok: true,
        eventAppended: appendResult.eventAppended === true,
        event: appendResult.event || null,
      };
    }

    return Object.freeze({
      CANONICAL_STAGES,
      STAGE_MAP,
      canonicalStageFor,
      changeStage,
    });
  }

  return Object.freeze({
    CANONICAL_STAGES,
    STAGE_MAP,
    createTalentFunnelStageActions,
  });
});
