;(function initTalentFunnelAnalytics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelAnalyticsModule() {
  'use strict';

  const STAGES = Object.freeze(['imported', 'contacted', 'matched', 'interviewed', 'offered', 'hired']);
  const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((stage, index) => [stage, index])));

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function emptyCounts() {
    return {
      imported: 0,
      contacted: 0,
      matched: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
    };
  }

  function emptyAdjacentRates() {
    return {
      importedToContacted: null,
      contactedToMatched: null,
      matchedToInterviewed: null,
      interviewedToOffered: null,
      offeredToHired: null,
    };
  }

  function emptyCumulativeRates() {
    return {
      importedToContacted: null,
      importedToMatched: null,
      importedToInterviewed: null,
      importedToOffered: null,
      importedToHired: null,
    };
  }

  function safeRate(numerator, denominator) {
    if (!denominator) return null;
    return numerator / denominator;
  }

  function normalizeChannels(channels) {
    const list = Array.isArray(channels) ? channels : [];
    const seen = new Set();
    return list
      .map(channel => ({
        channelId: normalizeString(channel?.id || channel?.channelId),
        channelName: normalizeString(channel?.name || channel?.channelName),
      }))
      .filter(channel => {
        if (!channel.channelId || seen.has(channel.channelId)) return false;
        seen.add(channel.channelId);
        return true;
      });
  }

  function createStageFact() {
    return {
      dropCount: 0,
      reasonCounts: new Map(),
      channels: new Set(),
      positions: new Set(),
    };
  }

  function isFilteredEvent(event, companyId, baselineAtMs) {
    if (event?.isPilot !== true) return false;
    // companyId 为空表示「全部公司」：跨公司通配，不再按公司过滤
    if (companyId && normalizeString(event?.companyId) !== companyId) return false;
    const occurredAtMs = Date.parse(event?.occurredAt || '');
    if (!Number.isFinite(occurredAtMs)) return false;
    return occurredAtMs >= baselineAtMs;
  }

  function compareEvents(left, right) {
    const occurredAtDiff = Date.parse(left?.occurredAt || '') - Date.parse(right?.occurredAt || '');
    if (occurredAtDiff !== 0) return occurredAtDiff;
    const idDiff = normalizeString(left?.id).localeCompare(normalizeString(right?.id));
    if (idDiff !== 0) return idDiff;
    const channelDiff = normalizeString(left?.channelId).localeCompare(normalizeString(right?.channelId));
    if (channelDiff !== 0) return channelDiff;
    const positionDiff = normalizeString(left?.positionId).localeCompare(normalizeString(right?.positionId));
    if (positionDiff !== 0) return positionDiff;
    return normalizeString(left?.reasonCode).localeCompare(normalizeString(right?.reasonCode));
  }

  function pickCanonicalEvents(events, knownChannelIds) {
    const byKey = new Map();
    (Array.isArray(events) ? events : []).forEach(event => {
      const stage = normalizeString(event?.stage);
      const result = normalizeString(event?.result);
      const applicationId = normalizeString(event?.applicationId);
      const candidateId = normalizeString(event?.candidateId);
      const channelId = normalizeString(event?.channelId);
      const identity = applicationId || (stage === 'imported' ? candidateId : '');
      if (!identity || !STAGES.includes(stage) || !result || !knownChannelIds.has(channelId)) return;
      const key = `${identity}__${stage}__${result}`;
      const current = byKey.get(key);
      if (!current || compareEvents(event, current) < 0) {
        byKey.set(key, event);
      }
    });
    return Array.from(byKey.values());
  }

  function buildRates(counts) {
    return {
      adjacentRates: {
        importedToContacted: safeRate(counts.contacted, counts.imported),
        contactedToMatched: safeRate(counts.matched, counts.contacted),
        matchedToInterviewed: safeRate(counts.interviewed, counts.matched),
        interviewedToOffered: safeRate(counts.offered, counts.interviewed),
        offeredToHired: safeRate(counts.hired, counts.offered),
      },
      cumulativeRates: {
        importedToContacted: safeRate(counts.contacted, counts.imported),
        importedToMatched: safeRate(counts.matched, counts.imported),
        importedToInterviewed: safeRate(counts.interviewed, counts.imported),
        importedToOffered: safeRate(counts.offered, counts.imported),
        importedToHired: safeRate(counts.hired, counts.imported),
      },
    };
  }

  function resolveEventOwner(event, candidateOwnerById, applicationCandidateById) {
    const candidateId = normalizeString(event?.candidateId)
      || normalizeString((applicationCandidateById || {})[normalizeString(event?.applicationId)]);
    if (!candidateId || !candidateOwnerById) return '';
    return normalizeString(candidateOwnerById[candidateId]);
  }

  function buildTalentFunnelAnalytics({
    events = [],
    channels = [],
    companyId,
    baselineAt,
    owner = '',
    candidateOwnerById = null,
    applicationCandidateById = null,
  } = {}) {
    const normalizedCompanyId = normalizeString(companyId);
    const baselineAtMs = Date.parse(baselineAt || '');
    const normalizedChannels = normalizeChannels(channels);
    const channelMap = new Map(normalizedChannels.map(channel => [channel.channelId, channel]));
    const knownChannelIds = new Set(channelMap.keys());
    const countsByChannel = new Map(normalizedChannels.map(channel => [channel.channelId, emptyCounts()]));
    const successTotals = emptyCounts();
    const failureTotals = emptyCounts();
    const stageFacts = new Map(STAGES.map(stage => [stage, createStageFact()]));

    if (!Number.isFinite(baselineAtMs)) {
      return {
        channels: normalizedChannels.map(channel => ({
          ...channel,
          counts: emptyCounts(),
          adjacentRates: emptyAdjacentRates(),
          cumulativeRates: emptyCumulativeRates(),
        })),
        bottlenecks: [],
      };
    }

    const filteredEvents = (Array.isArray(events) ? events : [])
      .filter(event => isFilteredEvent(event, normalizedCompanyId, baselineAtMs));
    const canonicalEvents = pickCanonicalEvents(filteredEvents, knownChannelIds);

    canonicalEvents.forEach(event => {
      // 顾问维度过滤：解析事件归属顾问，不匹配则跳过计数（含成功与失败）
      if (owner) {
        const eventOwner = resolveEventOwner(event, candidateOwnerById, applicationCandidateById);
        if (eventOwner !== normalizeString(owner)) return;
      }
      const stage = normalizeString(event?.stage);
      const result = normalizeString(event?.result);
      const channelId = normalizeString(event?.channelId);

      if (result === 'success') {
        countsByChannel.get(channelId)[stage] += 1;
        successTotals[stage] += 1;
        return;
      }

      if (result === 'failed') {
        const fact = stageFacts.get(stage);
        if (!fact) return;
        failureTotals[stage] += 1;
        fact.dropCount += 1;
        const reasonCode = normalizeString(event?.reasonCode) || 'unknown';
        fact.reasonCounts.set(reasonCode, (fact.reasonCounts.get(reasonCode) || 0) + 1);
        if (channelId) fact.channels.add(channelId);
        const positionId = normalizeString(event?.positionId);
        if (positionId) fact.positions.add(positionId);
      }
    });

    const channelAnalytics = normalizedChannels.map(channel => {
      const counts = countsByChannel.get(channel.channelId) || emptyCounts();
      const rates = buildRates(counts);
      return {
        channelId: channel.channelId,
        channelName: channel.channelName,
        counts,
        adjacentRates: rates.adjacentRates,
        cumulativeRates: rates.cumulativeRates,
      };
    });

    const bottlenecks = STAGES
      .map(stage => {
        const fact = stageFacts.get(stage);
        if (!fact || fact.dropCount < 1) return null;
        return {
          stage,
          dropCount: fact.dropCount,
          dropRate: safeRate(fact.dropCount, successTotals[stage] + failureTotals[stage]),
          reasonCounts: Array.from(fact.reasonCounts.entries())
            .map(([reasonCode, count]) => ({ reasonCode, count }))
            .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode)),
          channelCount: fact.channels.size,
          positionCount: fact.positions.size,
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        right.dropCount - left.dropCount
        || (right.dropRate || 0) - (left.dropRate || 0)
        || STAGE_INDEX[left.stage] - STAGE_INDEX[right.stage]);

    return {
      channels: channelAnalytics,
      bottlenecks,
    };
  }

  return Object.freeze({
    STAGES,
    buildTalentFunnelAnalytics,
  });
});
