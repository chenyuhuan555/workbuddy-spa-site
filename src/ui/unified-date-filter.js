;(function initUnifiedDateFilter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyUnifiedDateFilter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createUnifiedDateFilter() {
  'use strict';

  const PRESETS = Object.freeze([
    { key: 'all', label: '全部时间' },
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'custom', label: '自定义' },
  ]);
  const DIMENSIONS = Object.freeze({
    candidates: Object.freeze([
      { key: 'createdAt', label: '入库日期' },
      { key: 'touchedAt', label: '最近触达' },
      { key: 'recommendedAt', label: '推荐日期' },
      { key: 'updatedAt', label: '更新时间' },
    ]),
    positions: Object.freeze([
      { key: 'createdAt', label: '创建日期' },
      { key: 'updatedAt', label: '更新时间' },
    ]),
    companies: Object.freeze([
      { key: 'createdAt', label: '创建日期' },
      { key: 'updatedAt', label: '更新时间' },
    ]),
    progress: Object.freeze([
      { key: 'recommendedAt', label: '推荐日期' },
      { key: 'interviewAt', label: '面试日期' },
      { key: 'offerAt', label: 'Offer 日期' },
      { key: 'dueAt', label: '下次跟进' },
      { key: 'updatedAt', label: '更新时间' },
    ]),
    dailyReview: Object.freeze([
      { key: 'reviewDate', label: '复盘日期' },
      { key: 'updatedAt', label: '更新时间' },
    ]),
  });

  function text(value) { return String(value ?? '').trim(); }
  function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function parseDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
  }
  function toDate(value) {
    return parseDateOnly(value) || (Number.isFinite(Date.parse(value || '')) ? new Date(value) : null);
  }
  function rangeFor(filter = {}, now = new Date()) {
    const preset = text(filter.preset || 'all');
    if (!preset || preset === 'all') return null;
    const today = startOfDay(now);
    if (preset === 'today') return [today, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)];
    if (preset === 'week') {
      const mondayOffset = (today.getDay() + 6) % 7;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)];
    }
    if (preset === 'month') return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    if (preset === 'custom') {
      const from = parseDateOnly(filter.from);
      const to = parseDateOnly(filter.to);
      if (!from || !to || from > to) return ['invalid', 'invalid'];
      return [from, new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)];
    }
    return ['invalid', 'invalid'];
  }
  function valueFor(row = {}, dimension = 'updatedAt') {
    const application = row.application || {};
    const nextTodo = row.nextTodo || {};
    const values = {
      createdAt: row.createdAt || row.intakeAt || row.candidate?.createdAt,
      touchedAt: row.touchedAt || row.candidate?.touchedAt,
      recommendedAt: row.recommendedAt || application.recommendedAt || row.primaryFlow?.recommendedAt,
      interviewAt: row.interviewAt || application.interviewAt,
      offerAt: row.offerAt || application.offerAt,
      dueAt: row.dueAt || nextTodo.dueAt,
      reviewDate: row.reviewDate,
      updatedAt: row.updatedAt || application.updatedAt || row.candidate?.updatedAt,
    };
    return values[dimension] || '';
  }
  function matches(row, filter = {}, now = new Date()) {
    const range = rangeFor(filter, now);
    if (!range) return true;
    if (range[0] === 'invalid') return false;
    const value = toDate(valueFor(row, filter.dimension));
    if (!value) return false;
    return value >= range[0] && value < range[1];
  }
  function filterRows(rows = [], filter = {}, now = new Date()) {
    return (Array.isArray(rows) ? rows : []).filter(row => matches(row, filter, now));
  }
  function createFilter(dimension = 'updatedAt') { return { dimension, preset: 'all', from: '', to: '' }; }
  function dimensionsFor(scope) { return DIMENSIONS[scope] || DIMENSIONS.companies; }

  return Object.freeze({ PRESETS, DIMENSIONS, dimensionsFor, createFilter, rangeFor, valueFor, matches, filterRows });
});
