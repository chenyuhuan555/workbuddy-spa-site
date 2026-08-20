;(function initDailyReviewMetrics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyDailyReviewMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createDailyReviewMetricsModule() {
  'use strict';

  // 阶段组：与 src/constants/pipeline-stages.js 的 KEYS / GROUPS 保持一致。
  // 这里内联一份是为了让纯函数模块可独立加载（不依赖 window.WorkBuddyStages 全局），
  // 语义上务必与 pipeline-stages.js 同步。
  const INTERVIEW_STAGES = Object.freeze(['interview_pending', 'interviewing', 'interview_passed']);
  const OFFER_STAGES = Object.freeze(['offer', 'offer_accepted']);
  const RECOMMENDED_STAGE = 'recommended';
  const CONTACTED_STAGE = 'contacted';

  function emptyMetrics() {
    return {
      addedCandidates: 0,
      touchedCandidates: 0,
      recommendations: 0,
      interviews: 0,
      offers: 0,
      completedTodos: 0,
      followups: 0,
    };
  }

  // 把任意时间串转换为指定时区的「日历日期」YYYY-MM-DD。
  // 纯日期串（YYYY-MM-DD）原样返回（本身已是日历日期，不涉及时区转换）。
  function toTimezoneDate(value, timezone) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) return '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(parsed);
      const get = type => (parts.find(p => p.type === type) || {}).value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch (error) {
      return text.slice(0, 10);
    }
  }

  // 归属判定：优先稳定账号 id（ownerUserId / owner_id / userId），缺失时按 owner 姓名兼容。
  function belongsTo(entity, userId, userName) {
    if (!entity) return false;
    const uid = String(entity.ownerUserId || entity.owner_id || entity.userId || '');
    if (uid) return uid === String(userId || '');
    const name = String(entity.owner || '');
    return Boolean(name) && Boolean(userName) && name === String(userName);
  }

  /**
   * 计算单顾问在某一天的「每日复盘」业务指标（纯函数，不负责 Supabase）。
   *
   * 关键口径：所有「今日动作」都基于事件时间戳（occurredAt / touchedAt / completedAt / createdAt），
   * 而不是「当前所处阶段」。例如昨天进入面试、今天仍处于面试的人，不计入今天的 interviews。
   *
   * @param {Object} input
   * @param {Array}  input.candidates    候选人才列表
   * @param {Array}  input.applications  申请列表（含 pipelineEvents 阶段事件）
   * @param {Array}  input.todos         待办列表
   * @param {string} input.userId        顾问稳定账号 id（ownerUserId）
   * @param {string} input.userName      顾问展示名（owner）
   * @param {string} input.reviewDate    复盘日历日期 YYYY-MM-DD（Asia/Shanghai）
   * @param {string} input.timezone      时区，默认 Asia/Shanghai
   * @returns {{addedCandidates:number, touchedCandidates:number, recommendations:number, interviews:number, offers:number, completedTodos:number, followups:number}}
   */
  function buildDailyReviewMetrics({
    candidates = [],
    applications = [],
    todos = [],
    userId = '',
    userName = '',
    reviewDate = '',
    timezone = 'Asia/Shanghai',
  } = {}) {
    const metrics = emptyMetrics();
    const uid = String(userId || '');
    const uname = String(userName || '');
    const date = String(reviewDate || '').trim();
    if (!date) return metrics; // 未指定复盘日期时，无「当天」可统计

    const touchedCandidateIds = new Set();
    const ownCandidates = (Array.isArray(candidates) ? candidates : []).filter(c => belongsTo(c, uid, uname));
    ownCandidates.forEach(c => {
      const intake = toTimezoneDate(c && (c.intakeAt || c.createdAt), timezone);
      if (intake === date) metrics.addedCandidates += 1;

      // 触达来源 1：candidate.touchedAt（旧数据兼容）或 candidate 自身的 contacted 阶段事件
      const touched = toTimezoneDate(c && c.touchedAt, timezone);
      const contactedEvent = Array.isArray(c && c.pipelineEvents)
        ? (c.pipelineEvents).some(e => e && e.toStage === CONTACTED_STAGE && toTimezoneDate(e.occurredAt, timezone) === date)
        : false;
      if (touched === date || contactedEvent) touchedCandidateIds.add(c && c.id);

      // 跟进：结构化 followup 记录（动作次数，非候选人数）。无 followups 字段时自然为 0（降级）。
      const fups = Array.isArray(c && c.followups) ? c.followups : [];
      metrics.followups += fups.filter(f => f && toTimezoneDate(f.createdAt, timezone) === date).length;
    });

    const ownApplications = (Array.isArray(applications) ? applications : []).filter(a => belongsTo(a, uid, uname));
    ownApplications.forEach(a => {
      const events = Array.isArray(a && a.pipelineEvents) ? a.pipelineEvents : [];
      if (events.some(e => e && e.toStage === RECOMMENDED_STAGE && toTimezoneDate(e.occurredAt, timezone) === date)) metrics.recommendations += 1;
      if (events.some(e => e && INTERVIEW_STAGES.includes(e.toStage) && toTimezoneDate(e.occurredAt, timezone) === date)) metrics.interviews += 1;
      if (events.some(e => e && OFFER_STAGES.includes(e.toStage) && toTimezoneDate(e.occurredAt, timezone) === date)) metrics.offers += 1;
      // 触达来源 2：application 进入 contacted 阶段（workbench-v2 里触达是 application 级 pipeline），去重到候选人
      if (events.some(e => e && e.toStage === CONTACTED_STAGE && toTimezoneDate(e.occurredAt, timezone) === date) && a.candidateId) {
        touchedCandidateIds.add(a.candidateId);
      }
    });
    metrics.touchedCandidates = touchedCandidateIds.size;

    const ownTodos = (Array.isArray(todos) ? todos : []).filter(t => belongsTo(t, uid, uname));
    metrics.completedTodos = ownTodos.filter(t => t && t.status === 'done' && toTimezoneDate(t.completedAt, timezone) === date).length;

    return metrics;
  }

  /**
   * 团队汇总：循环计算每个成员的 metrics 并求和（管理员「全部团队」视角）。
   * @param {Object} input
   * @param {Array}  input.members  [{ userId, userName }]
   * @param {...}    input 其余参数透传给 buildDailyReviewMetrics
   */
  function buildTeamDailyReviewMetrics({ members = [], ...rest } = {}) {
    const team = emptyMetrics();
    (Array.isArray(members) ? members : []).forEach(member => {
      const one = buildDailyReviewMetrics({
        ...rest,
        userId: member && member.userId,
        userName: member && member.userName,
      });
      Object.keys(team).forEach(key => { team[key] += one[key] || 0; });
    });
    return team;
  }

  return Object.freeze({
    INTERVIEW_STAGES,
    OFFER_STAGES,
    RECOMMENDED_STAGE,
    CONTACTED_STAGE,
    toTimezoneDate,
    belongsTo,
    buildDailyReviewMetrics,
    buildTeamDailyReviewMetrics,
  });
});
