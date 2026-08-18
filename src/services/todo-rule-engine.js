/**
 * 自动待办规则引擎（Todo Rule Engine）
 *
 * 职责：输入当前业务数据，输出"理论上应该存在的自动 Todo"。
 * 本文件是纯计算模块：不读写存储、不操作 UI。
 *
 * 设计约定：
 * - 阶段判断一律复用 src/constants/pipeline-stages.js 的 KEYS / GROUPS，
 *   禁止散落 stage === 'offer' 这类魔法字符串。
 * - 每条 System Todo 都携带稳定 dedupeKey，供 reconciler 去重。
 * - 业务字段缺失（例如 Application 尚无 interviewAt）时规则自然不触发，
 *   不做数据模型扩展。
 */

/* ── 阶段常量：优先取共享模块，Node 测试环境回退内联定义 ── */
const _shared = typeof globalThis !== 'undefined' && globalThis.WorkBuddyStages
  ? globalThis.WorkBuddyStages
  : null;
const KEYS = _shared ? _shared.KEYS : Object.freeze({
  DISCOVERED: 'discovered', CONTACTED: 'contacted', RESPONDED: 'responded',
  SCREENING: 'screening', TO_RECOMMEND: 'to_recommend', RECOMMENDED: 'recommended',
  CLIENT_ACCEPTED: 'client_accepted', INTERVIEW_PENDING: 'interview_pending',
  INTERVIEWING: 'interviewing', INTERVIEW_PASSED: 'interview_passed',
  OFFER: 'offer', OFFER_ACCEPTED: 'offer_accepted', PREBOARDING: 'preboarding',
  ONBOARDED: 'onboarded', PROBATION: 'probation', REGULARIZED: 'regularized',
  CLOSED: 'closed',
});
const GROUPS = _shared ? _shared.GROUPS : Object.freeze({
  RECOMMEND: Object.freeze([KEYS.RECOMMENDED, KEYS.CLIENT_ACCEPTED]),
  INTERVIEW: Object.freeze([KEYS.INTERVIEW_PENDING, KEYS.INTERVIEWING, KEYS.INTERVIEW_PASSED]),
  OFFER: Object.freeze([KEYS.OFFER, KEYS.OFFER_ACCEPTED]),
});
const STAGES = _shared ? _shared.STAGES : [];

const DAY_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_DUE_DAYS = 2; // 推荐后无反馈阈值（天）

/* ── 规则元数据（用于展示来源说明，不参与计算） ── */
const RULES = Object.freeze([
  { key: 'candidate.follow_up', label: '候选人跟进' },
  { key: 'application.client_feedback_due', label: '推荐反馈跟进' },
  { key: 'application.interview_reminder', label: '面试提醒' },
  { key: 'application.interview_feedback_due', label: '面试反馈' },
  { key: 'application.offer_follow_up', label: 'Offer 跟进' },
]);

function parseMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : NaN;
}

function startOfDay(ms) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isDeletedEntity(entity) {
  return !entity || String(entity.status || '') === 'deleted';
}

/** 最近一次业务活动时间：最后 Pipeline Event → 阶段进入时间 → 更新时间 → 创建时间 */
function lastActivityAt(application, nowMs) {
  const events = (Array.isArray(application.pipelineEvents) ? application.pipelineEvents : [])
    .map(event => parseMs(event && event.occurredAt))
    .filter(ms => Number.isFinite(ms));
  if (events.length) return Math.max(...events);
  const fallback = [application.stageEnteredAt, application.updatedAt, application.createdAt]
    .map(parseMs)
    .find(ms => Number.isFinite(ms));
  return Number.isFinite(fallback) ? fallback : nowMs;
}

/** 是否存在晚于 reference 的 Pipeline Event（用于"无后续事件"判断） */
function hasEventAfter(application, referenceMs) {
  return (Array.isArray(application.pipelineEvents) ? application.pipelineEvents : [])
    .some(event => {
      const ms = parseMs(event && event.occurredAt);
      return Number.isFinite(ms) && ms > referenceMs;
    });
}

/** Offer / Offer 已接受 阶段的 SLA 天数 */
function offerSlaDays(stage) {
  if (STAGES.length) {
    const stageMeta = STAGES.find(item => item.key === stage);
    const sla = stageMeta && typeof stageMeta.slaDays === 'number' ? stageMeta.slaDays : null;
    if (sla !== null && sla > 0) return sla;
  }
  return stage === KEYS.OFFER ? 5 : 10;
}

