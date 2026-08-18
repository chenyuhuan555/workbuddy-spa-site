;(function initResumeVersionReadPath(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeVersionReadPath = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeVersionReadPath() {
  'use strict';
  const LOCAL_PAYLOAD_FIELDS = Object.freeze(['rawText', 'formattedText', 'fileData', 'electronicResumeText', 'resumeText', 'bossImportedText']);
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((out, key) => { out[key] = clone(value[key]); return out; }, {});
  }
  function canEnableReadPath(meta = {}, report = {}) {
    return Boolean(meta.backfilledAt && report.checked && !(report.missingInCloud || []).length && !(report.missingInLocal || []).length);
  }
  function copyLocalPayload(target, source) {
    if (!source) return target;
    LOCAL_PAYLOAD_FIELDS.forEach(field => { if (Object.prototype.hasOwnProperty.call(source, field)) target[field] = source[field]; });
    return target;
  }
  function buildAuthoritativeVersions(localCandidates = [], cloudVersions = []) {
    const localById = new Map();
    (localCandidates || []).forEach(candidate => (candidate?.resumeVersions || []).forEach(version => { if (version?.id) localById.set(String(version.id), version); }));
    const grouped = new Map();
    (cloudVersions || []).filter(version => version?.id && !version.deletedAt).forEach(row => {
      const version = copyLocalPayload(clone(row), localById.get(String(row.id)));
      const candidateId = String(version.candidateId || '');
      if (!candidateId) return;
      if (!grouped.has(candidateId)) grouped.set(candidateId, []);
      grouped.get(candidateId).push(version);
    });
    return grouped;
  }
  return Object.freeze({ LOCAL_PAYLOAD_FIELDS, canEnableReadPath, buildAuthoritativeVersions });
});
