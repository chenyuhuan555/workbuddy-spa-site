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
      // 资产状态（open/active/archived 等），不是 pipeline 阶段；岗位阶段只存在于 application.stage
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
      if (filters.status && filters.status !== 'all' && candidate.status !== filters.status) return false; // 按人才资产状态过滤（非 pipeline 阶段）
      if (filters.tag && !(candidate.tags || []).some(item => includes(item, filters.tag))) return false;
      if (filters.experienceMin && Number(candidate.experienceYears || 0) < Number(filters.experienceMin)) return false;
      if (filters.experienceMax && Number(candidate.experienceYears || 0) > Number(filters.experienceMax)) return false;
      return true;
    });
  }

  // 人才库 Phase 1：简历完整度，按核心画像字段填充度计算 0-100（不读取/写入存储）
  function candidateResumeCompleteness(candidate = {}) {
    const str = value => String(value || '').trim();
    const checks = [
      () => str(candidate.name).length > 0,
      () => str(candidate.currentCompany).length > 0,
      () => str(candidate.currentTitle).length > 0,
      () => str(candidate.city).length > 0,
      () => str(candidate.owner).length > 0,
      () => Boolean(str(candidate.phone || candidate.email).length > 0),
      () => (candidate.skills || candidate.keywords || []).length > 0,
      () => (candidate.directions || []).length > 0,
      () => str(candidate.education).length > 0,
      () => Number(candidate.experienceYears || 0) > 0,
      () => {
        const text = str(candidate.electronicResumeText)
          || (candidate.resumeVersions || []).some(version => str(version && version.rawText).length > 0);
        return Boolean(text);
      },
    ];
    const passed = checks.filter(fn => fn()).length;
    return Math.round(passed / checks.length * 100);
  }

  // 人才库 Phase 1：最近更新时间，回退到创建时间（不读取/写入存储）
  function candidateLastUpdated(candidate = {}) {
    return candidate.updatedAt || candidate.createdAt || null;
  }

  // 阶段 3 查重：按可信度排序。硬匹配（直接复用/必须提示）→ hard；需人工确认 → review。
  // 规则覆盖：①手机号 ②邮箱 ③原始文件哈希 ④姓名+当前公司 ⑤姓名+手机号后四位 ⑥姓名+学历/职位相似。
  function findDuplicateCandidates(candidates, input = {}) {
    const normalizePhone = value => String(value || '').replace(/\D/g, '');
    const normalizeEmail = value => String(value || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    const company = String(input.currentCompany || '').trim();
    const fileHash = String(input.fileHash || '').trim().toLowerCase();
    const phoneLast4 = normalizePhone(input.phone || '').slice(-4);
    const education = String(input.education || '').trim();
    const title = String(input.currentTitle || input.currentPosition || '').trim();
    const matches = [];
    for (const candidate of candidates || []) {
      const reasons = [];
      if (input.sourceResumeId && candidate.sourceResumeId === input.sourceResumeId) reasons.push('sourceResumeId一致');
      if (input.phone && normalizePhone(candidate.phone) === normalizePhone(input.phone)) reasons.push('手机号一致');
      if (input.email && normalizeEmail(candidate.email) === normalizeEmail(input.email)) reasons.push('邮箱一致');
      const candHashes = (candidate.resumeVersions || [])
        .map(v => String(v.fileHash || '').toLowerCase()).filter(Boolean);
      if (fileHash && candHashes.includes(fileHash)) reasons.push('原始文件哈希一致');
      if (phoneLast4 && candidate.name === name && normalizePhone(candidate.phone || '').slice(-4) === phoneLast4) {
        reasons.push('姓名+手机号后四位一致');
      }
      if (reasons.length) {
        matches.push({ candidate, confidence: 'hard', reasons });
        continue;
      }
      const sameEducation = education && String(candidate.education || '').trim() === education;
      const sameTitle = title && String(candidate.currentTitle || candidate.currentPosition || '').trim() === title;
      if (name && company && candidate.name === name && candidate.currentCompany === company) {
        matches.push({ candidate, confidence: 'review', reasons: ['姓名和当前公司一致'] });
      } else if (name && (sameEducation || sameTitle)) {
        matches.push({ candidate, confidence: 'review', reasons: ['姓名和学历或职位一致，请人工确认'] });
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

  // —— 阶段 2：Talent（人才）× Application（岗位候选关系）统一访问入口 ——
  // 现有 candidate 即 Talent（长期人才资产），application 即 Talent×Job 的岗位候选关系。
  // 以下函数仅做语义化封装与护栏，不新增重复模型；阶段 / 面试 / Offer / 入职等状态只存在于 application。

  function getTalentById(bundle, talentId) {
    return (bundle.candidates || []).find(item => item.id === talentId) || null;
  }

  // 阶段 3 简历入库的唯一人才写入入口：先用硬身份键去重，命中则复用现有人才并保留其 id，
  // 不新建平行人才；软冲突（同名 + 同公司）不自动合并，交由上层提示用户。
  function createTalent(bundle, data = {}, options = {}) {
    const input = copy(data);
    if (!options.allowDuplicate) {
      const hard = (findDuplicateCandidates(bundle.candidates, input) || [])
        .find(item => item.confidence === 'hard');
      if (hard) return hard.candidate;
    }
    const candidate = createCandidate(input);
    bundle.candidates.push(candidate);
    return candidate;
  }

  // 仅更新人才基础资料；拒绝把岗位阶段类字段写入人才，避免污染 Talent 全局状态。
  const TALENT_FORBIDDEN_FIELDS = ['stage', 'stageEnteredAt', 'pipelineEvents', 'matchScore', 'matchReason', 'evaluation', 'clientReport', 'note'];
  function updateTalent(bundle, talentId, patch = {}) {
    const candidate = getTalentById(bundle, talentId);
    if (!candidate) throw new Error('人才不存在');
    const source = copy(patch);
    Object.keys(source).forEach(key => {
      if (TALENT_FORBIDDEN_FIELDS.includes(key)) {
        throw new Error(`字段 ${key} 属于 Application，不应写入人才`);
      }
    });
    Object.assign(candidate, source);
    candidate.updatedAt = nowIso();
    return candidate;
  }

  function getTalentApplications(bundle, talentId) {
    return (bundle.applications || []).filter(item => item.candidateId === talentId);
  }

  // 按 id 定位推进记录并推进阶段；只修改 application，绝不回写人才基础资料。
  function updateApplicationStage(bundle, applicationId, stage, metadata = {}) {
    const application = (bundle.applications || []).find(item => item.id === applicationId);
    if (!application) throw new Error('推进记录不存在');
    return changeApplicationStage(application, { toStage: stage, ...metadata });
  }

  // 阶段 3：向人才追加一份简历版本（仅元数据，二进制存外部）。经 updateTalent 统一入口，受岗位阶段护栏保护。
  function appendTalentResumeVersion(bundle, talentId, version = {}) {
    const candidate = getTalentById(bundle, talentId);
    if (!candidate) throw new Error('人才不存在');
    const list = Array.isArray(candidate.resumeVersions) ? candidate.resumeVersions.slice() : [];
    const entry = {
      id: version.id || makeId('resume'),
      sourceResumeId: version.sourceResumeId || version.id || '',
      fileName: version.fileName || '',
      fileId: version.fileId || '',        // 外部二进制存储键（RESUME_CACHE_STORE），快照只存元数据
      fileType: version.fileType || '',
      fileSize: version.fileSize || 0,
      fileHash: version.fileHash || '',
      uploadedAt: version.uploadedAt || nowIso(),
      rawText: version.rawText || '',
    };
    list.push(entry);
    updateTalent(bundle, talentId, { resumeVersions: list });
    return entry;
  }

  // 阶段 3 重新解析：默认只补充空字段；对非空字段生成差异，不直接覆盖顾问已确认字段。
  function reconcileParsedFields(existing = {}, parsed = {}) {
    const fields = ['name', 'phone', 'email', 'currentCompany', 'currentTitle', 'city', 'owner', 'education', 'experienceYears', 'skills', 'keywords', 'directions', 'summary', 'profileText'];
    const isEmpty = value => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    const merged = {};
    const diff = {};
    for (const f of fields) {
      const pv = parsed[f];
      if (isEmpty(pv)) continue;
      const ev = existing[f];
      if (isEmpty(ev)) merged[f] = pv;
      else if (JSON.stringify(ev) !== JSON.stringify(pv)) diff[f] = pv;
    }
    return { merged, diff };
  }

  // 阶段 3：AI 解析结果不足以构成人才时返回 false，避免解析失败/空结果静默创建空人才。
  function shouldCreateTalentFromParsed(parsed = {}) {
    const hasIdentity = Boolean(String(parsed.name || '').trim()
      || String(parsed.phone || '').replace(/\D/g, '').trim()
      || String(parsed.email || '').trim());
    return hasIdentity;
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
    candidateResumeCompleteness,
    candidateLastUpdated,
    APPLICATION_STAGES,
    changeApplicationStage,
    matchPositions,
    matchCandidates,
    filterApplications,
    getTalentById,
    createTalent,
    updateTalent,
    getTalentApplications,
    updateApplicationStage,
    appendTalentResumeVersion,
    reconcileParsedFields,
    shouldCreateTalentFromParsed,
  };
})(typeof window !== 'undefined' ? window : globalThis);
