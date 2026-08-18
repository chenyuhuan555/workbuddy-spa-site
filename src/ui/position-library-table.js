/**
 * 岗位库列表化 — 纯函数核心（UI / 测试无关）
 *
 * 设计原则（沿用 talent-library-table.js 的 IIFE + module.exports 双模式）：
 *  - 浏览器：经典 <script> 挂载到 window.WorkBuddyPositionLibraryTable
 *  - Node 测试：node --test 通过 globalThis 访问（模块副作用挂载）
 *
 * 关键护栏：岗位状态（position.status）与流水线阶段（application.stage）严格分离。
 * 本模块只【读取】application.stage 来派生业务进展，绝不写回任何岗位 / 人才字段。
 */
;(function initPositionLibraryTable(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyPositionLibraryTable = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createPositionLibraryTable(root) {
  'use strict';

  /* ── 阶段分组：优先取共享模块，Node 测试无此模块时内联回退 ── */
  const _shared = root && root.WorkBuddyStages;
  const STAGES = _shared ? _shared.STAGES : null;
  const GROUPS = _shared ? _shared.GROUPS : Object.freeze({
    RECOMMEND: Object.freeze(['recommended', 'client_accepted']),
    INTERVIEW: Object.freeze(['interview_pending', 'interviewing', 'interview_passed']),
    OFFER: Object.freeze(['offer', 'offer_accepted']),
    ONBOARD: Object.freeze(['preboarding', 'onboarded', 'probation', 'regularized']),
  });

  /* ── 岗位状态（仅描述岗位本身，与流水线无关）── */
  const STATUS_VALUES = Object.freeze(['open', 'paused', 'closed']);
  const STATUS_LABELS = Object.freeze({
    open: '开放中',
    paused: '暂停',
    closed: '已关闭',
  });

  const text = value => String(value ?? '').trim();
  const display = value => text(value) || '-';
  const parseTime = value => Number.isFinite(Date.parse(value || '')) ? Date.parse(value) : Number.NEGATIVE_INFINITY;
  const indexById = (rows, key) => new Map((Array.isArray(rows) ? rows : []).map(row => [row && row[key], row]));

  function stageLabel(stage) {
    if (STAGES) {
      const found = STAGES.find(item => item.key === stage);
      if (found) return found.label;
    }
    const fallback = {
      recommended: '已推荐', client_accepted: '客户接受',
      interview_pending: '待面试', interviewing: '面试中', interview_passed: '面试通过',
      offer: 'Offer 沟通', offer_accepted: 'Offer 已接受',
      preboarding: '待入职', onboarded: '已入职', probation: '试用期', regularized: '已转正',
    };
    return fallback[stage] || stage || '未推进';
  }

  /**
   * 业务进展：从 application.stage 派生 5 个计数。
   * 已推荐 / 客户审核中 / 面试中 / Offer / 已入职（与流水线阶段一一对齐，但只读取）。
   * 入参 applications 应为【已按该岗位过滤】的数组；归档 / 软删的推进记录不计入。
   */
  function computePositionProgress(applications = []) {
    const counts = { recommended: 0, clientReview: 0, interviewing: 0, offer: 0, onboarded: 0 };
    for (const application of (applications || [])) {
      if (application.deletedAt || application.status === 'archived') continue;
      const stage = application.stage;
      if (stage === 'recommended') counts.recommended += 1;
      else if (stage === 'client_accepted') counts.clientReview += 1;
      else if (GROUPS.INTERVIEW.includes(stage)) counts.interviewing += 1;
      else if (GROUPS.OFFER.includes(stage)) counts.offer += 1;
      else if (GROUPS.ONBOARD.includes(stage)) counts.onboarded += 1;
    }
    counts.total = counts.recommended + counts.clientReview + counts.interviewing + counts.offer + counts.onboarded;
    return counts;
  }

  function applicationsForPosition(applications = [], positionId) {
    return (applications || []).filter(application => application.positionId === positionId);
  }

  /** JD 单行摘要：折叠空白后截断，超过 maxLen 加省略号。空 JD 返回 ''。 */
  function jdPreview(position = {}, maxLen = 48) {
    const raw = text(position.description || position.jd || position.detail);
    const collapsed = raw.replace(/\s+/g, ' ').trim();
    if (!collapsed) return '';
    return collapsed.length > maxLen ? `${collapsed.slice(0, maxLen)}…` : collapsed;
  }

  function positionSearchText(position = {}, companyName = '') {
    return [
      position.title, companyName, position.description || position.jd, position.city,
      position.salary, position.owner, ...(position.skills || []), ...(position.tags || []),
    ].filter(Boolean).join(' ');
  }

  /** 从任意薪资字符串中取第一个连续整数（"30-50k"→30，"面议"→NaN）。 */
  function salaryNumber(salary) {
    const match = /(\d+)/.exec(text(salary));
    return match ? Number(match[1]) : NaN;
  }

  /* ── 日期筛选（与 talent-library 一致，支持 今天 / 本周 / 本月 / 自定义）── */
  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  function parseLocalDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
  function rangeForDateFilter(filter = {}, now = new Date()) {
    const preset = text(filter.preset || 'all');
    if (!preset || preset === 'all') return null;
    const today = startOfLocalDay(now);
    if (preset === 'today') return [today, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)];
    if (preset === 'week') {
      const mondayOffset = (today.getDay() + 6) % 7;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)];
    }
    if (preset === 'month') {
      return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    }
    if (preset === 'custom' && filter.from && filter.to) {
      const from = parseLocalDate(filter.from);
      const to = parseLocalDate(filter.to);
      if (!from || !to || from > to) return ['invalid', 'invalid'];
      return [from, new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)];
    }
    return ['invalid', 'invalid'];
  }
  function matchesDateFilter(value, filter, now) {
    const range = rangeForDateFilter(filter, now);
    if (!range) return true;
    const time = parseTime(value);
    if (range[0] === 'invalid' || time === Number.NEGATIVE_INFINITY) return false;
    return time >= range[0].getTime() && time < range[1].getTime();
  }

  /**
   * 筛选岗位行。
   * 支持：query（岗位名/公司名/JD关键词/技能关键词）、companyId、status、owner、base、
   *       tag、salaryMin/salaryMax、hasRecommendation(yes/no/all)、hasInterview(yes/no/all)、
   *       created（创建日期）、updated（更新时间）。
   */
  function filterRows(rows = [], filters = {}, now = new Date()) {
    const query = text(filters.query).toLowerCase();
    return rows.filter(row => {
      if (query && !text(row.searchText).toLowerCase().includes(query)) return false;
      if (filters.companyId && filters.companyId !== 'all' && text(row.companyId) !== text(filters.companyId)) return false;
      if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
      if (filters.owner && filters.owner !== 'all' && !text(row.owner).split(/[、,，/／|\n;；]+/).map(text).includes(text(filters.owner))) return false;
      if (filters.base && filters.base !== 'all' && !text(row.base).toLowerCase().includes(text(filters.base).toLowerCase())) return false;
      if (filters.tag && filters.tag !== 'all' && !(row.tags || []).some(tag => text(tag) === text(filters.tag))) return false;
      if (filters.salaryMin && Number.isFinite(Number(filters.salaryMin))) {
        const n = salaryNumber(row.salary);
        if (!(Number.isFinite(n) && n >= Number(filters.salaryMin))) return false;
      }
      if (filters.salaryMax && Number.isFinite(Number(filters.salaryMax))) {
        const n = salaryNumber(row.salary);
        if (!(Number.isFinite(n) && n <= Number(filters.salaryMax))) return false;
      }
      if (filters.hasRecommendation && filters.hasRecommendation !== 'all') {
        const yes = Boolean(row.progress && row.progress.recommended > 0);
        if (filters.hasRecommendation === 'yes' && !yes) return false;
        if (filters.hasRecommendation === 'no' && yes) return false;
      }
      if (filters.hasInterview && filters.hasInterview !== 'all') {
        const yes = Boolean(row.progress && row.progress.interviewing > 0);
        if (filters.hasInterview === 'yes' && !yes) return false;
        if (filters.hasInterview === 'no' && yes) return false;
      }
      if (!matchesDateFilter(row.createdAt, filters.created, now)) return false;
      if (!matchesDateFilter(row.updatedAt, filters.updated, now)) return false;
      return true;
    });
  }

  function buildPositionRow({ position = {}, company = {}, applications = [] } = {}) {
    const companyName = display(company && company.name);
    const apps = applicationsForPosition(applications, position.id);
    const progress = computePositionProgress(apps);
    const createdAt = display(position.createdAt);
    const updatedAt = display(position.updatedAt || position.createdAt);
    return {
      id: position.id,
      position,
      companyId: position.companyId,
      companyName,
      title: display(position.title),
      base: display(position.city),
      salary: display(position.salary),
      owner: display(position.owner),
      status: position.status || 'open',
      statusLabel: STATUS_LABELS[position.status] || STATUS_LABELS.open,
      tags: Array.isArray(position.tags) ? position.tags : [],
      jdPreview: jdPreview(position),
      recommended: progress.recommended,
      interviewing: progress.interviewing,
      progress,
      createdAt,
      updatedAt,
      lastUpdated: updatedAt,
      searchText: positionSearchText(position, companyName),
    };
  }

  function buildRows({ positions = [], companies = [], applications = [] } = {}) {
    const companyById = indexById(companies, 'id');
    return (positions || []).map(position => {
      const company = companyById.get(position.companyId) || {};
      return buildPositionRow({ position, company, applications });
    });
  }

  function summarize(rows = [], now = new Date()) {
    const items = rows || [];
    return {
      total: items.length,
      open: items.filter(row => row.status === 'open').length,
      paused: items.filter(row => row.status === 'paused').length,
      closed: items.filter(row => row.status === 'closed').length,
      recommended: items.reduce((sum, row) => sum + (row.recommended || 0), 0),
      interviewing: items.reduce((sum, row) => sum + (row.interviewing || 0), 0),
    };
  }

  return Object.freeze({
    STATUS_VALUES,
    STATUS_LABELS,
    GROUPS,
    stageLabel,
    computePositionProgress,
    applicationsForPosition,
    jdPreview,
    positionSearchText,
    salaryNumber,
    rangeForDateFilter,
    matchesDateFilter,
    filterRows,
    buildPositionRow,
    buildRows,
    summarize,
  });
});
