;(function initCandidateReadPath(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateReadPath = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateReadPathModule() {
  'use strict';

  const LOCAL_PAYLOAD_FIELDS = [
    'rawText', 'formattedText', 'fileData', 'electronicResumeText',
    'resumeText', 'bossImportedText',
  ];
  const FINGERPRINT_IGNORED_FIELDS = new Set([
    ...LOCAL_PAYLOAD_FIELDS,
    'createdAt', 'updatedAt', 'deletedAt',
  ]);
  const CANDIDATE_STRING_FIELDS = [
    'id', 'name', 'phone', 'email', 'currentCompany', 'currentTitle', 'city',
    'owner', 'source', 'education', 'summary', 'profileText',
  ];
  const CANDIDATE_ARRAY_FIELDS = [
    'tags', 'skills', 'keywords', 'directions', 'categoryIds', 'resumeVersions',
  ];

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (value && typeof value === 'object') {
      const output = {};
      Object.keys(value).forEach(key => { output[key] = cloneValue(value[key]); });
      return output;
    }
    return value;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).sort().forEach(key => {
      if (FINGERPRINT_IGNORED_FIELDS.has(key)) return;
      output[key] = stableValue(value[key]);
    });
    return output;
  }

  function normalizeCandidateForFingerprint(candidate) {
    const normalized = cloneValue(candidate || {});
    CANDIDATE_STRING_FIELDS.forEach(field => {
      normalized[field] = candidate?.[field] == null ? '' : String(candidate[field]);
    });
    CANDIDATE_ARRAY_FIELDS.forEach(field => {
      normalized[field] = Array.isArray(candidate?.[field]) ? candidate[field] : [];
    });
    normalized.status = candidate?.status == null || candidate.status === '' ? 'active' : String(candidate.status);
    normalized.experienceYears = candidate?.experienceYears == null ? null : Number(candidate.experienceYears);
    return normalized;
  }

  function comparableCandidateText(candidate) {
    return JSON.stringify(stableValue(normalizeCandidateForFingerprint(candidate)));
  }

  function fingerprintCandidate(candidate) {
    const text = comparableCandidateText(candidate);
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
    }
    return hash.toString(36);
  }

  function buildParityReport(localCandidates = [], cloudCandidates = []) {
    const local = (localCandidates || []).filter(candidate => candidate?.id);
    const cloudRows = (cloudCandidates || []).filter(candidate => candidate?.id);
    const tombstones = new Set(cloudRows.filter(candidate => candidate.deletedAt).map(candidate => candidate.id));
    const activeCloud = cloudRows.filter(candidate => !candidate.deletedAt);
    const localById = new Map(local.map(candidate => [candidate.id, candidate]));
    const localComparableById = new Map(local.map(candidate => [candidate.id, comparableCandidateText(candidate)]));
    const cloudById = new Map(activeCloud.map(candidate => [candidate.id, candidate]));
    const missingInCloud = local
      .filter(candidate => !cloudById.has(candidate.id) && !tombstones.has(candidate.id))
      .map(candidate => candidate.id)
      .sort();
    const missingInLocal = activeCloud
      .filter(candidate => !localById.has(candidate.id))
      .map(candidate => candidate.id)
      .sort();
    const tombstonedLocal = local
      .filter(candidate => tombstones.has(candidate.id))
      .map(candidate => candidate.id)
      .sort();
    const mismatched = activeCloud
      .filter(candidate => {
        return localById.has(candidate.id)
          && localComparableById.get(candidate.id) !== comparableCandidateText(candidate);
      })
      .map(candidate => candidate.id)
      .sort();
    const ok = missingInCloud.length === 0
      && missingInLocal.length === 0
      && tombstonedLocal.length === 0
      && mismatched.length === 0;
    return Object.freeze({
      ok,
      localCount: local.length,
      cloudCount: activeCloud.length,
      missingInCloud,
      missingInLocal,
      mismatched,
      tombstonedLocal,
    });
  }

  function canEnableReadPath(meta, report) {
    return Boolean(meta?.backfilledAt && report?.ok);
  }

  function copyLocalPayload(target, source) {
    if (!source) return target;
    LOCAL_PAYLOAD_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(source, field)) target[field] = source[field];
    });
    return target;
  }

  function buildAuthoritativeCandidates(localCandidates = [], cloudCandidates = []) {
    const localById = new Map((localCandidates || []).filter(candidate => candidate?.id).map(candidate => [candidate.id, candidate]));
    return (cloudCandidates || [])
      .filter(candidate => candidate?.id && !candidate.deletedAt)
      .map(cloudCandidate => {
        const candidate = cloneValue(cloudCandidate);
        const localCandidate = localById.get(candidate.id);
        copyLocalPayload(candidate, localCandidate);
        const localVersions = new Map((localCandidate?.resumeVersions || []).filter(version => version?.id).map(version => [version.id, version]));
        candidate.resumeVersions = (candidate.resumeVersions || []).map(cloudVersion => {
          const version = cloneValue(cloudVersion);
          return copyLocalPayload(version, localVersions.get(version.id));
        });
        return candidate;
      });
  }

  return Object.freeze({
    LOCAL_PAYLOAD_FIELDS,
    fingerprintCandidate,
    buildParityReport,
    canEnableReadPath,
    buildAuthoritativeCandidates,
  });
});
