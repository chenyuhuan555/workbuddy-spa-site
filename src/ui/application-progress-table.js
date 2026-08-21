/**
 * 面试 / 推进工作区 —— Application 推进主表（纯函数模块）
 *
 * 职责：把 Application + Candidate + Company + Position + Todo 组装成
 * "一行 = 一条 Application" 的标准行数据，并提供筛选 / 排序 / 汇总。
 * 本模块不读写存储、不操作 UI，方便 Node 测试。
 *
 * 设计约定：
 * - 阶段 label / 分组 / SLA 全部复用 src/constants/pipeline-stages.js；
 * - "下一步"从当前 Application 关联的 pending Todo 派生，不新建 nextStep 字段；
 * - 不维护 stageLabel / todoCount / companyName 等重复业务字段的存储，
 *   全部在 Row 构建时计算。
 */
(function initApplicationProgressTable(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyApplicationProgressTable = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createApplicationProgressTable(root) {
  'use strict';

  const shared = root.WorkBuddyStages;
  const KEYS = shared ? shared.KEYS : Object.freeze({
    DISCOVERED: 'discovered', CONTACTED: 'contacted', RESPONDED: 'responded',
    SCREENING: 'screening', TO_RECOMMEND: 'to_recommend', RECOMMENDED: 'recommended',
    CLIENT_ACCEPTED: 'client_accepted', INTERVIEW_PENDING: 'interview_pending',
    INTERVIEWING: 'interviewing', INTERVIEW_PASSED: 'interview_passed',
    OFFER: 'offer', OFFER_ACCEPTED: 'offer_accepted', PREBOARDING: 'preboarding',
    ONBOARDED: 'onboarded', PROBATION: 'probation', REGULARIZED: 'regularized',
    CLOSED: 'closed',
  });
  const GROUPS = shared ? shared.GROUPS : Object.freeze({
    DISCOVER: Object.freeze([KEYS.DISCOVERED, KEYS.CONTACTED, KEYS.RESPONDED]),
    SCREEN: Object.freeze([KEYS.SCREENING, KEYS.TO_RECOMMEND]),
    RECOMMEND: Object.freeze([KEYS.RECOMMENDED, KEYS.CLIENT_ACCEPTED]),
    INTERVIEW: Object.freeze([KEYS.INTERVIEW_PENDING, KEYS.INTERVIEWING, KEYS.INTERVIEW_PASSED]),
    OFFER: Object.freeze([KEYS.OFFER, KEYS.OFFER_ACCEPTED]),
    ONBOARD: Object.freeze([KEYS.PREBOARDING, KEYS.ONBOARDED, KEYS.PROBATION, KEYS.REGULARIZED]),
  });
  const STAGES = shared ? shared.STAGES : [];

  const DAY_MS = 24 * 60 * 60 * 1000;

  /* ── 阶段筛选分组：全部由共享常量组合，不散落维护 ── */
  const STAGE_FILTER_GROUPS = Object.freeze({
    all: null,
    recommend: Object.freeze([KEYS.RECOMMENDED]),
    client_review: Object.freeze([KEYS.CLIENT_ACCEPTED]),
    interview: GROUPS.INTERVIEW,
    offer: GROUPS.OFFER,
    onboard: GROUPS.ONBOARD,
    closed: Object.freeze([KEYS.CLOSED]),
  });
  const STAGE_FILTER_LABELS = Object.freeze({
    all: '全部阶段',
    recommend: '推荐',
    client_review: '客户审核',
    interview: '面试',
    offer: 'Offer',
    onboard: '入职',
    closed: '已结束',
  });

  /* ── 快捷筛选定义（key → label），判定逻辑见 matchesQuickFilter ── */
  const QUICK_FILTERS = Object.freeze([
    { key: 'all', label: '全部' },
    { key: 'client_feedback', label: '待客户反馈' },
    { key: 'to_schedule', label: '待约面' },
    { key: 'today_interview', label: '今日面试' },
    { key: 'week_interview', label: '本周面试' },
    { key: 'interview_feedback', label: '面试后待反馈' },
    { key: 'offer', label: 'Offer' },
    { key: 'overdue', label: '逾期未更新' },
  ]);

  /* ── "下一步"待办紧急度（ruleKey → 优先级，数字越小越紧急） ── */
  const TODO_RULE_PRIORITY = Object.freeze({
    'application.interview_reminder': 1,
    'application.interview_feedback_due': 2,
    'application.client_feedback_due': 3,
    'application.offer_follow_up': 4,
    'candidate.follow_up': 5,
  });

  function text(value) {
    return String(value ?? '').trim();
  }
  function parseMs(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const ms = Date.parse(text(value));
    return Number.isFinite(ms) ? ms : Number.NaN;
  }
  function startOfDay(ms) {
    const date = new Date(ms);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
  function stageLabelOf(stage) {
    const meta = (STAGES || []).find(item => item.key === stage);
    return meta ? meta.label : (stage || '');
  }
  function stageGroupOf(stage) {
    if (GROUPS.ONBOARD.includes(stage)) return 'onboard';
    if (GROUPS.OFFER.includes(stage)) return 'offer';
    if (GROUPS.INTERVIEW.includes(stage)) return 'interview';
    if (GROUPS.RECOMMEND.includes(stage)) return 'recommend';
    if (GROUPS.SCREEN.includes(stage)) return 'screen';
    if (GROUPS.DISCOVER.includes(stage)) return 'discover';
    if (stage === KEYS.CLOSED) return 'closed';
    return '';
  }

  /* ── 面试时间展示（今天 / 明天 / M月D日 HH:mm） ── */
  function formatTime(ms) {
    const date = new Date(ms);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function formatDate(ms) {
    const date = new Date(ms);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  function interviewLabel(value, nowMs) {
    const ms = parseMs(value);
    if (!Number.isFinite(ms)) return '—';
    const todayStart = startOfDay(nowMs);
    if (ms >= todayStart && ms < todayStart + DAY_MS) return `今天 ${formatTime(ms)}`;
    if (ms >= todayStart + DAY_MS && ms < todayStart + 2 * DAY_MS) return `明天 ${formatTime(ms)}`;
    return `${formatDate(ms)} ${formatTime(ms)}`;
  }
  function updatedLabel(value) {
    const ms = parseMs(value);
    if (!Number.isFinite(ms)) return '—';
    return `${formatDate(ms)} ${formatTime(ms)}`;
  }

  /* ── 最近业务更新时间（最后事件 → stageEnteredAt → updatedAt → createdAt） ── */
  function businessUpdatedAt(application) {
    const events = (Array.isArray(application.pipelineEvents) ? application.pipelineEvents : [])
      .map(event => parseMs(event && event.occurredAt))
      .filter(ms => Number.isFinite(ms));
    if (events.length) return new Date(Math.max(...events)).toISOString();
    const fallback = [application.stageEnteredAt, application.updatedAt, application.createdAt]
      .map(parseMs)
      .find(ms => Number.isFinite(ms));
    return Number.isFinite(fallback) ? new Date(fallback).toISOString() : '';
  }

  /* ── 阶段 SLA 逾期（复用 pipeline-stages 的 slaDays） ── */
  function stageSlaOverdue(application, nowMs) {
    const stage = (STAGES || []).find(item => item.key === application.stage);
    if (!stage || typeof stage.slaDays !== 'number' || stage.slaDays <= 0) return false;
    const enteredMs = parseMs(businessUpdatedAt(application));
    if (!Number.isFinite(enteredMs)) return false;
    return nowMs - enteredMs > stage.slaDays * DAY_MS;
  }

  /* ── Row 构建 ── */
  function pendingTodosOf(application, todos) {
    return (Array.isArray(todos) ? todos : []).filter(todo =>
      todo && text(todo.applicationId) === text(application.id)
      && text(todo.status || (todo.done ? 'done' : 'pending')) === 'pending'
      && !todo.done
    );
  }
  function mostUrgentTodo(pendingTodos) {
    if (!pendingTodos.length) return null;
    return [...pendingTodos].sort((a, b) => {
      const pa = TODO_RULE_PRIORITY[a.ruleKey] ?? 99;
      const pb = TODO_RULE_PRIORITY[b.ruleKey] ?? 99;
      if (pa !== pb) return pa - pb;
      return (parseMs(a.dueAt) || Number.POSITIVE_INFINITY) - (parseMs(b.dueAt) || Number.POSITIVE_INFINITY);
    })[0];
  }

  function buildRow({ application, candidatesById, companiesById, positionsById, todos, nowMs }) {
    const candidate = candidatesById.get(application.candidateId) || {};
    const company = companiesById.get(application.companyId) || {};
    const position = positionsById.get(application.positionId) || {};
    const pending = pendingTodosOf(application, todos);
    const nextTodo = mostUrgentTodo(pending);
    const owner = text(application.owner) || text(candidate.owner);
    const updatedAt = businessUpdatedAt(application);
    const interviewMs = parseMs(application.interviewAt || '');
    const todayStart = startOfDay(nowMs);
    const tomorrowStart = todayStart + DAY_MS;

    // priority：0 逾期 → 1 今日面试 → 2 明日面试 → 3 面试待反馈 → 4 客户待反馈 → 5 Offer 跟进 → 6 普通
    let priority = 6;
    if (pending.some(todo => {
      const dueMs = parseMs(todo.dueAt || '');
      return Number.isFinite(dueMs) && dueMs < todayStart;
    })) {
      priority = 0;
    } else if (Number.isFinite(interviewMs) && interviewMs >= todayStart && interviewMs < todayStart + DAY_MS) {
      priority = 1;
    } else if (Number.isFinite(interviewMs) && interviewMs >= tomorrowStart && interviewMs < tomorrowStart + DAY_MS) {
      priority = 2;
    } else if (pending.some(todo => todo.ruleKey === 'application.interview_feedback_due')) {
      priority = 3;
    } else if (pending.some(todo => todo.ruleKey === 'application.client_feedback_due')) {
      priority = 4;
    } else if (pending.some(todo => todo.ruleKey === 'application.offer_follow_up')) {
      priority = 5;
    }

    const dueAt = nextTodo ? (nextTodo.dueAt || application.interviewAt || '') : (application.interviewAt || '');
    return {
      applicationId: application.id,
      application,
      candidateId: application.candidateId,
      candidateName: text(candidate.name) || '候选人',
      candidateHeadline: [text(candidate.currentCompany), text(candidate.currentTitle)].filter(Boolean).join(' · '),
      companyId: application.companyId,
      companyName: text(company.name) || '公司已删除',
      positionId: application.positionId,
      positionTitle: text(position.title) || '岗位已删除',
      stage: text(application.stage),
      stageLabel: stageLabelOf(application.stage),
      stageGroup: stageGroupOf(application.stage),
      interviewAt: application.interviewAt || '',
      interviewMs: Number.isFinite(interviewMs) ? interviewMs : null,
      interviewLabel: interviewLabel(application.interviewAt, nowMs),
      nextTodo,
      nextTodoTitle: nextTodo ? nextTodo.title : '—',
      todoCount: pending.length,
      owner,
      updatedAt,
      updatedLabel: updatedLabel(updatedAt),
      priority,
      dueAt,
      searchText: [
        candidate.name, candidate.currentCompany, candidate.currentTitle,
        company.name, position.title,
      ].filter(Boolean).join(' '),
      // 内部辅助（不参与展示）：
      _pendingRuleKeys: pending.map(todo => todo.ruleKey).filter(Boolean),
      _stageOverdue: stageSlaOverdue(application, nowMs),
    };
  }

  function buildRows(input = {}) {
    const rawApplications = Array.isArray(input.applications) ? input.applications : [];
    const candidates = Array.isArray(input.candidates) ? input.candidates : [];
    const companies = Array.isArray(input.companies) ? input.companies : [];
    const positions = Array.isArray(input.positions) ? input.positions : [];
    const activeIds = items => new Set(items.filter(item => item && item.id && !item.deletedAt).map(item => item.id));
    const candidateIds = activeIds(candidates);
    const companyIds = activeIds(companies);
    const positionIds = activeIds(positions);
    const applications = rawApplications.filter(application => (
      application
      && application.id
      && !application.deletedAt
      && candidateIds.has(application.candidateId)
      && companyIds.has(application.companyId)
      && positionIds.has(application.positionId)
    ));
    const todos = Array.isArray(input.todos) ? input.todos : [];
    const nowMs = parseMs(input.now) || Date.now();
    const candidatesById = new Map(candidates.map(item => [item.id, item]));
    const companiesById = new Map(companies.map(item => [item.id, item]));
    const positionsById = new Map(positions.map(item => [item.id, item]));
    return applications
      .filter(application => application && application.id && text(application.status) !== 'archived' && text(application.status) !== 'deleted')
      .map(application => buildRow({ application, candidatesById, companiesById, positionsById, todos, nowMs }));
  }

  /* ── 快捷筛选判定 ── */
  function matchesQuickFilter(row, quick, nowMs) {
    if (!quick || quick === 'all') return true;
    const ruleKeys = row._pendingRuleKeys || [];
    if (quick === 'client_feedback') return ruleKeys.includes('application.client_feedback_due');
    if (quick === 'to_schedule') return (GROUPS.INTERVIEW || []).includes(row.stage) && !row.interviewMs;
    if (quick === 'today_interview') {
      if (!row.interviewMs) return false;
      const todayStart = startOfDay(nowMs);
      return row.interviewMs >= todayStart && row.interviewMs < todayStart + DAY_MS;
    }
    if (quick === 'week_interview') {
      if (!row.interviewMs) return false;
      const today = new Date(startOfDay(nowMs));
      const mondayOffset = (today.getDay() + 6) % 7;
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset).getTime();
      return row.interviewMs >= weekStart && row.interviewMs < weekStart + 7 * DAY_MS;
    }
    if (quick === 'interview_feedback') return ruleKeys.includes('application.interview_feedback_due');
    if (quick === 'offer') return (GROUPS.OFFER || []).includes(row.stage);
    if (quick === 'overdue') return row._stageOverdue === true;
    return true;
  }

  /* ── 顶部筛选（搜索 / 负责人 / 阶段组 / 快捷筛选） ── */
  function filterRows(rows = [], filters = {}, nowMsValue) {
    const nowMs = parseMs(nowMsValue) || Date.now();
    const query = text(filters.query).toLowerCase();
    const owner = text(filters.owner);
    const stageGroup = text(filters.stageGroup);
    const quick = text(filters.quick);
    const allowedStages = stageGroup && STAGE_FILTER_GROUPS[stageGroup] ? STAGE_FILTER_GROUPS[stageGroup] : null;
    return rows.filter(row => {
      if (query && !text(row.searchText).toLowerCase().includes(query)) return false;
      if (owner && owner !== 'all' && row.owner !== owner) return false;
      if (allowedStages && !allowedStages.includes(row.stage)) return false;
      if (quick && !matchesQuickFilter(row, quick, nowMs)) return false;
      return true;
    });
  }

  /* ── 默认排序：priority ASC → dueAt ASC → updatedAt DESC ── */
  function sortRows(rows = []) {
    return [...rows].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const da = parseMs(a.dueAt) || Number.POSITIVE_INFINITY;
      const db = parseMs(b.dueAt) || Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (parseMs(b.updatedAt) || 0) - (parseMs(a.updatedAt) || 0);
    });
  }

  /* ── 汇总（用于顶部计数展示） ── */
  function summarize(rows = [], nowMsValue) {
    const nowMs = parseMs(nowMsValue) || Date.now();
    return {
      total: rows.length,
      counts: Object.fromEntries(QUICK_FILTERS.map(item => [item.key, rows.filter(row => matchesQuickFilter(row, item.key, nowMs)).length])),
    };
  }

  return Object.freeze({
    KEYS,
    GROUPS,
    STAGE_FILTER_GROUPS,
    STAGE_FILTER_LABELS,
    QUICK_FILTERS,
    TODO_RULE_PRIORITY,
    buildRows,
    filterRows,
    sortRows,
    summarize,
    stageLabelOf,
    stageGroupOf,
    stageSlaOverdue,
    interviewLabel,
    mostUrgentTodo,
  });
});
