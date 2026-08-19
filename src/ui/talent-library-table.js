;(function initTalentLibraryTable(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentLibraryTable = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentLibraryTable() {
  'use strict';

  const COLUMN_DEFINITIONS = Object.freeze([
    { key: 'name', label: '姓名', locked: true },
    { key: 'companyTitle', label: '当前公司 / 当前岗位' },
    { key: 'age', label: '年龄' },
    { key: 'education', label: '学历' },
    { key: 'resumeSummary', label: '履历摘要' },
    { key: 'currentBase', label: '当前 Base' },
    { key: 'expectedBase', label: '期望 Base' },
    { key: 'currentSalary', label: '当前薪酬' },
    { key: 'expectedSalary', label: '期望薪酬' },
    { key: 'motivation', label: '求职动机' },
    { key: 'availability', label: '到岗周期' },
    { key: 'recommendationComment', label: '推荐评语' },
    { key: 'flows', label: '目前流程' },
    { key: 'owner', label: '归属顾问' },
    { key: 'touchedAt', label: '最近触达' },
    { key: 'intakeAt', label: '入库日期' },
    { key: 'updatedAt', label: '更新时间' },
    { key: 'remark', label: '备注' },
  ]);

  const DEFAULT_COLUMN_KEYS = Object.freeze([
    'name', 'companyTitle', 'age', 'resumeSummary', 'currentBase', 'expectedBase',
    'currentSalary', 'expectedSalary', 'motivation', 'flows', 'owner', 'touchedAt', 'intakeAt',
  ]);

  const COLUMN_STORAGE_KEY = 'wb_talent_library_columns_v1';
  const TOUCH_STAGES = new Set(['contacted', 'responded']);

  const EXTRA_ALIASES = Object.freeze({
    age: ['年龄', 'age'],
    expectedBase: ['期望base地', '期望 Base', '期望base', '期望城市'],
    currentSalary: ['薪酬信息（月薪+奖金+股票等其他激励）', '当前薪酬', '薪酬'],
    expectedSalary: ['期望薪酬及依据', '期望薪酬'],
    motivation: ['换工作动机/诉求', '求职动机', '求职诉求'],
    availability: ['离职/到岗周期', '到岗周期'],
    recommendationComment: ['推荐评语', '推荐评价'],
    remark: ['备注', '说明'],
  });

  const text = value => String(value ?? '').trim();
  const display = value => text(value) || '-';
  const parseTime = value => Number.isFinite(Date.parse(value || '')) ? Date.parse(value) : Number.NEGATIVE_INFINITY;
  const indexById = rows => new Map((Array.isArray(rows) ? rows : []).map(row => [row?.id, row]));

  function extraValue(candidate, key) {
    const extras = candidate?.extraFields && typeof candidate.extraFields === 'object' ? candidate.extraFields : {};
    for (const alias of EXTRA_ALIASES[key] || []) {
      if (text(extras[alias])) return text(extras[alias]);
    }
    return '';
  }

  function candidateSearchText(candidate = {}) {
    return [
      candidate.name, candidate.currentCompany, candidate.currentTitle, candidate.city,
      candidate.education, candidate.summary, candidate.profileText,
      ...(candidate.skills || []), ...(candidate.tags || []), ...(candidate.directions || []),
      ...Object.values(candidate.extraFields || {}),
      ...(candidate.resumeVersions || []).flatMap(version => [version?.fileName, version?.rawText, version?.formattedText]),
    ].filter(Boolean).join(' ');
  }

  function applicationBusinessAt(application = {}) {
    const eventAt = (application.pipelineEvents || [])
      .map(event => event?.occurredAt)
      .filter(value => parseTime(value) > Number.NEGATIVE_INFINITY)
      .sort((a, b) => parseTime(b) - parseTime(a))[0];
    return eventAt || [application.stageEnteredAt, application.updatedAt, application.createdAt]
      .find(value => parseTime(value) > Number.NEGATIVE_INFINITY) || '';
  }

  function eventAt(application, predicate, pick = 'last') {
    const values = (application?.pipelineEvents || [])
      .filter(predicate)
      .map(event => event?.occurredAt)
      .filter(value => parseTime(value) > Number.NEGATIVE_INFINITY)
      .sort((a, b) => parseTime(a) - parseTime(b));
    return pick === 'first' ? values[0] || '' : values.at(-1) || '';
  }

  function applicationTouchedAt(application) {
    return eventAt(application, event => event?.type === 'communication' || TOUCH_STAGES.has(event?.toStage));
  }

  function applicationRecommendedAt(application) {
    return eventAt(application, event => event?.toStage === 'recommended', 'first');
  }

  function candidateEventDate(applications, candidateId, resolver, pick = 'last') {
    const values = (applications || [])
      .filter(application => application?.candidateId === candidateId && !application.deletedAt && application.status !== 'archived')
      .map(resolver)
      .filter(value => parseTime(value) > Number.NEGATIVE_INFINITY)
      .sort((a, b) => parseTime(a) - parseTime(b));
    return pick === 'first' ? values[0] || '' : values.at(-1) || '';
  }

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

  function filterRows(rows = [], filters = {}, now = new Date()) {
    const query = text(filters.query).toLowerCase();
    const sourceCompanyId = text(filters.sourceCompanyId);
    const sourceChannelId = text(filters.sourceChannelId);
    return rows.filter(row => {
      if (query && !text(row.searchText).toLowerCase().includes(query)) return false;
      if (filters.owner && filters.owner !== 'all' && !text(row.owner).split(/[、,，/／|\n;；]+/).map(text).includes(text(filters.owner))) return false;
      if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
      if (sourceCompanyId && sourceCompanyId !== 'all' && text(row.sourceCompanyId) !== sourceCompanyId) return false;
      if (sourceChannelId && sourceChannelId !== 'all' && text(row.sourceChannelId) !== sourceChannelId) return false;
      if (filters.base && filters.base !== 'all' && !`${text(row.currentBase)} ${text(row.expectedBase)}`.toLowerCase().includes(text(filters.base).toLowerCase())) return false;
      if (filters.education && filters.education !== 'all' && !text(row.education).toLowerCase().includes(text(filters.education).toLowerCase())) return false;
      if (filters.stage && filters.stage !== 'all' && !(row.flows || []).some(flow => flow.stage === filters.stage)) return false;
      if (filters.positionId && filters.positionId !== 'all' && !(row.flows || []).some(flow => flow.positionId === filters.positionId)) return false;
      if (!matchesDateFilter(row.intakeAt, filters.intake, now)) return false;
      if (!matchesDateFilter(row.touchedAt, filters.touch, now)) return false;
      if (!matchesDateFilter(row.recommendedAt, filters.recommendation, now)) return false;
      return true;
    });
  }

  function normalizedColumnKeys(keys) {
    const allowed = new Set(COLUMN_DEFINITIONS.map(column => column.key));
    const requested = new Set((Array.isArray(keys) ? keys : []).filter(key => allowed.has(key)));
    requested.add('name');
    return COLUMN_DEFINITIONS.map(column => column.key).filter(key => requested.has(key));
  }

  function loadColumnKeys(storage = globalThis.localStorage) {
    try {
      const raw = storage?.getItem(COLUMN_STORAGE_KEY);
      if (!raw) return [...DEFAULT_COLUMN_KEYS];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizedColumnKeys(parsed) : [...DEFAULT_COLUMN_KEYS];
    } catch {
      return [...DEFAULT_COLUMN_KEYS];
    }
  }

  function saveColumnKeys(storage = globalThis.localStorage, keys = DEFAULT_COLUMN_KEYS) {
    const normalized = normalizedColumnKeys(keys);
    try { storage?.setItem(COLUMN_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
    return normalized;
  }

  function summarizeRows(rows = [], now = new Date()) {
    return {
      total: rows.length,
      weekIntake: rows.filter(row => matchesDateFilter(row.intakeAt, { preset: 'week' }, now)).length,
      weekTouched: rows.filter(row => matchesDateFilter(row.touchedAt, { preset: 'week' }, now)).length,
    };
  }

  function activeCandidateFlows({ candidateId, applications = [], positions = [], companies = [], stageLabel = value => value } = {}) {
    const positionById = indexById(positions);
    const companyById = indexById(companies);
    return applications
      .filter(application => application?.candidateId === candidateId && !application.deletedAt && application.status !== 'archived' && application.stage !== 'closed')
      .map(application => {
        const position = positionById.get(application.positionId);
        const company = companyById.get(application.companyId || position?.companyId);
        return {
          applicationId: application.id,
          positionId: application.positionId,
          companyName: text(company?.name) || '公司已删除',
          positionTitle: text(position?.title) || '岗位已删除',
          stage: text(application.stage),
          stageLabel: text(stageLabel(application.stage)) || '未推进',
          businessAt: applicationBusinessAt(application),
        };
      })
      .sort((a, b) => parseTime(b.businessAt) - parseTime(a.businessAt));
  }

  function buildCandidateRow({ candidate = {}, applications = [], positions = [], companies = [], stageLabel } = {}) {
    const flows = activeCandidateFlows({ candidateId: candidate.id, applications, positions, companies, stageLabel });
    const touchedAt = candidateEventDate(applications, candidate.id, applicationTouchedAt, 'last');
    const recommendedAt = candidateEventDate(applications, candidate.id, applicationRecommendedAt, 'first');
    return {
      ...candidate,
      candidate,
      id: candidate.id,
      age: display(candidate.age || extraValue(candidate, 'age')),
      education: display(candidate.education),
      resumeSummary: display(candidate.resumeSummary || candidate.summary || candidate.profileText),
      currentBase: display(candidate.city),
      expectedBase: display(candidate.expectedBase || extraValue(candidate, 'expectedBase')),
      currentSalary: display(candidate.currentSalary || extraValue(candidate, 'currentSalary')),
      expectedSalary: display(candidate.expectedSalary || extraValue(candidate, 'expectedSalary')),
      motivation: display(candidate.motivation || extraValue(candidate, 'motivation')),
      availability: display(candidate.availability || extraValue(candidate, 'availability')),
      recommendationComment: display(candidate.recommendationComment || extraValue(candidate, 'recommendationComment')),
      remark: display(candidate.remark || extraValue(candidate, 'remark')),
      owner: display(candidate.owner),
      touchedAt: display(touchedAt),
      recommendedAt: display(recommendedAt),
      intakeAt: display(candidate.createdAt),
      updatedAt: display(candidate.updatedAt),
      flows,
      primaryFlow: flows[0] || null,
      extraFlowCount: Math.max(0, flows.length - 1),
      searchText: candidateSearchText(candidate),
    };
  }

  function buildRows({ candidates = [], applications = [], positions = [], companies = [], stageLabel } = {}) {
    return candidates.map(candidate => buildCandidateRow({ candidate, applications, positions, companies, stageLabel }));
  }

  return Object.freeze({
    COLUMN_DEFINITIONS,
    DEFAULT_COLUMN_KEYS,
    COLUMN_STORAGE_KEY,
    extraValue,
    candidateSearchText,
    applicationBusinessAt,
    applicationTouchedAt,
    applicationRecommendedAt,
    activeCandidateFlows,
    buildCandidateRow,
    buildRows,
    rangeForDateFilter,
    matchesDateFilter,
    filterRows,
    normalizedColumnKeys,
    loadColumnKeys,
    saveColumnKeys,
    summarizeRows,
  });
});
