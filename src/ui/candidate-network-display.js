(function (global) {
  'use strict';

  function normalizeTrajectoryName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[｜|/\\]+/g, '-')
      .replace(/\s+/g, '')
      .replace(/[-_]{2,}/g, '-')
      .trim();
  }

  function relationLabel(edge) {
    if (!edge) return '';
    const typeLabel = edge.type === 'edu' ? '校友' : '前同事';
    const period = edge.period ? `${edge.period} ` : '';
    return `${period}${edge.name}${typeLabel}`;
  }

  function networkNodeColor(resume) {
    const state = resume?.evaluation || 'pending';
    if (state === 'match') return '#10b981';
    if (!state || state === 'pending') return '#ef4444';
    return '#94a3b8';
  }

  global.WorkBuddyCandidateNetworkDisplay = { normalizeTrajectoryName, relationLabel, networkNodeColor };
})(typeof window !== 'undefined' ? window : globalThis);