function formatDateForDisplay(value) {
  const ms = parseMs(value);
  if (!Number.isFinite(ms)) return String(value || '');
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 构建 Application 规则通用的副标题与关联字段 */
function buildApplicationTodoBase(application, context) {
  const candidateName = context.candidate ? (context.candidate.name || '候选人') : '候选人';
  const companyName = context.company ? (context.company.name || '公司') : '公司';
  const positionTitle = context.position ? (context.position.title || '岗位') : '岗位';
  const owner = application.owner
    || (context.candidate ? context.candidate.owner : '')
    || (context.position ? context.position.owner : '')
    || '';
  return {
    source: 'system',
    status: 'pending',
    entityType: 'application',
    entityId: application.id,
    applicationId: application.id,
    candidateId: application.candidateId || (context.candidate ? context.candidate.id : ''),
    companyId: application.companyId || (context.company ? context.company.id : ''),
    positionId: application.positionId || (context.position ? context.position.id : ''),
    owner,
    linkType: 'application',
    linkId: application.id,
    subtitle: `${candidateName} · ${companyName} / ${positionTitle}`,
  };
}

/**
 * 输入当前业务数据，输出理论上应存在的 System Todo 列表。
 *
 * @param {Object} input
 * @param {Array}  input.candidates
 * @param {Array}  input.companies
 * @param {Array}  input.positions
 * @param {Array}  input.applications
 * @param {string|number} input.now   当前时间（ISO 或时间戳）
 * @returns {Array<Object>}
 */
export function deriveSystemTodos(input = {}) {
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  const companies = Array.isArray(input.companies) ? input.companies : [];
  const positions = Array.isArray(input.positions) ? input.positions : [];
  const applications = Array.isArray(input.applications) ? input.applications : [];
  const nowMs = parseMs(input.now) || Date.now();
  const todayStart = startOfDay(nowMs);
  const tomorrowStart = todayStart + DAY_MS;
  const derived = [];

  const positionById = new Map(positions.map(item => [item.id, item]));
  const companyById = new Map(companies.map(item => [item.id, item]));

  /* ── Rule 1：候选人今日需跟进 ── */
  candidates.forEach(candidate => {
    if (isDeletedEntity(candidate) || !candidate.id) return;
    const followUpMs = parseMs(candidate.nextFollowupAt || candidate.followUpAt || '');
    if (!Number.isFinite(followUpMs)) return;
    if (followUpMs > todayStart + DAY_MS - 1) return; // 晚于今天
    const name = candidate.name || '候选人';
    const currentCompany = candidate.currentCompany || '';
    const currentTitle = candidate.currentTitle || '';
    const subtitleParts = [name];
    if (currentCompany || currentTitle) subtitleParts.push([currentCompany, currentTitle].filter(Boolean).join(' / '));
    derived.push({
      source: 'system',
      ruleKey: 'candidate.follow_up',
      dedupeKey: `candidate.follow_up:${candidate.id}:${formatDateForDisplay(followUpMs)}`,
      title: '跟进候选人',
      subtitle: subtitleParts.join(' · '),
      type: 'followup',
      dueAt: formatDateForDisplay(followUpMs),
      entityType: 'candidate',
      entityId: candidate.id,
      candidateId: candidate.id,
      owner: candidate.owner || '',
      linkType: 'candidate',
      linkId: candidate.id,
      status: 'pending',
    });
  });

  /* ── Rule 2 / 3 / 4 / 5：Application 维度 ── */
  applications.forEach(application => {
    if (!application || !application.id) return;
    const entityStatus = String(application.status || '');
    if (entityStatus === 'deleted' || entityStatus === 'archived') return;
    const stage = String(application.stage || '');
    const context = {
      candidate: candidates.find(item => item.id === application.candidateId),
      company: companyById.get(application.companyId),
      position: positionById.get(application.positionId),
    };
    const base = buildApplicationTodoBase(application, context);

    /* Rule 2：推荐后客户长期无反馈（推荐 / 客户审核类阶段） */
    if ((GROUPS.RECOMMEND || []).includes(stage)) {
      const lastActivity = lastActivityAt(application, nowMs);
      if (Number.isFinite(lastActivity) && nowMs - lastActivity > FEEDBACK_DUE_DAYS * DAY_MS) {
        derived.push({
          ...base,
          ruleKey: 'application.client_feedback_due',
          dedupeKey: `application.client_feedback_due:${application.id}`,
          title: '跟进客户反馈',
          type: 'followup',
          dueAt: formatDateForDisplay(lastActivity + FEEDBACK_DUE_DAYS * DAY_MS),
        });
      }
    }

    const interviewMs = parseMs(application.interviewAt || '');
    if (Number.isFinite(interviewMs)) {
      /* Rule 3：明日面试提醒 */
      if (interviewMs >= tomorrowStart && interviewMs < tomorrowStart + DAY_MS) {
        derived.push({
          ...base,
          ruleKey: 'application.interview_reminder',
          dedupeKey: `application.interview_reminder:${application.id}:${formatDateForDisplay(interviewMs)}`,
          title: '明日面试',
          subtitle: `${base.subtitle} · 面试时间 ${formatDateForDisplay(interviewMs)}`,
          type: 'interview',
          dueAt: formatDateForDisplay(interviewMs),
        });
      }
      /* Rule 4：面试结束未反馈（仍处于面试阶段，且无晚于面试时间的事件） */
      if (interviewMs < nowMs && (GROUPS.INTERVIEW || []).includes(stage) && !hasEventAfter(application, interviewMs)) {
        derived.push({
          ...base,
          ruleKey: 'application.interview_feedback_due',
          dedupeKey: `application.interview_feedback_due:${application.id}:${formatDateForDisplay(interviewMs)}`,
          title: '补充面试反馈',
          type: 'interview',
          dueAt: formatDateForDisplay(interviewMs),
        });
      }
    }

    /* Rule 5：Offer 长时间未更新 */
    if ((GROUPS.OFFER || []).includes(stage)) {
      const lastActivity = lastActivityAt(application, nowMs);
      const slaDays = offerSlaDays(stage);
      if (Number.isFinite(lastActivity) && nowMs - lastActivity > slaDays * DAY_MS) {
        derived.push({
          ...base,
          ruleKey: 'application.offer_follow_up',
          dedupeKey: `application.offer_follow_up:${application.id}`,
          title: '跟进 Offer 意向',
          type: 'recommend',
          dueAt: formatDateForDisplay(lastActivity + slaDays * DAY_MS),
        });
      }
    }
  });

  return derived;
}

export function getTodoRuleMeta() {
  return { RULES, KEYS, GROUPS };
}

if (typeof window !== 'undefined') {
  window.WorkBuddyTodoRuleEngine = { RULES, KEYS, GROUPS, deriveSystemTodos, getTodoRuleMeta };
}
