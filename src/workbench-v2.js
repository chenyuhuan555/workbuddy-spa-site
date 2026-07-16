(function (root) {
  'use strict';

  const VERSION = 2;
  const APPLICATION_STAGES = ['discovered', 'contacted', 'responded', 'screening', 'to_recommend', 'recommended', 'client_accepted', 'interview_pending', 'interviewing', 'interview_passed', 'offer', 'offer_accepted', 'preboarding', 'onboarded', 'probation', 'regularized', 'closed'];

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createEmptyBundle() {
    return {
      schemaVersion: VERSION,
      companies: [],
      positions: [],
      candidates: [],
      applications: [],
      todos: [],
      aiArtifacts: [],
      activities: [],
      notes: [],
      migrationMeta: {},
      settings: {},
    };
  }

  function stamp(prefix, defaults, input) {
    const source = copy(input || {});
    const timestamp = nowIso();
    return {
      id: source.id || makeId(prefix),
      createdAt: source.createdAt || timestamp,
      updatedAt: source.updatedAt || timestamp,
      ...defaults,
      ...source,
    };
  }

  function createCompany(input = {}) {
    return stamp('co', { name: '', status: 'potential', owner: '' }, input);
  }

  function createPosition(input = {}) {
    return stamp('pos', { companyId: '', title: '', status: 'open', owner: '' }, input);
  }

  function findPosition(bundle, positionId) {
    const position = bundle.positions.find(item => item.id === positionId);
    if (!position) throw new Error('岗位不存在或已删除');
    return position;
  }

  function setPositionStatus(bundle, positionId, status) {
    if (!['open', 'closed'].includes(status)) throw new Error('岗位状态无效');
    const position = findPosition(bundle, positionId);
    position.status = status;
    position.updatedAt = nowIso();
    return position;
  }

  function deletePosition(bundle, positionId) {
    const position = findPosition(bundle, positionId);
    const applicationCount = bundle.applications.filter(item => item.positionId === positionId).length;
    if (applicationCount) {
      throw new Error(`该岗位已有 ${applicationCount} 条候选人推进记录，请关闭岗位以保留业务历史`);
    }
    bundle.positions.splice(bundle.positions.indexOf(position), 1);
    return position;
  }

  function createCandidate(input = {}) {
    return stamp('cand', {
      name: '',
      status: 'open',
      owner: '',
      tags: [],
      resumeVersions: [],
    }, input);
  }

  function createApplication(bundle, input = {}) {
    const candidate = bundle.candidates.find(item => item.id === input.candidateId);
    const position = bundle.positions.find(item => item.id === input.positionId);
    if (!candidate || !position) throw new Error('候选人或岗位不存在');

    const existing = bundle.applications.find(item => (
      item.candidateId === candidate.id
      && item.positionId === position.id
      && item.status !== 'archived'
    ));
    if (existing) throw new Error('该候选人已存在此岗位推进');

    const application = stamp('app', {
      companyId: position.companyId,
      stage: 'discovered',
      stageEnteredAt: nowIso(),
      pipelineEvents: [],
    }, input);
    bundle.applications.push(application);
    return application;
  }

  const TODO_TYPES = ['custom', 'interview', 'jd', 'recommend', 'update', 'followup'];
  const TODO_LINK_TYPES = ['none', 'candidate', 'position', 'company', 'application'];

  function createTodo(input = {}) {
    const linkType = TODO_LINK_TYPES.includes(input.linkType) ? input.linkType : 'none';
    return stamp('todo', {
      title: '',
      subtitle: '',
      type: 'custom',
      date: '',
      done: false,
      linkType,
      linkId: '',
      linkLabel: '',
    }, input);
  }

  function normalizeCompanyName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[（(].*?[）)]/g, '')
      .replace(/有限责任公司|股份有限公司|有限公司|集团|公司/g, '')
      .replace(/\s+/g, '');
  }

  function candidateIdentity(resume = {}) {
    if (resume.sourceResumeId) return { key: `source:${resume.sourceResumeId}`, hard: true };
    if (resume.phone) return { key: `phone:${String(resume.phone).replace(/\D/g, '')}`, hard: true };
    if (resume.email) return { key: `email:${String(resume.email).trim().toLowerCase()}`, hard: true };
    const name = String(resume.name || '').trim();
    const company = String(resume.currentCompany || '').trim();
    return { key: name || company ? `soft:${name}|${company}` : `unique:${resume.id || makeId('legacy')}`, hard: false };
  }

  // 旧版简历文本散落在多个字段，按可读性优先级综合取值，确保迁移时不丢文本
  function legacyResumeText(resume = {}) {
    return String(
      resume.electronicResumeText
      || resume.bossImportedText
      || resume.rawText
      || resume.resumeText
      || resume.candidateProfileText
      || resume.candidateSummary
      || ''
    ).trim();
  }

  function candidateFromLegacy(resume, owner) {
    const rawText = legacyResumeText(resume);
    // 原始文件（resume.data）为大体积 base64，迁移时若已加载会撑爆 localStorage，
    // 因此只携带文本；原件仍可在旧版工作台查看。
    const hasResume = Boolean(rawText || resume.name);
    return createCandidate({
      name: resume.name || '未命名候选人',
      phone: resume.phone || '',
      email: resume.email || '',
      currentCompany: resume.currentCompany || '',
      currentTitle: resume.currentTitle || resume.currentPosition || '',
      owner: resume.owner || resume.uploaderName || owner || '',
      sourceResumeId: resume.sourceResumeId || '',
      summary: resume.candidateSummary || '',
      keywords: copy(resume.candidateKeywords || []),
      profileText: resume.candidateProfileText || '',
      electronicResumeText: resume.electronicResumeText || '',
      resumeVersions: hasResume ? [{
        id: resume.id || makeId('resume'),
        sourceResumeId: resume.id || resume.sourceResumeId || '',
        fileName: resume.name || '',
        uploadedAt: resume.uploadedAt || nowIso(),
        rawText,
      }] : [],
    });
  }

  function applicationFromLegacy(resume, candidate, position, company, owner) {
    return stamp('app', {
      candidateId: candidate.id,
      positionId: position.id,
      companyId: company.id,
      owner: resume.owner || resume.uploaderName || owner || '',
      matchScore: Number.isFinite(Number(resume.aiScore)) ? Number(resume.aiScore) : null,
      matchReason: resume.evaluationReason || '',
      stage: resume.pipelineStage || 'discovered',
      stageEnteredAt: resume.pipelineStageEnteredAt || resume.uploadedAt || nowIso(),
      pipelineEvents: copy(resume.pipelineEvents || []),
      evaluation: resume.evaluation || 'pending',
      clientReport: resume.clientReport || '',
      note: resume.note || '',
    }, {});
  }

  function previewMigration(legacy = {}) {
    const source = copy(legacy);
    const bundle = createEmptyBundle();
    const idMap = { companies: {}, positions: {}, candidates: {}, applications: {} };
    const conflicts = [];
    const companies = new Map();
    const hardCandidates = new Map();
    const softCandidates = new Map();
    let sourceCompanies = 0;
    let sourcePositions = 0;
    let sourceResumes = 0;

    for (const column of source.columns || []) {
      for (const job of column.jobs || []) {
        sourceCompanies += 1;
        const companyName = job.company || job.name || '未命名公司';
        const companyKey = normalizeCompanyName(companyName) || `legacy:${job.id || sourceCompanies}`;
        let company = companies.get(companyKey);
        if (!company) {
          company = createCompany({
            name: companyName,
            owner: column.name || '',
            profileText: job.companyProfileText || '',
          });
          companies.set(companyKey, company);
          bundle.companies.push(company);
        }
        idMap.companies[job.id || `${column.name}:${companyName}`] = company.id;

        for (const legacyPosition of job.positions || []) {
          sourcePositions += 1;
          const position = createPosition({
            companyId: company.id,
            title: legacyPosition.name || legacyPosition.title || '未命名岗位',
            owner: legacyPosition.owner || column.name || '',
            status: legacyPosition.status || 'open',
            description: legacyPosition.description || legacyPosition.jd || '',
            sourceId: legacyPosition.id || '',
          });
          bundle.positions.push(position);
          idMap.positions[legacyPosition.id || position.id] = position.id;

          for (const resume of legacyPosition.resumes || []) {
            sourceResumes += 1;
            const identity = candidateIdentity(resume);
            let candidate = identity.hard ? hardCandidates.get(identity.key) : null;
            if (!candidate) {
              candidate = candidateFromLegacy(resume, column.name);
              bundle.candidates.push(candidate);
              if (identity.hard) {
                hardCandidates.set(identity.key, candidate);
              } else if (identity.key.startsWith('soft:')) {
                const first = softCandidates.get(identity.key);
                if (first) {
                  conflicts.push({
                    type: 'candidate-review',
                    identity: identity.key,
                    candidateIds: [first.id, candidate.id],
                    sourceResumeIds: [first.sourceResumeId || '', resume.id || ''],
                  });
                } else {
                  softCandidates.set(identity.key, candidate);
                }
              }
            }
            idMap.candidates[resume.id || candidate.id] = candidate.id;
            const application = applicationFromLegacy(resume, candidate, position, company, column.name);
            bundle.applications.push(application);
            idMap.applications[`${resume.id || candidate.id}:${legacyPosition.id || position.id}`] = application.id;
          }
        }
      }
    }

    return {
      bundle,
      idMap,
      conflicts,
      counts: {
        sourceCompanies,
        sourcePositions,
        sourceResumes,
        companies: bundle.companies.length,
        positions: bundle.positions.length,
        candidates: bundle.candidates.length,
        applications: bundle.applications.length,
        conflicts: conflicts.length,
      },
    };
  }

  function executeMigration(legacy, preview) {
    if (!preview || preview.bundle?.schemaVersion !== VERSION) throw new Error('迁移预检结果无效');
    return {
      bundle: copy(preview.bundle),
      snapshot: copy(legacy),
      log: {
        ...copy(preview.counts),
        executedAt: nowIso(),
        idMap: copy(preview.idMap),
      },
    };
  }

  function rollbackMigration(snapshot) {
    return copy(snapshot);
  }

  function validateBundle(input) {
    if (!input || input.schemaVersion !== VERSION) throw new Error('不支持的数据版本');
    const clean = createEmptyBundle();
    Object.keys(clean).forEach(key => {
      if (Array.isArray(clean[key])) clean[key] = Array.isArray(input[key]) ? copy(input[key]) : [];
      else if (input[key] && typeof input[key] === 'object') clean[key] = copy(input[key]);
    });
    clean.candidates.forEach(candidate => {
      const electronicText = String(candidate.electronicResumeText || '').trim();
      if (!Array.isArray(candidate.resumeVersions)) candidate.resumeVersions = [];
      if (!candidate.resumeVersions.length && electronicText) {
        candidate.resumeVersions.push({
          id: makeId('resume'),
          fileName: `${candidate.name || '候选人'}-电子简历`,
          uploadedAt: candidate.updatedAt || candidate.createdAt || nowIso(),
          rawText: electronicText,
        });
      } else if (candidate.resumeVersions[0] && !candidate.resumeVersions[0].rawText && electronicText) {
        candidate.resumeVersions[0].rawText = electronicText;
      }
      candidate.resumeVersions.forEach(version => {
        if (version && !version.sourceResumeId) version.sourceResumeId = version.id || '';
      });
    });
    return clean;
  }

  function filterCandidates(candidates, filters = {}) {
    const text = value => String(value || '').trim().toLowerCase();
    const includes = (value, query) => text(value).includes(text(query));
    return (candidates || []).filter(candidate => {
      if (filters.query) {
        const haystack = [candidate.name, candidate.currentCompany, candidate.currentTitle, candidate.city]
          .concat(candidate.skills || [], candidate.tags || [], candidate.directions || []).join(' ');
        if (!includes(haystack, filters.query)) return false;
      }
      if (filters.direction && filters.direction !== 'all' && !(candidate.directions || []).some(item => includes(item, filters.direction))) return false;
      if (filters.owner && filters.owner !== 'all' && candidate.owner !== filters.owner) return false;
      if (filters.city && filters.city !== 'all' && !includes(candidate.city, filters.city)) return false;
      if (filters.company && !includes(candidate.currentCompany, filters.company)) return false;
      if (filters.title && !includes(candidate.currentTitle, filters.title)) return false;
      if (filters.education && filters.education !== 'all' && !includes(candidate.education, filters.education)) return false;
      if (filters.source && filters.source !== 'all' && !includes(candidate.source, filters.source)) return false;
      if (filters.status && filters.status !== 'all' && candidate.status !== filters.status) return false;
      if (filters.tag && !(candidate.tags || []).some(item => includes(item, filters.tag))) return false;
      if (filters.experienceMin && Number(candidate.experienceYears || 0) < Number(filters.experienceMin)) return false;
      if (filters.experienceMax && Number(candidate.experienceYears || 0) > Number(filters.experienceMax)) return false;
      return true;
    });
  }

  function findDuplicateCandidates(candidates, input = {}) {
    const normalizePhone = value => String(value || '').replace(/\D/g, '');
    const normalizeEmail = value => String(value || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    const company = String(input.currentCompany || '').trim();
    const matches = [];
    for (const candidate of candidates || []) {
      const reasons = [];
      if (input.sourceResumeId && candidate.sourceResumeId === input.sourceResumeId) reasons.push('sourceResumeId一致');
      if (input.phone && normalizePhone(candidate.phone) === normalizePhone(input.phone)) reasons.push('手机号一致');
      if (input.email && normalizeEmail(candidate.email) === normalizeEmail(input.email)) reasons.push('邮箱一致');
      if (reasons.length) {
        matches.push({ candidate, confidence: 'hard', reasons });
        continue;
      }
      if (name && company && candidate.name === name && candidate.currentCompany === company) {
        matches.push({ candidate, confidence: 'review', reasons: ['姓名和当前公司一致'] });
      }
    }
    return matches.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'hard' ? -1 : 1));
  }

  function changeApplicationStage(application, input = {}) {
    const toStage = String(input.toStage || '').trim();
    if (!APPLICATION_STAGES.includes(toStage)) throw new Error('无效推进阶段');
    if (toStage === 'closed' && !input.reasonCode) throw new Error('终止阶段必须选择原因');
    const occurredAt = input.occurredAt || nowIso();
    const event = {
      id: input.id || makeId('evt'),
      type: 'stage_changed',
      fromStage: application.stage || '',
      toStage,
      reasonCode: input.reasonCode || '',
      reasonNote: input.reasonNote || '',
      occurredAt,
      actor: input.actor || '本机顾问',
    };
    if (!Array.isArray(application.pipelineEvents)) application.pipelineEvents = [];
    application.pipelineEvents.push(event);
    application.stage = toStage;
    application.stageEnteredAt = occurredAt;
    application.updatedAt = occurredAt;
    return event;
  }

  function matchPositions(candidate, positions, options = {}) {
    const normalized = value => String(value || '').trim().toLowerCase();
    const candidateSkills = new Set((candidate.skills || candidate.keywords || []).map(normalized).filter(Boolean));
    const directions = (candidate.directions || []).map(normalized);
    const allowedStatuses = options.includeInactive ? null : new Set(['open', 'hiring', 'active']);
    return (positions || [])
      .filter(position => !allowedStatuses || allowedStatuses.has(position.status || 'open'))
      .map(position => {
        const positionSkills = (position.skills || []).map(normalized).filter(Boolean);
        const matchedSkills = positionSkills.filter(skill => candidateSkills.has(skill));
        const highlights = [];
        const gaps = positionSkills.filter(skill => !candidateSkills.has(skill));
        let score = positionSkills.length ? Math.round(matchedSkills.length / positionSkills.length * 60) : 20;
        if (matchedSkills.length) highlights.push(`匹配技能：${matchedSkills.join('、')}`);
        if (candidate.city && position.city && normalized(candidate.city) === normalized(position.city)) {
          score += 20;
          highlights.push('工作地点一致');
        }
        if (position.direction && directions.includes(normalized(position.direction))) {
          score += 20;
          highlights.push('人才方向一致');
        }
        return {
          positionId: position.id,
          companyId: position.companyId,
          score: Math.min(100, score),
          highlights,
          gaps: gaps.map(item => `待确认技能：${item}`),
          risks: gaps.length > matchedSkills.length ? ['核心技能覆盖不足'] : [],
          questions: gaps.map(item => `是否具备 ${item} 相关经验？`),
          reason: highlights.join('；') || '基础信息有限，建议人工确认',
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function matchCandidates(position, candidates, options = {}) {
    return (candidates || []).map(candidate => {
      const match = matchPositions(candidate, [{ ...position, status: 'open' }], options)[0];
      return { ...match, candidateId: candidate.id };
    }).sort((a, b) => b.score - a.score);
  }

  function filterApplications(applications, filters = {}) {
    return (applications || []).filter(application => {
      if (filters.companyId && filters.companyId !== 'all' && application.companyId !== filters.companyId) return false;
      if (filters.positionId && filters.positionId !== 'all' && application.positionId !== filters.positionId) return false;
      if (filters.candidateId && filters.candidateId !== 'all' && application.candidateId !== filters.candidateId) return false;
      if (filters.owner && filters.owner !== 'all' && application.owner !== filters.owner) return false;
      if (filters.stage && filters.stage !== 'all' && application.stage !== filters.stage) return false;
      if (filters.scoreMin && Number(application.matchScore || 0) < Number(filters.scoreMin)) return false;
      return true;
    });
  }

  root.WorkbenchV2 = {
    VERSION,
    createEmptyBundle,
    createCompany,
    createPosition,
    setPositionStatus,
    deletePosition,
    createCandidate,
    createApplication,
    createTodo,
    TODO_LINK_TYPES,
    normalizeCompanyName,
    previewMigration,
    executeMigration,
    rollbackMigration,
    validateBundle,
    filterCandidates,
    findDuplicateCandidates,
    APPLICATION_STAGES,
    changeApplicationStage,
    matchPositions,
    matchCandidates,
    filterApplications,
  };
})(typeof window !== 'undefined' ? window : globalThis);
