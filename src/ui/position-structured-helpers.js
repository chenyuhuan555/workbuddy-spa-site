;(function initPositionStructuredHelpers(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyPositionStructuredHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createPositionStructuredHelpers() {
  'use strict';

  function normalizePositionStructuredFields(pos = {}) {
    return {
      location: String(pos.location || '').trim(), salary: String(pos.salary || '').trim(), reportLine: String(pos.reportLine || '').trim(),
      mustHave: String(pos.mustHave || '').trim(), niceToHave: String(pos.niceToHave || '').trim(), exclusions: String(pos.exclusions || '').trim(),
      clientPreferences: String(pos.clientPreferences || '').trim(),
    };
  }

  function getPositionCompleteness(pos = {}) {
    const fields = normalizePositionStructuredFields(pos);
    const requiredKeys = ['location', 'salary', 'mustHave'];
    const optionalKeys = ['reportLine', 'niceToHave', 'exclusions', 'clientPreferences'];
    const filledRequired = requiredKeys.filter(key => fields[key]).length;
    const filledOptional = optionalKeys.filter(key => fields[key]).length;
    const score = Math.round(((filledRequired * 2) + filledOptional) / ((requiredKeys.length * 2) + optionalKeys.length) * 100);
    return { score, missing: requiredKeys.filter(key => !fields[key]), fields };
  }

  function structuredPositionSummary(pos = {}) {
    const fields = normalizePositionStructuredFields(pos);
    return [
      fields.location ? `地点：${fields.location}` : '', fields.salary ? `薪资：${fields.salary}` : '', fields.reportLine ? `汇报线：${fields.reportLine}` : '',
      fields.mustHave ? `硬性条件：${fields.mustHave}` : '', fields.niceToHave ? `加分项：${fields.niceToHave}` : '', fields.exclusions ? `排除项：${fields.exclusions}` : '',
      fields.clientPreferences ? `客户偏好：${fields.clientPreferences}` : '',
    ].filter(Boolean).join('\n');
  }

  function mustHaveItems(pos = {}) {
    const text = String(pos.mustHave || '').trim();
    if (!text) return [];
    return text.split(/\n/).map(line => line.replace(/^\s*[\d一二三四五六七八九十]+[、.．,，\s]+/, '').trim()).filter(Boolean);
  }

  return Object.freeze({ normalizePositionStructuredFields, getPositionCompleteness, structuredPositionSummary, mustHaveItems });
});
