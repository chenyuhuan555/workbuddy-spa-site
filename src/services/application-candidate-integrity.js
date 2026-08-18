;(function initApplicationCandidateIntegrity(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyApplicationCandidateIntegrity = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createApplicationCandidateIntegrity() {
  'use strict';

  function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 7 ? digits : '';
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function versionKeys(candidate) {
    const keys = [];
    for (const version of candidate?.resumeVersions || []) {
      const fileHash = String(version?.fileHash || '').trim().toLowerCase();
      const sourceResumeId = String(version?.sourceResumeId || '').trim();
      if (fileHash) keys.push(`fileHash:${fileHash}`);
      if (sourceResumeId) keys.push(`sourceResumeId:${sourceResumeId}`);
    }
    return [...new Set(keys)].sort();
  }

  function contactKeys(candidate) {
    const keys = [];
    const phone = normalizePhone(candidate?.phone);
    const email = normalizeEmail(candidate?.email);
    if (phone) keys.push(`phone:${phone}`);
    if (email) keys.push(`email:${email}`);
    return keys;
  }

  function compositeKey(candidate) {
    const values = [candidate?.name, candidate?.currentCompany, candidate?.currentTitle]
      .map(value => String(value || '').trim().toLowerCase());
    return values.every(Boolean) ? `profile:${values.join('|')}` : '';
  }

  function indexKeys(candidates, getKeys) {
    const index = new Map();
    for (const candidate of candidates) {
      for (const key of getKeys(candidate)) {
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(candidate.id);
      }
    }
    return index;
  }

  function matchingIds(keys, index) {
    const ids = new Set();
    for (const key of keys) {
      for (const id of index.get(key) || []) ids.add(id);
    }
    return ids;
  }

  function fingerprint(value) {
    const text = JSON.stringify(value);
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
    }
    return hash.toString(36);
  }

  function audit({ candidates = [], applications = [] } = {}) {
    const validCandidates = candidates.filter(item => item?.id && !item.deletedAt);
    const validIds = new Set(validCandidates.map(item => item.id));
    const allById = new Map(candidates.filter(item => item?.id).map(item => [item.id, item]));
    const orphanApplications = applications.filter(item => (
      item?.id && !item.deletedAt && !validIds.has(item.candidateId)
    ));
    const grouped = new Map();
    for (const application of orphanApplications) {
      if (!grouped.has(application.candidateId)) grouped.set(application.candidateId, []);
      grouped.get(application.candidateId).push(application.id);
    }

    const versionIndex = indexKeys(validCandidates, versionKeys);
    const contactIndex = indexKeys(validCandidates, contactKeys);
    const profileIndex = indexKeys(validCandidates, candidate => {
      const key = compositeKey(candidate);
      return key ? [key] : [];
    });
    const mappings = [];
    const unresolved = [];

    for (const [candidateId, applicationIds] of [...grouped.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))) {
      const sortedApplicationIds = applicationIds.slice().sort();
      const source = allById.get(candidateId);
      if (!source) {
        unresolved.push({ candidateId, applicationIds: sortedApplicationIds, reason: 'SOURCE_CANDIDATE_MISSING' });
        continue;
      }

      const sourceVersionKeys = versionKeys(source);
      const sourceContactKeys = contactKeys(source);
      const strongIds = matchingIds(sourceVersionKeys, versionIndex);
      for (const id of matchingIds(sourceContactKeys, contactIndex)) strongIds.add(id);
      if (strongIds.size > 1) {
        unresolved.push({ candidateId, applicationIds: sortedApplicationIds, reason: 'MULTIPLE_STRONG_MATCHES' });
        continue;
      }

      let targetId = strongIds.size === 1 ? [...strongIds][0] : '';
      let evidence = targetId
        ? [...sourceVersionKeys, ...sourceContactKeys].filter(key => (
            versionIndex.get(key)?.has(targetId) || contactIndex.get(key)?.has(targetId)
          ))
        : [];

      if (!targetId) {
        const profile = compositeKey(source);
        const profileIds = profile ? matchingIds([profile], profileIndex) : new Set();
        if (profileIds.size === 1) {
          targetId = [...profileIds][0];
          evidence = [profile];
        } else {
          unresolved.push({
            candidateId,
            applicationIds: sortedApplicationIds,
            reason: profileIds.size > 1 ? 'MULTIPLE_PROFILE_MATCHES' : 'NO_DETERMINISTIC_MATCH',
          });
          continue;
        }
      }

      mappings.push({
        fromCandidateId: candidateId,
        toCandidateId: targetId,
        evidence: [...new Set(evidence)].sort(),
        applicationIds: sortedApplicationIds,
      });
    }

    const orphanApplicationIds = orphanApplications.map(item => item.id).sort();
    const orphanCandidateIds = [...grouped.keys()].sort();
    const signature = {
      orphanApplicationIds,
      mappings: mappings.map(item => [item.fromCandidateId, item.toCandidateId, item.applicationIds]),
    };
    return Object.freeze({
      candidateCount: validCandidates.length,
      applicationCount: applications.filter(item => item?.id && !item.deletedAt).length,
      orphanApplicationIds,
      orphanCandidateIds,
      mappings,
      unresolved,
      fingerprint: fingerprint(signature),
    });
  }

  function createPatches(applications = [], mappings = []) {
    const targetByOldId = new Map(mappings.map(item => [item.fromCandidateId, item.toCandidateId]));
    return applications
      .filter(item => targetByOldId.has(item?.candidateId))
      .map(item => ({
        ...JSON.parse(JSON.stringify(item)),
        candidateId: targetByOldId.get(item.candidateId),
      }));
  }

  function verifyPreserved(before, after) {
    if (!before || !after) return false;
    const withoutCandidateId = value => {
      const copy = JSON.parse(JSON.stringify(value));
      delete copy.candidateId;
      return copy;
    };
    return JSON.stringify(withoutCandidateId(before)) === JSON.stringify(withoutCandidateId(after));
  }

  return Object.freeze({ audit, createPatches, verifyPreserved });
});
