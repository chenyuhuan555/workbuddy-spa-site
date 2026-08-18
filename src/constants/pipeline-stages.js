/**
 * 猎头工作台 — 流水线阶段共享常量（单一数据源）
 *
 * 所有阶段 key、分组、原因码均在此定义。
 * 其他模块通过 window.WorkBuddyStages 引用，杜绝魔法字符串。
 *
 * 加载顺序：必须在 WorkBuddyPipeline / WorkbenchV2 / Vue 应用之前。
 */
(function () {
  'use strict';

  /* ── 阶段 key 枚举 ── */
  const KEYS = Object.freeze({
    DISCOVERED:        'discovered',
    CONTACTED:         'contacted',
    RESPONDED:         'responded',
    SCREENING:         'screening',
    TO_RECOMMEND:      'to_recommend',
    RECOMMENDED:       'recommended',
    CLIENT_ACCEPTED:   'client_accepted',
    INTERVIEW_PENDING: 'interview_pending',
    INTERVIEWING:      'interviewing',
    INTERVIEW_PASSED:  'interview_passed',
    OFFER:             'offer',
    OFFER_ACCEPTED:    'offer_accepted',
    PREBOARDING:       'preboarding',
    ONBOARDED:         'onboarded',
    PROBATION:         'probation',
    REGULARIZED:       'regularized',
    CLOSED:            'closed',
  });

  /* ── 阶段元数据（key → 中文标签 + SLA 天数） ── */
  const STAGES = Object.freeze([
    { key: KEYS.DISCOVERED,        label: '已发现',      slaDays: 2 },
    { key: KEYS.CONTACTED,         label: '已触达',      slaDays: 3 },
    { key: KEYS.RESPONDED,         label: '已回复',      slaDays: 2 },
    { key: KEYS.SCREENING,         label: '顾问预筛',    slaDays: 2 },
    { key: KEYS.TO_RECOMMEND,      label: '待推荐',      slaDays: 2 },
    { key: KEYS.RECOMMENDED,       label: '已推荐',      slaDays: 3 },
    { key: KEYS.CLIENT_ACCEPTED,   label: '客户接受',    slaDays: 3 },
    { key: KEYS.INTERVIEW_PENDING, label: '待面试',      slaDays: 5 },
    { key: KEYS.INTERVIEWING,      label: '面试中',      slaDays: 5 },
    { key: KEYS.INTERVIEW_PASSED,  label: '面试通过',    slaDays: 3 },
    { key: KEYS.OFFER,             label: 'Offer 沟通',  slaDays: 5 },
    { key: KEYS.OFFER_ACCEPTED,    label: 'Offer 已接受', slaDays: 10 },
    { key: KEYS.PREBOARDING,       label: '待入职',      slaDays: 7 },
    { key: KEYS.ONBOARDED,         label: '已入职',      slaDays: 7 },
    { key: KEYS.PROBATION,         label: '试用期',      slaDays: 30 },
    { key: KEYS.REGULARIZED,       label: '已转正',      slaDays: null },
    { key: KEYS.CLOSED,            label: '已终止',      slaDays: null },
  ]);

  /* ── 推进 / 终止原因码 ── */
  const REASONS = Object.freeze([
    ['qualified',           '预筛通过',         'positive'],
    ['submitted_to_client', '已推荐客户',       'positive'],
    ['client_approved',     '客户接受',         'positive'],
    ['interview_passed',    '面试通过',         'positive'],
    ['offer_accepted',      '接受录用',         'positive'],
    ['started',             '确认入职',         'positive'],
    ['regularized',         '成功转正',         'positive'],
    ['no_response',         '多次联系无回复',   'negative'],
    ['not_interested',      '候选人无意向',     'negative'],
    ['compensation',        '薪资不匹配',       'negative'],
    ['location',            '地点或通勤不匹配', 'negative'],
    ['skill_gap',           '能力或经验不足',   'negative'],
    ['client_rejected',     '客户拒绝',         'negative'],
    ['interview_failed',    '面试未通过',       'negative'],
    ['counter_offer',       '接受原公司挽留',   'negative'],
    ['competing_offer',     '接受其他录用',     'negative'],
    ['no_show',             '爽约或未入职',     'negative'],
    ['probation_failed',    '试用期未通过',     'negative'],
    ['role_closed',         '岗位关闭或暂停',   'negative'],
    ['other',               '其他',             'negative'],
  ].map(([key, label, group]) => Object.freeze({ key, label, group })));

  /* ── 常用阶段分组（仪表盘、漏斗、筛选共用） ── */
  const GROUPS = Object.freeze({
    DISCOVER:  Object.freeze([KEYS.DISCOVERED, KEYS.CONTACTED, KEYS.RESPONDED]),
    SCREEN:    Object.freeze([KEYS.SCREENING, KEYS.TO_RECOMMEND]),
    RECOMMEND: Object.freeze([KEYS.RECOMMENDED, KEYS.CLIENT_ACCEPTED]),
    INTERVIEW: Object.freeze([KEYS.INTERVIEW_PENDING, KEYS.INTERVIEWING, KEYS.INTERVIEW_PASSED]),
    OFFER:     Object.freeze([KEYS.OFFER, KEYS.OFFER_ACCEPTED]),
    ONBOARD:   Object.freeze([KEYS.PREBOARDING, KEYS.ONBOARDED, KEYS.PROBATION, KEYS.REGULARIZED]),
  });

  /* ── UI 分组（推进中心下拉、筛选器） ── */
  const STAGE_GROUPS = Object.freeze([
    { key: 'discover',  label: '人才发现',   stages: GROUPS.DISCOVER },
    { key: 'screen',    label: '顾问筛选',   stages: GROUPS.SCREEN },
    { key: 'recommend', label: '客户推荐',   stages: GROUPS.RECOMMEND },
    { key: 'interview', label: '面试',       stages: GROUPS.INTERVIEW },
    { key: 'offer',     label: '录用与入职', stages: Object.freeze([...GROUPS.OFFER, ...GROUPS.ONBOARD]) },
    { key: 'closed',    label: '结束',       stages: Object.freeze([KEYS.CLOSED]) },
  ]);

  /* ── 阶段优先级（候选人去重排序、漏斗分桶） ── */
  function stagePriority(s) {
    if (GROUPS.ONBOARD.includes(s))   return 5;
    if (GROUPS.OFFER.includes(s))     return 4;
    if (GROUPS.INTERVIEW.includes(s)) return 3;
    if (GROUPS.SCREEN.includes(s))    return 2;
    if (GROUPS.DISCOVER.includes(s))  return 1;
    return 0;
  }

  window.WorkBuddyStages = Object.freeze({
    KEYS,
    STAGES,
    REASONS,
    GROUPS,
    STAGE_GROUPS,
    stagePriority,
  });
})();
