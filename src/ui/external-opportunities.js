;(function initExternalOpportunities(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyExternalOpportunities = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createExternalOpportunities() {
  'use strict';

  // 阶段枚举：priority 数字越小代表越深（严格升序，避免重复）
  const STAGE_OPTIONS = [
    { value: 'Offer', label: 'Offer', priority: 1 },
    { value: '待入职', label: '待入职', priority: 2 },
    { value: '谈薪', label: '谈薪', priority: 3 },
    { value: '谈第一轮薪资', label: '谈第一轮薪资', priority: 4 },
    { value: '待谈薪', label: '待谈薪', priority: 5 },
    { value: '面试', label: '面试', priority: 6 },
    { value: '初筛', label: '初筛', priority: 7 },
    { value: '已沟通', label: '已沟通', priority: 8 },
  ];
  const CLOSED_STAGES = ['已结束', '已拒', 'Pass', '流程关闭'];
  const STAGE_PRIORITY_BY_VALUE = (function buildPriority() {
    const map = {};
    STAGE_OPTIONS.forEach(opt => { map[opt.value] = opt.priority; });
    return map;
  })();

  const INTENTION_OPTIONS = [
    { value: '高', label: '高' },
    { value: '较高', label: '较高' },
    { value: '中等', label: '中等' },
    { value: '较低', label: '较低' },
    { value: '低', label: '低' },
  ];

  const COMPANY_TYPE_OPTIONS = [
    { value: '国企', label: '国企' },
    { value: '民营', label: '民营' },
    { value: '外企', label: '外企' },
    { value: '合资', label: '合资' },
    { value: '初创', label: '初创' },
    { value: '上市公司', label: '上市公司' },
    { value: '其他', label: '其他' },
  ];

  function isClosedStage(stage) {
    if (!stage) return true;
    return CLOSED_STAGES.indexOf(String(stage).trim()) >= 0;
  }

  function stagePriority(stage) {
    if (!stage) return 999;
    if (STAGE_PRIORITY_BY_VALUE[stage] != null) return STAGE_PRIORITY_BY_VALUE[stage];
    // 未知阶段当作"已沟通"之后
    return 9;
  }

  function stageLabel(stage) {
    if (!stage) return '未填写';
    const hit = STAGE_OPTIONS.find(item => item.value === stage);
    return hit ? hit.label : String(stage);
  }

  function stageBadgeClass(stage) {
    if (stage === 'Offer') return 'bg-violet-50 text-violet-700';
    if (stage === '待入职') return 'bg-violet-50 text-violet-700';
    if (stage === '谈薪' || stage === '待谈薪' || stage === '谈第一轮薪资') return 'bg-blue-50 text-blue-700';
    if (stage === '面试' || stage === '初筛') return 'bg-slate-50 text-slate-600';
    if (isClosedStage(stage)) return 'bg-slate-50 text-slate-400';
    return 'bg-slate-50 text-slate-600';
  }

  function intentionBadgeClass(intention) {
    if (intention === '高') return 'bg-emerald-50 text-emerald-700';
    if (intention === '较高') return 'bg-emerald-50 text-emerald-600';
    if (intention === '中等') return 'bg-orange-50 text-orange-700';
    if (intention === '较低' || intention === '低') return 'bg-slate-50 text-slate-500';
    return 'bg-slate-50 text-slate-500';
  }

  // 时间格式化：今天 10:30 / 昨天 16:45 / 8/16 09:20 / 2026/01/05
  function formatUpdatedAt(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    const now = new Date();
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (sameDay(date, now)) return `今天 ${hm}`;
    if (sameDay(date, yesterday)) return `昨天 ${hm}`;
    if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()} ${hm}`;
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  }

  function normalizeOpp(value) {
    if (!value || typeof value !== 'object') return null;
    const companyName = String(value.companyName || '').trim();
    if (!companyName) return null;
    return {
      id: String(value.id || ''),
      companyName,
      companyType: String(value.companyType || '').trim(),
      companyDirection: String(value.companyDirection || '').trim(),
      base: String(value.base || '').trim(),
      stage: String(value.stage || '').trim(),
      intention: String(value.intention || '').trim(),
      workContent: String(value.workContent || '').trim(),
      feeling: String(value.feeling || '').trim(),
      concern: String(value.concern || '').trim(),
      compensation: String(value.compensation || '').trim(),
      remark: String(value.remark || '').trim(),
      updatedAt: String(value.updatedAt || ''),
    };
  }

  function readOpportunities(candidate) {
    if (!candidate) return [];
    const raw = candidate.externalOpportunities;
    if (!Array.isArray(raw)) return [];
    const list = raw.map(normalizeOpp).filter(Boolean);
    return list;
  }

  function createDraft(existing) {
    const base = existing || {};
    return {
      id: String(base.id || ''),
      companyName: String(base.companyName || ''),
      companyType: String(base.companyType || ''),
      companyDirection: String(base.companyDirection || ''),
      base: String(base.base || ''),
      stage: String(base.stage || ''),
      intention: String(base.intention || ''),
      workContent: String(base.workContent || ''),
      feeling: String(base.feeling || ''),
      concern: String(base.concern || ''),
      compensation: String(base.compensation || ''),
      remark: String(base.remark || ''),
    };
  }

  function validate(draft) {
    if (!draft || typeof draft !== 'object') return { ok: false, error: '请填写公司机会信息' };
    const companyName = String(draft.companyName || '').trim();
    if (!companyName) return { ok: false, error: '公司名称不能为空' };
    return { ok: true, error: '' };
  }

  function buildOpportunity(existing, draft, nowIso) {
    const now = typeof nowIso === 'function' ? nowIso() : new Date().toISOString();
    const id = (existing && existing.id) || `eo_${now.replace(/[^0-9]/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id,
      companyName: String(draft.companyName || '').trim(),
      companyType: String(draft.companyType || '').trim(),
      companyDirection: String(draft.companyDirection || '').trim(),
      base: String(draft.base || '').trim(),
      stage: String(draft.stage || '').trim(),
      intention: String(draft.intention || '').trim(),
      workContent: String(draft.workContent || '').trim(),
      feeling: String(draft.feeling || '').trim(),
      concern: String(draft.concern || '').trim(),
      compensation: String(draft.compensation || '').trim(),
      remark: String(draft.remark || '').trim(),
      updatedAt: now,
    };
  }

  function applyAdd(list, draft, nowIso) {
    const current = Array.isArray(list) ? list.slice() : [];
    const opp = buildOpportunity(null, draft, nowIso);
    current.push(opp);
    return current;
  }

  function applyEdit(list, id, draft, nowIso) {
    const current = Array.isArray(list) ? list.slice() : [];
    const targetId = String(id || '');
    const index = current.findIndex(item => String(item.id) === targetId);
    if (index < 0) return { list: current, changed: false };
    const previous = current[index];
    const next = buildOpportunity(previous, draft, nowIso);
    next.id = previous.id; // 保持原 id
    current[index] = next;
    return { list: current, changed: true };
  }

  function applyRemove(list, id) {
    const current = Array.isArray(list) ? list.slice() : [];
    const targetId = String(id || '');
    return current.filter(item => String(item.id) !== targetId);
  }

  function sortByUpdatedDesc(list) {
    const current = Array.isArray(list) ? list.slice() : [];
    return current.sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  }

  // 摘要派生：求职进展统计 + 期望年包/重点顾虑/总体判断（来自 preferences）
  function summary({ opportunities, preferences } = {}) {
    const opps = Array.isArray(opportunities) ? opportunities : [];
    const inProcess = opps.filter(item => !isClosedStage(item.stage)).length;
    const negotiatingStages = ['谈薪', '待谈薪', '谈第一轮薪资'];
    const negotiatingCount = opps.filter(item => negotiatingStages.indexOf(item.stage) >= 0).length;

    let deepestStage = null;
    opps.forEach(item => {
      if (isClosedStage(item.stage)) return;
      if (!deepestStage) { deepestStage = item.stage; return; }
      if (stagePriority(item.stage) < stagePriority(deepestStage)) deepestStage = item.stage;
    });
    const deepestStageCount = deepestStage
      ? opps.filter(item => item.stage === deepestStage && !isClosedStage(item.stage)).length
      : 0;

    const prefs = preferences && typeof preferences === 'object' ? preferences : {};
    const expectedCompensation = String(prefs.expectedCompensation || '').trim();
    const concernsRaw = Array.isArray(prefs.concerns) ? prefs.concerns : [];
    const keyConcerns = concernsRaw.map(item => String(item || '').trim()).filter(Boolean);
    const overallAssessment = String(prefs.overallAssessment || '').trim();

    return {
      inProcess,
      deepestStage,
      deepestStageCount,
      negotiatingCount,
      expectedCompensation,
      keyConcerns,
      overallAssessment,
    };
  }

  return {
    STAGE_OPTIONS,
    INTENTION_OPTIONS,
    COMPANY_TYPE_OPTIONS,
    CLOSED_STAGES,
    isClosedStage,
    stagePriority,
    stageLabel,
    stageBadgeClass,
    intentionBadgeClass,
    formatUpdatedAt,
    normalizeOpp,
    readOpportunities,
    createDraft,
    validate,
    buildOpportunity,
    applyAdd,
    applyEdit,
    applyRemove,
    sortByUpdatedDesc,
    summary,
  };
});
