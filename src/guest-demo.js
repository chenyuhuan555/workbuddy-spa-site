;(function initGuestDemo(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyGuestDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createGuestDemoModule() {
  'use strict';

  const STORAGE_KEY = 'workbuddy.guest-demo.workspace.v1';
  const SEED_DATE = '2026-08-01T09:00:00.000Z';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function company(id, name, industry, city, owner, status = 'active') {
    return { id, name, industry, city, owner, status, demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE };
  }

  function position(id, companyId, title, city, salary, owner, skills) {
    return {
      id, companyId, title, city, salary, owner, skills, status: 'open', demo: true,
      description: `演示岗位：负责${title}相关工作，内容仅用于展示系统功能。`,
      createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function candidate(id, name, currentCompany, currentTitle, city, owner, skills, experienceYears) {
    return {
      id, name, currentCompany, currentTitle, city, owner, skills, experienceYears,
      phone: `1380000${String(id).slice(-4).padStart(4, '0')}`,
      email: `${id}@example.invalid`, status: 'open', tags: ['演示人才'], directions: skills.slice(0, 2),
      summary: `${name}为完全虚构的演示候选人，用于展示人才画像、搜索与推进功能。`,
      resumeVersions: [{
        id: `resume_${id}`, sourceResumeId: `resume_${id}`, fileName: `${name}-虚构简历.txt`,
        uploadedAt: SEED_DATE, rawText: `本简历为虚构演示内容。${name}，现任${currentTitle}，技能：${skills.join('、')}。`,
        formattedText: `【虚构演示简历】\n姓名：${name}\n当前职位：${currentTitle}\n核心技能：${skills.join('、')}`,
        formatStatus: 'done', originalFileStatus: 'missing',
      }],
      demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function application(id, candidateId, positionId, companyId, stage, owner, score) {
    return {
      id, candidateId, positionId, companyId, stage, owner, matchScore: score, status: 'active', demo: true,
      matchReason: '虚构匹配结果：候选人的演示技能与岗位要求具有较高重合度。',
      stageEnteredAt: SEED_DATE,
      pipelineEvents: [{ id: `event_${id}`, from: '', to: stage, note: '虚构演示推进记录', at: SEED_DATE }],
      createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function createInitialWorkspace() {
    const companies = [
      company('demo_co_1', '星河科技（演示）', '人工智能', '深圳', '演示顾问'),
      company('demo_co_2', '远航供应链（演示）', '物流科技', '上海', '演示顾问'),
      company('demo_co_3', '青云健康（演示）', '数字医疗', '北京', '演示顾问'),
      company('demo_co_4', '木棉消费（演示）', '新消费', '广州', '演示顾问', 'potential'),
    ];
    const positions = [
      position('demo_pos_1', 'demo_co_1', 'AI 产品负责人（演示）', '深圳', '50-80K', '演示顾问', ['AI产品', '商业化', '团队管理']),
      position('demo_pos_2', 'demo_co_1', '算法工程师（演示）', '深圳', '40-65K', '演示顾问', ['大模型', 'Python', 'RAG']),
      position('demo_pos_3', 'demo_co_2', '供应链解决方案总监（演示）', '上海', '45-70K', '演示顾问', ['供应链', '解决方案', '大客户']),
      position('demo_pos_4', 'demo_co_3', '医疗 SaaS 销售总监（演示）', '北京', '35-60K', '演示顾问', ['医疗SaaS', '销售管理', '渠道']),
      position('demo_pos_5', 'demo_co_4', '品牌增长负责人（演示）', '广州', '35-55K', '演示顾问', ['品牌策略', '增长', '内容营销']),
      position('demo_pos_6', 'demo_co_2', '物流运营负责人（演示）', '上海', '35-50K', '演示顾问', ['物流运营', '精益管理', '数据分析']),
    ];
    const candidates = [
      candidate('demo_cand_1', '林晓（虚构）', '未来智能（演示）', '高级产品经理', '深圳', '演示顾问', ['AI产品', '商业化', '团队管理'], 9),
      candidate('demo_cand_2', '周屿（虚构）', '云端实验室（演示）', '算法专家', '深圳', '演示顾问', ['大模型', 'Python', 'RAG'], 7),
      candidate('demo_cand_3', '陈澄（虚构）', '链路科技（演示）', '解决方案总监', '上海', '演示顾问', ['供应链', '解决方案', '大客户'], 11),
      candidate('demo_cand_4', '苏禾（虚构）', '康桥软件（演示）', '销售负责人', '北京', '演示顾问', ['医疗SaaS', '销售管理', '渠道'], 10),
      candidate('demo_cand_5', '许言（虚构）', '拾光品牌（演示）', '增长负责人', '广州', '演示顾问', ['品牌策略', '增长', '内容营销'], 8),
      candidate('demo_cand_6', '江岚（虚构）', '速达物流（演示）', '运营经理', '上海', '演示顾问', ['物流运营', '精益管理', '数据分析'], 8),
      candidate('demo_cand_7', '唐宁（虚构）', '启明数据（演示）', '数据产品经理', '杭州', '演示顾问', ['数据产品', 'BI', '项目管理'], 6),
      candidate('demo_cand_8', '顾遥（虚构）', '原点咨询（演示）', '行业顾问', '北京', '演示顾问', ['行业研究', '客户沟通', '方案设计'], 7),
    ];
    const applications = [
      application('demo_app_1', 'demo_cand_1', 'demo_pos_1', 'demo_co_1', 'recommended', '演示顾问', 92),
      application('demo_app_2', 'demo_cand_2', 'demo_pos_2', 'demo_co_1', 'interviewing', '演示顾问', 95),
      application('demo_app_3', 'demo_cand_3', 'demo_pos_3', 'demo_co_2', 'client_accepted', '演示顾问', 89),
      application('demo_app_4', 'demo_cand_4', 'demo_pos_4', 'demo_co_3', 'offer', '演示顾问', 91),
      application('demo_app_5', 'demo_cand_5', 'demo_pos_5', 'demo_co_4', 'contacted', '演示顾问', 86),
      application('demo_app_6', 'demo_cand_6', 'demo_pos_6', 'demo_co_2', 'screening', '演示顾问', 88),
      application('demo_app_7', 'demo_cand_7', 'demo_pos_1', 'demo_co_1', 'discovered', '演示顾问', 78),
      application('demo_app_8', 'demo_cand_8', 'demo_pos_4', 'demo_co_3', 'to_recommend', '演示顾问', 82),
    ];

    return {
      meta: { mode: 'guest-demo', fictional: true, version: 1, seededAt: SEED_DATE },
      names: ['演示工作区'],
      jobs: [[]],
      workbenchV2: {
        schemaVersion: 2,
        companies, positions, candidates, applications,
        todos: [
          { id: 'demo_todo_1', title: '跟进星河科技面试反馈（演示）', type: 'followup', date: '2026-08-05', done: false, demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
          { id: 'demo_todo_2', title: '整理供应链岗位推荐报告（演示）', type: 'recommend', date: '2026-08-06', done: false, demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
        ],
        aiArtifacts: [], activities: [], notes: [],
        migrationMeta: { executedAt: SEED_DATE },
        settings: { talentCategories: [] },
      },
      kb: [
        { id: 'demo_kb_1', title: '演示：候选人首次沟通清单', category: '流程规范', content: '本内容为虚构示例。沟通前确认岗位重点、候选人动机与时间安排。', createdAt: '2026-08-01' },
      ],
      resumeReasonTags: ['技能匹配（演示）', '经验相关（演示）'],
      deletedRecords: { jobs: [], positions: [], resumes: [] },
    };
  }

  function assertGuestWorkspace(workspace) {
    if (!workspace || workspace.meta?.mode !== 'guest-demo' || workspace.meta?.fictional !== true) {
      throw new Error('GUEST_WORKSPACE_REQUIRED');
    }
    if (workspace.workbenchV2?.schemaVersion !== 2) throw new Error('GUEST_WORKSPACE_SCHEMA_INVALID');
  }

  function createGuestDemo({ storage } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('GUEST_STORAGE_REQUIRED');
    }

    function persist(workspace) {
      assertGuestWorkspace(workspace);
      storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      return clone(workspace);
    }

    function resetWorkspace() {
      return persist(createInitialWorkspace());
    }

    function loadWorkspace() {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return resetWorkspace();
      try {
        const workspace = JSON.parse(raw);
        assertGuestWorkspace(workspace);
        return clone(workspace);
      } catch (_) {
        return resetWorkspace();
      }
    }

    function saveWorkspace(workspace) {
      return persist(clone(workspace));
    }

    return Object.freeze({ loadWorkspace, saveWorkspace, resetWorkspace });
  }

  return Object.freeze({ STORAGE_KEY, createInitialWorkspace, createGuestDemo });
});
