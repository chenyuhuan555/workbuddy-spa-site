;(function initMarkdownSafety(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyMarkdownSafety = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMarkdownSafety() {
  'use strict';

  const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

  function stripControls(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sanitizeUrl(value) {
    const raw = stripControls(value);
    if (!raw) return '#';
    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      try {
        const parsed = new URL(raw);
        return SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase()) ? raw : '#';
      } catch {
        return '#';
      }
    }
    return '#';
  }

  function escapeAttribute(value) {
    return stripControls(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { sanitizeUrl, escapeAttribute };
});
