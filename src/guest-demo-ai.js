;(function initGuestDemoAi(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyGuestDemoAi = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createGuestDemoAiModule() {
  'use strict';

  const GUEST_MOCK_API_KEY = 'sk-guest-demo-local-only';

  const textResponses = Object.freeze({
    default: '【模拟结果】这是游客演示模式下的预设分析内容，仅用于展示产品交互，不代表真实 AI 判断。',
    'client-candidate-report': '【模拟结果】候选人与演示岗位的核心能力较匹配，建议重点核实团队规模、项目贡献和到岗时间。本报告由本地预设内容生成，未调用外部服务。',
    'resume-score-rubric': '【模拟结果】建议从专业能力、行业经验、管理跨度、业务成果和求职动机五个维度评估。',
    'resume-score': '【模拟结果】综合匹配度 88 分。优势是经历完整、核心技能覆盖较好；建议进一步核实最近两年的量化成果。',
    'resume-company-finder': '【模拟结果】可优先关注星河科技、远航供应链和青云健康。',
    'target-company-bd-plan': '【模拟结果】建议先围绕业务增长和关键岗位缺口建立联系，再用同类人才地图验证合作价值。',
    'search-strategy-generate': '【模拟结果】搜索方向：核心职能 + 行业关键词 + 相邻公司；优先覆盖深圳、上海和北京的演示人才池。',
    'advisor-hard-role-analysis': '【模拟结果】岗位难点主要在复合背景、可量化业绩和团队管理跨度，建议拆成三条独立寻访路径。',
    'advisor-search-direction': '【模拟结果】先找同赛道直接竞品，再扩展到相邻业务模型，最后补充高潜跨行业人才。',
    'advisor-bello-strategy': '【模拟结果】以岗位结果目标为核心，组合公司、职能、技能和项目关键词形成演示搜索策略。',
    'advisor-candidate-recommendation': '【模拟结果】建议进入初步沟通，重点核实求职动机、薪资预期和关键项目真实性。',
    'advisor-custom-question': '【模拟结果】这是本地预设的顾问助手回复。登录后才能使用真实业务数据进行分析。',
  });

  const candidateInfo = Object.freeze({
    name: '林晓', phone: '13800000001', email: 'demo-candidate@example.invalid',
    currentCompany: '未来智能', currentTitle: '高级产品经理', city: '深圳',
    experienceYears: 9, education: '本科',
    skills: ['AI产品', '商业化', '团队管理'],
    directions: ['AI产品负责人', '产品总监'], tags: ['虚构演示'],
    summary: '完全虚构的候选人画像，仅用于展示系统功能。',
  });

  const jsonResponses = Object.freeze({
    'candidate-basic-info': candidateInfo,
    'candidate-profile': candidateInfo,
    'job-keywords': {
      skills: ['行业经验', '团队管理', '业务增长', '跨部门协作'],
      keywords: ['负责人', '商业化', '战略规划', '结果导向'],
      summary: '虚构岗位关键词，仅用于演示。',
    },
    'system-match-rank': {
      score: 88,
      reason: '虚构匹配结果：能力结构与演示岗位要求较为一致。',
      strengths: ['核心技能覆盖', '行业经验相关'],
      risks: ['需要进一步核实量化成果'],
    },
    'electronic-resume-format': {
      formattedText: '【模拟电子简历】\n林晓\n高级产品经理\n核心能力：AI 产品、商业化、团队管理。',
    },
  });

  const arrayResponses = Object.freeze({
    'target-company-research': [
      { name: '新辰科技', industry: '企业服务', reason: '虚构推荐：业务阶段与人才经验匹配。', candidateIds: [] },
      { name: '海湾智能', industry: '人工智能', reason: '虚构推荐：存在产品和商业化岗位需求。', candidateIds: [] },
      { name: '北辰数据', industry: '数据服务', reason: '虚构推荐：可承接相邻行业人才。', candidateIds: [] },
    ],
    'match_candidates': [
      { candidateId: 'demo_cand_1', score: 92, reason: '虚构匹配结果：核心能力覆盖演示岗位要求。' },
      { candidateId: 'demo_cand_2', score: 87, reason: '虚构匹配结果：技术背景相关。' },
    ],
  });

  const responses = Object.freeze({ text: textResponses, json: jsonResponses, array: arrayResponses });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function responseFor(task, schema) {
    if (schema === 'array') return clone(arrayResponses[task] || arrayResponses.target-company-research);
    if (schema === 'json' || schema === 'raw') {
      return clone(jsonResponses[task] || {
        score: 88,
        reason: '虚构模拟分析结果，仅用于游客体验。',
        skills: ['演示技能一', '演示技能二', '演示技能三'],
        summary: '本结果由浏览器本地预设内容生成。',
      });
    }
    return textResponses[task] || textResponses.default;
  }

  function createMockCall({ delay = 450 } = {}) {
    return async function mockCall(options = {}) {
      const result = responseFor(String(options.task || 'default'), options.schema || 'text');
      const wait = Math.max(0, Math.min(1500, Number(delay) || 0));
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      if (options.stream && typeof options.onProgress === 'function') {
        const full = typeof result === 'string' ? result : JSON.stringify(result);
        options.onProgress(full, full);
      }
      return clone(result);
    };
  }

  function install(target, options = {}) {
    if (!target) throw new Error('GUEST_AI_TARGET_REQUIRED');
    const realCall = target.WorkBuddyAI?.callDeepSeek;
    const mockCall = createMockCall(options);
    const call = async function guestAwareCall(callOptions = {}) {
      let apiKey = String(callOptions.apiKey || '').trim();
      if (!apiKey && typeof callOptions.getApiKey === 'function') {
        try { apiKey = String(callOptions.getApiKey() || '').trim(); } catch { apiKey = ''; }
      }
      if (apiKey && apiKey !== GUEST_MOCK_API_KEY && apiKey.startsWith('sk-') && typeof realCall === 'function') {
        return realCall({ ...callOptions, apiKey, getApiKey: null });
      }
      return mockCall(callOptions);
    };
    target.callDeepSeek = call;
    target.WorkBuddyAI = Object.freeze({
      ...(target.WorkBuddyAI || {}),
      callDeepSeek: call,
    });
    target.WorkBuddyAiGateway = Object.freeze({
      createAiGateway: () => Object.freeze({
        parseResume: () => call({ task: 'candidate-basic-info', schema: 'json' }),
        matchCandidates: () => call({ task: 'match_candidates', schema: 'array' }),
      }),
    });
    return Object.freeze({ call, responses });
  }

  return Object.freeze({ GUEST_MOCK_API_KEY, responses, createMockCall, install });
});
