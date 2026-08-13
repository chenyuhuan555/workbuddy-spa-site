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
    extraValue,
    candidateSearchText,
    applicationBusinessAt,
    activeCandidateFlows,
    buildCandidateRow,
    buildRows,
  });
});
