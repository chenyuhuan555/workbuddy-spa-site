;(function initCandidateCoreEditor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateCoreEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCandidateCoreEditor() {
  'use strict';

  const EDITABLE_FIELDS = ['skills', 'directions', 'owner', 'phone', 'email'];

  function copyTags(value) {
    return Array.isArray(value) ? value.map(item => String(item || '')) : [];
  }

  function createDraft(candidate = {}) {
    return {
      skills: copyTags(Array.isArray(candidate.skills) ? candidate.skills : candidate.keywords),
      directions: copyTags(candidate.directions),
      owner: String(candidate.owner || ''),
      phone: String(candidate.phone || ''),
      email: String(candidate.email || ''),
    };
  }

  function normalizeTags(values, pendingInput = '') {
    const pending = String(pendingInput || '').split(/[，,\n]+/);
    const source = (Array.isArray(values) ? values : []).concat(pending);
    const seen = new Set();
    return source.map(value => String(value || '').trim()).filter(value => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function buildPatch(draft = {}, skillInput = '', directionInput = '') {
    return {
      skills: normalizeTags(draft.skills, skillInput),
      directions: normalizeTags(draft.directions, directionInput),
      owner: String(draft.owner || '').trim(),
      phone: String(draft.phone || '').trim(),
      email: String(draft.email || '').trim(),
    };
  }

  async function save(options = {}) {
    if (!options.canWrite) throw new Error('当前账号无权编辑人才信息');
    const candidate = options.bundle?.candidates?.find(item => item.id === options.candidateId);
    if (!candidate) throw new Error('人才不存在');
    if (typeof options.updateTalent !== 'function' || typeof options.persist !== 'function') {
      throw new Error('核心信息保存依赖不可用');
    }

    const previous = { ...createDraft(candidate), updatedAt: candidate.updatedAt };
    const patch = buildPatch(options.draft, options.skillInput, options.directionInput);
    options.updateTalent(options.bundle, candidate.id, patch);

    let persisted = false;
    try {
      persisted = await options.persist() === true;
    } catch {}
    if (!persisted) {
      Object.assign(candidate, previous);
      try { await options.persist(); } catch {}
      throw new Error('核心信息保存失败，请重试');
    }
    return candidate;
  }

  return { EDITABLE_FIELDS, createDraft, normalizeTags, buildPatch, save };
});
