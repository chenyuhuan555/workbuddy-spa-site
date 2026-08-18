;(function initCandidateJobOpportunityActions(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateJobOpportunityActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateJobOpportunityActions(root) {
  'use strict';

  function nowIso() {
    return new Date().toISOString();
  }

  function snapshotField(candidate, field) {
    const value = candidate[field];
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
    return value;
  }

  function findCandidate(bundle, candidateId) {
    const list = bundle && Array.isArray(bundle.candidates) ? bundle.candidates : [];
    const found = list.find(item => item && item.id === candidateId);
    if (!found) throw new Error('候选人不存在');
    return found;
  }

  function requireWrite(canWrite) {
    if (!canWrite) throw new Error('当前账号无权编辑候选人外部机会');
  }

  // 持久化封装：失败时尝试回滚 candidate 字段到 previousValue
  async function persistField(candidate, field, previousValue, deps) {
    let ok = false;
    try { ok = await deps.persist() === true; }
    catch (_) { ok = false; }
    if (ok) return;
    // 失败回滚
    if (typeof deps.updateTalent === 'function') {
      try { deps.updateTalent(deps.bundle, candidate.id, { [field]: previousValue }); } catch (_) { /* ignore */ }
    }
    throw new Error('保存失败，请重试');
  }

  // ---------------- 外部公司机会 ----------------

  async function addOpportunity(deps, candidate, draft) {
    requireWrite(deps && deps.canWrite);
    const target = findCandidate(deps.bundle, candidate.id);
    const previousList = snapshotField(target, 'externalOpportunities');
    const module = root.WorkBuddyExternalOpportunities;
    const validation = module.validate(draft);
    if (!validation.ok) throw new Error(validation.error);
    const nextList = module.applyAdd(previousList, draft, nowIso);
    deps.updateTalent(deps.bundle, target.id, { externalOpportunities: nextList });
    await persistField(target, 'externalOpportunities', previousList, deps);
    return target;
  }

  async function editOpportunity(deps, candidate, id, draft) {
    requireWrite(deps && deps.canWrite);
    const target = findCandidate(deps.bundle, candidate.id);
    const previousList = snapshotField(target, 'externalOpportunities');
    const module = root.WorkBuddyExternalOpportunities;
    const validation = module.validate(draft);
    if (!validation.ok) throw new Error(validation.error);
    const result = module.applyEdit(previousList, id, draft, nowIso);
    if (!result.changed) throw new Error('未找到对应的公司机会');
    deps.updateTalent(deps.bundle, target.id, { externalOpportunities: result.list });
    await persistField(target, 'externalOpportunities', previousList, deps);
    return target;
  }

  async function removeOpportunity(deps, candidate, id) {
    requireWrite(deps && deps.canWrite);
    const target = findCandidate(deps.bundle, candidate.id);
    const previousList = snapshotField(target, 'externalOpportunities');
    const module = root.WorkBuddyExternalOpportunities;
    const nextList = module.applyRemove(previousList, id);
    if (nextList.length === previousList.length) throw new Error('未找到对应的公司机会');
    deps.updateTalent(deps.bundle, target.id, { externalOpportunities: nextList });
    await persistField(target, 'externalOpportunities', previousList, deps);
    return target;
  }

  // ---------------- 求职判断 ----------------

  async function savePreferences(deps, candidate, draft) {
    requireWrite(deps && deps.canWrite);
    const target = findCandidate(deps.bundle, candidate.id);
    const previous = snapshotField(target, 'jobOpportunityPreferences');
    const module = root.WorkBuddyJobOpportunityPreferences;
    const patch = module.buildPatch(draft, nowIso);
    deps.updateTalent(deps.bundle, target.id, { jobOpportunityPreferences: patch });
    await persistField(target, 'jobOpportunityPreferences', previous, deps);
    return target;
  }

  return {
    addOpportunity,
    editOpportunity,
    removeOpportunity,
    savePreferences,
  };
});
