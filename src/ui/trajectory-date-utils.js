(function (global) {
  'use strict';

  function parseTrajectoryDate(value, fallback = 'start') {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    if (/至今|现在|present|current/.test(raw)) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, value: now.getFullYear() * 12 + now.getMonth() + 1 };
    }
    const match = raw.match(/((?:19|20)\d{2})(?:[-./年](\d{1,2}))?/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = match[2] ? Math.min(12, Math.max(1, Number(match[2]))) : (fallback === 'end' ? 12 : 1);
    return { year, month, value: year * 12 + month };
  }

  function monthsOverlap(a, b) {
    const startA = parseTrajectoryDate(a?.start, 'start');
    const endA = parseTrajectoryDate(a?.end || a?.start, 'end');
    const startB = parseTrajectoryDate(b?.start, 'start');
    const endB = parseTrajectoryDate(b?.end || b?.start, 'end');
    if (!startA || !endA || !startB || !endB) return 0;
    return Math.max(0, Math.min(endA.value, endB.value) - Math.max(startA.value, startB.value) + 1);
  }

  function trajectoryPeriodLabel(a, b) {
    const starts = [parseTrajectoryDate(a?.start, 'start'), parseTrajectoryDate(b?.start, 'start')].filter(Boolean);
    const ends = [parseTrajectoryDate(a?.end || a?.start, 'end'), parseTrajectoryDate(b?.end || b?.start, 'end')].filter(Boolean);
    if (!starts.length || !ends.length) return '';
    const start = Math.max(...starts.map(item => item.value));
    const end = Math.min(...ends.map(item => item.value));
    const format = value => {
      const year = Math.floor((value - 1) / 12);
      const month = ((value - 1) % 12) + 1;
      return `${year}-${String(month).padStart(2, '0')}`;
    };
    return start <= end ? `${format(start)} 至 ${format(end)}` : '';
  }

  global.WorkBuddyTrajectoryDateUtils = { parseTrajectoryDate, monthsOverlap, trajectoryPeriodLabel };
})(typeof window !== 'undefined' ? window : globalThis);
