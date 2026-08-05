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

  function position(id, companyId, title, city, salary, owner, skills, description = '') {
    return {
      id, companyId, title, city, salary, owner, skills, status: 'open', demo: true,
      description: description || `演示岗位：负责${title}相关工作，内容仅用于展示系统功能。`,
      createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function candidate(id, name, currentCompany, currentTitle, city, owner, skills, experienceYears, profile = {}) {
    const demoNumber = String(id).replace(/\D/g, '').slice(-4).padStart(4, '0');
    return {
      id, name, currentCompany, currentTitle, city, owner, skills, experienceYears,
      phone: `1380000${demoNumber}`,
      email: `${id}@example.invalid`, status: 'open', tags: ['演示人才'], directions: skills.slice(0, 2),
      summary: profile.summary || `${name}为完全虚构的演示候选人，用于展示人才画像、搜索与推进功能。`,
      resumeVersions: [{
        id: `resume_${id}`, sourceResumeId: `resume_${id}`, fileName: `${name}-虚构简历.txt`,
        uploadedAt: SEED_DATE, rawText: profile.rawText || `本简历为虚构演示内容。${name}，现任${currentTitle}，技能：${skills.join('、')}。`,
        formattedText: profile.formattedText || `【虚构演示简历】\n姓名：${name}\n当前职位：${currentTitle}\n核心技能：${skills.join('、')}`,
        formatStatus: 'done', originalFileStatus: 'missing',
      }],
      demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function application(id, candidateId, positionId, companyId, stage, owner, score, detail = {}) {
    return {
      id, candidateId, positionId, companyId, stage, owner, matchScore: score, status: 'active', demo: true,
      matchReason: detail.matchReason || '虚构匹配结果：候选人的演示技能与岗位要求具有较高重合度。',
      stageEnteredAt: detail.stageEnteredAt || SEED_DATE,
      progressNote: detail.progressNote || '',
      communicationLog: detail.communicationLog || '',
      pipelineEvents: detail.pipelineEvents || [{ id: `event_${id}`, fromStage: '', toStage: stage, reasonNote: '虚构演示推进记录', occurredAt: SEED_DATE, actor: owner }],
      evaluation: detail.evaluation || 'match',
      clientReport: detail.clientReport || '',
      aiMatchAnalysis: detail.aiMatchAnalysis || null,
      createdAt: SEED_DATE, updatedAt: SEED_DATE,
    };
  }

  function createInitialWorkspace() {
    const companies = [
      company('demo_co_1', '星河科技', '人工智能', '深圳', '演示顾问'),
      company('demo_co_2', '远航供应链', '物流科技', '上海', '演示顾问'),
      company('demo_co_3', '青云健康', '数字医疗', '北京', '演示顾问'),
      company('demo_co_4', '木棉消费', '新消费', '广州', '演示顾问', 'potential'),
    ];
    const positions = [
      position('demo_pos_1', 'demo_co_1', 'AI 产品负责人', '深圳', '50-80K', '演示顾问', ['AI产品', '商业化', '团队管理']),
      position('demo_pos_2', 'demo_co_1', '算法工程师', '深圳', '40-65K', '演示顾问', ['大模型', 'Python', 'RAG']),
      position('demo_pos_3', 'demo_co_2', '供应链解决方案总监', '上海', '45-70K', '演示顾问', ['供应链', '解决方案', '大客户']),
      position('demo_pos_4', 'demo_co_3', '医疗 SaaS 销售总监', '北京', '35-60K', '演示顾问', ['医疗SaaS', '销售管理', '渠道']),
      position('demo_pos_5', 'demo_co_4', '品牌增长负责人', '广州', '35-55K', '演示顾问', ['品牌策略', '增长', '内容营销']),
      position('demo_pos_6', 'demo_co_2', '物流运营负责人', '上海', '35-50K', '演示顾问', ['物流运营', '精益管理', '数据分析']),
    ];
    const positionDescriptions = {
      demo_pos_1: '岗位背景：负责公司 AI 产品线从 0 到 1 的产品规划与商业化落地，服务企业客户和内部交付团队。\n\n核心职责：\n- 制定年度产品路线图，拆解模型能力、工作流和数据闭环。\n- 带领产品经理与设计、研发、交付团队推进版本上线。\n- 建立试点客户反馈机制，跟踪激活率、续费率和项目毛利。\n\n任职要求：\n- 8 年以上 B 端产品经验，至少有 2 年 AI / SaaS 产品经历。\n- 能讲清楚大模型应用边界、RAG、Agent 和企业数据治理。\n- 有从试点到规模化商业化的实战案例。\n\n加分项：有企业服务销售支持、海外产品或 0 到 1 团队搭建经验。',
      demo_pos_2: '岗位背景：加入算法平台团队，负责企业知识库问答和检索增强生成能力。\n\n工作内容：负责文本切分、向量检索、重排、评测集和线上召回质量；与产品及应用团队协作，将模型能力落到客服、销售和内部知识场景。\n\n硬性要求：3 年以上 NLP / 推荐 / 搜索算法经验；熟悉 Python、PyTorch、Transformer、向量数据库和 RAG 评测；能够独立定位线上延迟和效果问题。\n\n优先考虑：有大模型微调、Agent 工具调用、千亿级文档检索或企业 SaaS 经验者。',
      demo_pos_3: '岗位背景：面向制造业和零售客户搭建端到端供应链数字化解决方案，负责从客户诊断、方案设计到项目签约。\n\n职责：带领售前顾问理解计划、采购、库存和运输场景；输出方案、ROI 测算和标书；协调产品、交付及生态伙伴完成大型项目。\n\n要求：8 年以上供应链咨询或 SaaS 解决方案经验；服务过年收入 10 亿以上客户；擅长高层沟通、复杂项目推进和团队管理。\n\n关键指标：方案转化率、项目毛利、回款周期和客户续约。',
      demo_pos_4: '岗位背景：负责医疗 SaaS 在北京及华北区域的销售增长，客户覆盖连锁医院、专科集团和区域医疗服务商。\n\n职责：搭建大客户销售方法论，管理 6-8 人销售团队；从线索、商机、商务谈判到回款全流程负责；联合市场和交付团队打造标杆案例。\n\n要求：医疗软件或医疗服务行业 8 年以上销售经验；有千万级合同和院端决策链经验；能把产品价值转化为客户经营结果。\n\n风险提示：需要适应较长决策周期和严格合规要求。',
      demo_pos_5: '岗位背景：为新消费品牌负责年度增长与品牌资产建设，兼顾内容、投放、渠道和用户运营。\n\n职责：制定品牌定位与年度 campaign；管理小红书、抖音和私域内容策略；与电商、供应链和门店团队协作，复盘 CAC、复购率和单客贡献。\n\n要求：6 年以上消费品牌或整合营销经验；有从 0 到 1 打造单品或品牌升级案例；能用数据驱动内容和预算分配。\n\n加分项：做过母婴、健康食品或生活方式品牌。',
      demo_pos_6: '岗位背景：负责上海区域仓配网络和重点客户履约运营，推动运营标准化和成本优化。\n\n职责：管理仓、干线、配送合作伙伴；建立时效、破损、客诉和人效看板；识别异常并推动流程、系统和供应商改进；支持大客户续约和新仓上线。\n\n要求：5 年以上物流运营经验，熟悉仓配一体、WMS/TMS 和数据分析；有跨区域项目管理与团队带教经验。\n\n核心指标：准时率、履约成本、库存准确率和客户满意度。',
    };
    positions.forEach(item => { item.description = positionDescriptions[item.id] || item.description; });
    const candidates = [
      candidate('demo_cand_1', '林晓', '未来智能', '高级产品经理', '深圳', '演示顾问', ['AI产品', '商业化', '团队管理'], 9, { summary: '9 年 B 端产品经验，近 4 年聚焦 AI SaaS；做过知识库、智能客服和销售 Copilot，从试点客户验证到商业化规模化均有完整经历。', rawText: '林晓｜女｜深圳｜9 年工作经验\n求职方向：AI 产品负责人 / 企业服务产品总监\n\n职业摘要：9 年 B 端产品经验，近 4 年负责 AI SaaS 产品，熟悉从用户研究、路线图到商业化交付的完整链路。\n\n工作经历\n未来智能｜高级产品经理｜2022.03-至今\n- 负责企业知识库与销售 Copilot 产品，服务 120+ 家付费客户。\n- 设计检索、引用和人工反馈闭环，首月激活率提升 28%，续费客户 NPS 提升 16 分。\n- 带领 4 名产品经理与研发、交付协作，完成从试点到标准版的产品化。\n\n南方云服｜产品经理｜2017.07-2022.02\n- 负责客户运营和工单 SaaS，覆盖 3 个行业解决方案。\n- 推动权限、计费和数据看板重构，交付周期缩短 35%。\n\n教育背景：华南理工大学｜信息管理与信息系统\n求职动机：希望加入更重视 AI 产品长期价值、能让产品对收入负责的团队。\n薪资期望：税前 55-65K，具体可结合职责确认。', formattedText: '## 林晓\n\n**AI 产品负责人｜深圳｜9 年经验**\n\n### 职业摘要\n9 年 B 端产品经验，近 4 年聚焦 AI SaaS，具备知识库、智能客服、销售 Copilot 从试点验证到规模化商业化的完整经验。\n\n### 核心能力\n- AI 产品规划、企业服务商业化、客户成功闭环\n- RAG / Agent 产品设计与效果评测\n- 复杂项目推进、跨团队协作、产品团队管理\n\n### 代表经历\n**未来智能｜高级产品经理｜2022.03-至今**\n- 负责企业知识库与销售 Copilot，服务 120+ 家付费客户。\n- 建立检索、引用和人工反馈闭环，首月激活率提升 28%。\n- 带领 4 名产品经理完成从试点到标准版产品化。\n\n**南方云服｜产品经理｜2017.07-2022.02**\n- 负责客户运营与工单 SaaS，交付周期缩短 35%。\n\n### 教育与动机\n华南理工大学信息管理与信息系统；期望在 AI 产品团队中对商业结果负责。' }),
      candidate('demo_cand_2', '周屿', '云端实验室', '算法专家', '深圳', '演示顾问', ['大模型', 'Python', 'RAG'], 7, { summary: '7 年搜索与 NLP 算法经验，现负责企业检索问答，擅长评测体系、召回优化和线上稳定性，偏工程落地。', rawText: '周屿｜男｜深圳｜7 年算法经验\n求职方向：大模型应用算法 / NLP 算法负责人\n\n云端实验室｜算法专家｜2021.06-至今\n- 负责企业知识库问答，覆盖 300 万份文档与 20 个业务系统。\n- 通过混合检索、重排和评测集建设，将 Top-3 命中率从 61% 提升至 83%。\n- 设计模型降级和缓存策略，平均响应时间降低 42%。\n\n图谱智能｜NLP 算法工程师｜2018.07-2021.05\n- 参与搜索排序、实体识别和文本分类项目，服务金融与制造客户。\n\n技术栈：Python、PyTorch、Transformers、Elasticsearch、Milvus、FastAPI。\n教育背景：武汉大学｜计算机科学与技术。', formattedText: '## 周屿\n\n**大模型应用算法专家｜深圳｜7 年经验**\n\n### 亮点\n- 企业知识库覆盖 300 万份文档，Top-3 命中率从 61% 提升至 83%。\n- 熟悉混合检索、重排、RAG 评测、模型降级与线上性能优化。\n\n### 工作经历\n**云端实验室｜算法专家｜2021.06-至今**\n负责企业检索问答和多业务系统接入。\n\n**图谱智能｜NLP 算法工程师｜2018.07-2021.05**\n参与搜索排序、实体识别和文本分类项目。\n\n### 技术栈\nPython、PyTorch、Transformers、Elasticsearch、Milvus、FastAPI。' }),
      candidate('demo_cand_3', '陈澄', '链路科技', '解决方案总监', '上海', '演示顾问', ['供应链', '解决方案', '大客户'], 11, { summary: '11 年供应链咨询与 SaaS 方案经验，服务过制造、零售和物流客户，擅长把复杂流程转成可落地的业务方案。', rawText: '陈澄｜男｜上海｜11 年工作经验\n求职方向：供应链解决方案总监 / 售前负责人\n\n链路科技｜解决方案总监｜2019.04-至今\n- 负责零售与制造行业方案，年度参与商机金额超过 1.8 亿元。\n- 主导某连锁零售客户仓配一体项目，合同额 2,600 万，方案转化率 38%。\n- 管理 9 人售前与咨询团队，建立行业模板和 ROI 测算工具。\n\n华东咨询｜供应链顾问｜2014.07-2019.03\n- 为 20 余家客户完成库存、采购和运输流程优化。\n\n教育背景：上海财经大学｜物流管理；证书：CSCP。', formattedText: '## 陈澄\n\n**供应链解决方案总监｜上海｜11 年经验**\n\n### 业务成果\n- 年度参与商机金额超过 1.8 亿元。\n- 主导连锁零售仓配一体项目，合同额 2,600 万。\n- 管理 9 人售前与咨询团队，擅长 ROI 测算和高层汇报。\n\n### 经历\n链路科技解决方案总监（2019.04-至今）；华东咨询供应链顾问（2014.07-2019.03）。\n\n### 教育与证书\n上海财经大学物流管理；CSCP。' }),
      candidate('demo_cand_4', '苏禾', '康桥软件', '销售负责人', '北京', '演示顾问', ['医疗SaaS', '销售管理', '渠道'], 10, { summary: '10 年医疗软件销售经验，长期服务医院和专科集团，能独立推进院端决策链并管理区域销售团队。', rawText: '苏禾｜女｜北京｜10 年工作经验\n求职方向：医疗 SaaS 销售总监\n\n康桥软件｜华北销售负责人｜2020.01-至今\n- 管理 7 人团队，覆盖北京、河北和山东，连续三年完成 110% 以上业绩。\n- 主导三甲医院集团客户项目，单笔合同 1,200 万，回款周期 9 个月。\n- 建立渠道分级和院端关键人地图，商机转化率提升 22%。\n\n医信科技｜大客户经理｜2016.03-2019.12\n- 负责 HIS、互联网医院和患者管理产品销售。\n\n教育背景：北京中医药大学｜公共事业管理。', formattedText: '## 苏禾\n\n**医疗 SaaS 销售负责人｜北京｜10 年经验**\n\n### 业绩\n- 管理 7 人华北团队，连续三年完成 110%+ 业绩。\n- 主导三甲医院集团项目，合同额 1,200 万，回款周期 9 个月。\n- 熟悉院端决策链、渠道管理和医疗合规。\n\n### 经历\n康桥软件华北销售负责人（2020.01-至今）；医信科技大客户经理（2016.03-2019.12）。' }),
      candidate('demo_cand_5', '许言', '拾光品牌', '增长负责人', '广州', '演示顾问', ['品牌策略', '增长', '内容营销'], 8, { summary: '8 年消费品牌增长经验，做过新品牌定位、内容投放和私域增长，擅长把品牌动作和经营指标连接起来。', rawText: '许言｜女｜广州｜8 年工作经验\n求职方向：品牌增长负责人\n\n拾光品牌｜增长负责人｜2021.02-至今\n- 负责健康食品品牌年度增长，管理 2,000 万营销预算。\n- 通过内容矩阵与会员分层，复购率提升 19%，获客成本下降 23%。\n- 打造一款年度销售额 4,800 万的新品。\n\n南方消费｜品牌经理｜2017.07-2021.01\n- 负责洗护和生活方式品牌，完成品牌升级和电商渠道增长。\n\n教育背景：暨南大学｜广告学。', formattedText: '## 许言\n\n**品牌增长负责人｜广州｜8 年经验**\n\n- 管理 2,000 万年度营销预算。\n- 通过内容矩阵与会员分层，复购率提升 19%，CAC 下降 23%。\n- 打造年度销售额 4,800 万的健康食品新品。\n\n擅长品牌定位、内容投放、会员运营和经营指标复盘。' }),
      candidate('demo_cand_6', '江岚', '速达物流', '运营经理', '上海', '演示顾问', ['物流运营', '精益管理', '数据分析'], 8, { summary: '8 年仓配运营经验，熟悉仓、干线、配送协同和运营看板，擅长降低履约成本并提升大客户服务稳定性。', rawText: '江岚｜男｜上海｜8 年工作经验\n求职方向：物流运营负责人\n\n速达物流｜区域运营经理｜2020.05-至今\n- 管理 3 个仓和 18 条干线，服务年发货量 1,200 万单。\n- 推动波次、线路和供应商考核优化，履约成本下降 14%。\n- 建立时效与异常看板，准时率从 91% 提升至 97%。\n\n安行供应链｜仓配主管｜2016.07-2020.04\n- 负责仓内作业、库存准确率和现场班组管理。\n\n教育背景：上海海事大学｜物流管理。', formattedText: '## 江岚\n\n**物流运营经理｜上海｜8 年经验**\n\n管理 3 个仓、18 条干线，年发货量 1,200 万单；通过波次、线路和供应商考核优化，履约成本下降 14%，准时率达到 97%。\n\n熟悉仓配一体、WMS/TMS、异常管理和团队带教。' }),
      candidate('demo_cand_7', '唐宁', '启明数据', '数据产品经理', '杭州', '演示顾问', ['数据产品', 'BI', '项目管理'], 6),
      candidate('demo_cand_8', '顾遥', '原点咨询', '行业顾问', '北京', '演示顾问', ['行业研究', '客户沟通', '方案设计'], 7),
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
    const applicationDetails = {
      demo_app_1: {
        progressNote: '客户已确认候选人背景，重点关注 AI 产品商业化和团队搭建经验；下一步安排业务负责人面谈。',
        communicationLog: '2026-08-01 与林晓电话沟通：认可岗位方向，期望总包 70-80 万。\n2026-08-02 向客户补充发送其销售 Copilot 项目案例，客户反馈匹配度较高。\n2026-08-04 客户希望面试时重点了解产品指标和跨团队协作方式。',
        clientReport: '推荐理由：具备 AI 产品从 0 到 1 和规模化经验，能够兼顾产品深度与商业结果。风险：目前管理跨度偏产品，需确认是否能承担完整 P&L。',
        pipelineEvents: [
          { id: 'event_demo_app_1_1', fromStage: '', toStage: 'discovered', reasonNote: '从 AI 产品负责人候选池发现，具备企业服务背景。', occurredAt: '2026-07-25T09:20:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_1_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '通过微信发送岗位摘要，候选人当天回复。', occurredAt: '2026-07-26T14:10:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_1_3', fromStage: 'contacted', toStage: 'responded', reasonNote: '电话沟通 35 分钟，确认求职动机和薪资区间。', occurredAt: '2026-07-28T03:30:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_1_4', fromStage: 'responded', toStage: 'recommended', reasonNote: '完成推荐报告并发送客户，客户反馈愿意面谈。', occurredAt: '2026-08-01T08:45:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_2: {
        progressNote: '候选人已完成技术初筛，RAG 评测和线上性能案例较强；等待算法负责人确认面试时间。',
        communicationLog: '2026-07-29 与周屿沟通：目前在看机会，优先考虑能接触真实业务数据的团队。\n2026-07-31 完成 45 分钟技术预筛，重点讨论召回、重排和延迟优化。\n2026-08-03 客户确认通过初筛，安排下周一技术面。',
        pipelineEvents: [
          { id: 'event_demo_app_2_1', fromStage: '', toStage: 'discovered', reasonNote: '从大模型应用算法人才池发现。', occurredAt: '2026-07-20T02:00:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_2_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '发送岗位 JD 和技术团队介绍。', occurredAt: '2026-07-21T06:20:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_2_3', fromStage: 'contacted', toStage: 'screening', reasonNote: '完成算法预筛，确认 Python、Milvus 和 RAG 评测经验。', occurredAt: '2026-07-29T09:00:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_2_4', fromStage: 'screening', toStage: 'interviewing', reasonNote: '客户确认进入技术面试。', occurredAt: '2026-08-03T11:15:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_3: {
        progressNote: '客户已接受推荐，正在内部确认汇报线和团队编制；候选人对行业和项目规模认可。',
        communicationLog: '2026-07-18 完成候选人深聊，确认可接受上海和每月 1 周出差。\n2026-07-22 客户售前负责人反馈方案能力符合预期。\n2026-07-30 补充发送 2 个大型供应链项目案例，客户进入内部评审。',
        pipelineEvents: [
          { id: 'event_demo_app_3_1', fromStage: '', toStage: 'discovered', reasonNote: '供应链解决方案总监定向寻访。', occurredAt: '2026-07-12T03:00:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_3_2', fromStage: 'discovered', toStage: 'screening', reasonNote: '完成项目规模、客户类型和团队管理核实。', occurredAt: '2026-07-18T10:20:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_3_3', fromStage: 'screening', toStage: 'recommended', reasonNote: '发送包含 ROI 测算案例的推荐报告。', occurredAt: '2026-07-22T08:10:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_3_4', fromStage: 'recommended', toStage: 'client_accepted', reasonNote: '客户确认接受推荐，待内部确定面试安排。', occurredAt: '2026-07-30T07:40:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_4: {
        progressNote: 'Offer 已发出，候选人正在比较长期激励和区域负责人权限；需要控制沟通节奏。',
        communicationLog: '2026-07-10 候选人确认对医疗 SaaS 赛道有兴趣。\n2026-07-16 完成客户一面，客户认可其院端销售体系。\n2026-07-25 完成终面，客户于 07-29 发出 Offer。\n2026-08-02 候选人提出希望明确团队编制和年度奖金口径。',
        pipelineEvents: [
          { id: 'event_demo_app_4_1', fromStage: '', toStage: 'contacted', reasonNote: '候选人主动回复岗位介绍。', occurredAt: '2026-07-05T08:00:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_4_2', fromStage: 'contacted', toStage: 'screening', reasonNote: '完成医疗行业客户资源和业绩核实。', occurredAt: '2026-07-10T10:30:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_4_3', fromStage: 'screening', toStage: 'interviewing', reasonNote: '客户安排销售 VP 和 HRBP 联合面试。', occurredAt: '2026-07-16T06:45:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_4_4', fromStage: 'interviewing', toStage: 'offer', reasonNote: '终面通过，客户发出正式 Offer。', occurredAt: '2026-07-29T09:15:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_5: {
        progressNote: '候选人认可品牌方向，但目前仍在职且手上有年度项目，建议先保持低频沟通。',
        communicationLog: '2026-07-28 通过朋友介绍建立联系，候选人愿意了解岗位。\n2026-08-01 分享品牌年度预算和团队结构，候选人表示需要确认汇报对象。',
        pipelineEvents: [
          { id: 'event_demo_app_5_1', fromStage: '', toStage: 'discovered', reasonNote: '从消费品牌增长人才地图发现。', occurredAt: '2026-07-28T04:30:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_5_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '经共同联系人引荐，完成首次触达。', occurredAt: '2026-07-29T06:00:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_5_3', fromStage: 'contacted', toStage: 'responded', reasonNote: '候选人回复并愿意了解品牌阶段。', occurredAt: '2026-08-01T09:00:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_6: {
        progressNote: '完成履约成本和团队规模核实，候选人经验匹配；等待候选人补充近期仓配项目数据。',
        communicationLog: '2026-07-24 电话沟通，候选人明确希望从区域运营转向全国网络管理。\n2026-07-27 请候选人补充仓网规模、成本下降和团队人数证明材料。',
        pipelineEvents: [
          { id: 'event_demo_app_6_1', fromStage: '', toStage: 'discovered', reasonNote: '从物流运营人才库定向发现。', occurredAt: '2026-07-23T02:15:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_6_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '发送岗位业务范围和薪资区间。', occurredAt: '2026-07-24T07:30:00.000Z', actor: '演示顾问' },
          { id: 'event_demo_app_6_3', fromStage: 'contacted', toStage: 'screening', reasonNote: '完成首轮筛选，等待补充业绩证据。', occurredAt: '2026-07-27T08:45:00.000Z', actor: '演示顾问' },
        ],
      },
      demo_app_7: { progressNote: '候选人处于被动看机会状态，已加入岗位人才池，暂不主动推荐。', communicationLog: '2026-08-01 已发送岗位摘要，候选人未明确回复，计划一周后再次触达。', pipelineEvents: [{ id: 'event_demo_app_7_1', fromStage: '', toStage: 'discovered', reasonNote: '加入 AI 产品岗位人才池。', occurredAt: '2026-08-01T03:00:00.000Z', actor: '演示顾问' }] },
      demo_app_8: { progressNote: '候选人行业研究和方案能力较好，需进一步核实是否有直接客户拓展业绩。', communicationLog: '2026-07-31 完成首次沟通，候选人愿意了解医疗行业岗位。', pipelineEvents: [{ id: 'event_demo_app_8_1', fromStage: '', toStage: 'discovered', reasonNote: '从行业顾问人才池发现。', occurredAt: '2026-07-30T05:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_8_2', fromStage: 'discovered', toStage: 'to_recommend', reasonNote: '初步匹配岗位，但推荐前需补充客户拓展案例。', occurredAt: '2026-07-31T08:30:00.000Z', actor: '演示顾问' }] },
    };
    applications.forEach(item => Object.assign(item, applicationDetails[item.id] || {}));

    return {
      meta: { mode: 'guest-demo', fictional: true, version: 1, seedVersion: 2, seededAt: SEED_DATE },
      names: ['演示工作区'],
      jobs: [[]],
      workbenchV2: {
        schemaVersion: 2,
        companies, positions, candidates, applications,
        todos: [
          { id: 'demo_todo_1', title: '跟进星河科技面试反馈', type: 'followup', date: '2026-08-05', done: false, demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
          { id: 'demo_todo_2', title: '整理供应链岗位推荐报告', type: 'recommend', date: '2026-08-06', done: false, demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
        ],
        aiArtifacts: [],
        activities: [
          { id: 'demo_activity_1', type: 'application', title: '林晓已推荐至 AI 产品负责人', detail: '客户已确认进入业务面试，重点核实商业化和团队管理。', at: '2026-08-01T08:45:00.000Z', createdAt: '2026-08-01T08:45:00.000Z' },
          { id: 'demo_activity_2', type: 'communication', title: '苏禾完成医疗 SaaS 终面', detail: '候选人正在沟通团队编制、奖金和长期激励。', at: '2026-07-29T09:15:00.000Z', createdAt: '2026-07-29T09:15:00.000Z' },
          { id: 'demo_activity_3', type: 'position', title: '供应链解决方案总监进入客户评审', detail: '客户正在内部确认汇报线和团队编制。', at: '2026-07-30T07:40:00.000Z', createdAt: '2026-07-30T07:40:00.000Z' },
        ],
        notes: [
          { id: 'demo_note_1', entityType: 'candidate', entityId: 'demo_cand_1', content: '候选人对 AI 产品负责人岗位兴趣较高，沟通时重点确认商业化结果、团队规模和汇报关系。', createdAt: '2026-08-02T03:00:00.000Z', updatedAt: '2026-08-02T03:00:00.000Z' },
          { id: 'demo_note_2', entityType: 'company', entityId: 'demo_co_1', content: '客户目前处于 AI 产品线扩张期，面试决策人是业务负责人和 CTO，预计两轮面试。', createdAt: '2026-08-01T05:30:00.000Z', updatedAt: '2026-08-01T05:30:00.000Z' },
          { id: 'demo_note_3', entityType: 'position', entityId: 'demo_pos_3', content: '岗位不是纯售前，需要能参与客户高层经营诊断并对项目毛利负责。', createdAt: '2026-07-30T07:45:00.000Z', updatedAt: '2026-07-30T07:45:00.000Z' },
        ],
        migrationMeta: { executedAt: SEED_DATE },
        settings: { talentCategories: [] },
      },
      kb: [
        { id: 'demo_kb_1', title: '候选人首次沟通清单', category: '流程规范', content: '# 首次沟通目标\n\n1. 确认候选人目前状态、看机会原因和决策时间。\n2. 复述岗位的业务背景、汇报关系和真实挑战，不只讲职位名称。\n3. 记录候选人最在意的 2-3 个因素：业务空间、团队、薪资、地点或稳定性。\n4. 不在第一次沟通承诺简历中没有的信息。\n\n## 必问问题\n- 如果合适，什么条件会让你愿意进入面试？\n- 最近一个项目中，你个人负责的部分和结果是什么？\n- 目前薪资结构、期望区间和不可接受条件？\n- 是否有竞品流程、竞业或离职周期限制？', createdAt: '2026-08-01' },
        { id: 'demo_kb_2', title: '客户需求澄清会议模板', category: '流程规范', content: '# 客户需求澄清\n\n## 业务背景\n- 为什么现在招聘？是新增、替补还是组织升级？\n- 这个岗位解决哪个业务问题？入职 90 天最重要的结果是什么？\n\n## 角色边界\n- 汇报对象、团队规模、可调动资源和决策权限。\n- 必须满足的条件与可以培养的条件。\n\n## 过程约定\n明确反馈时限、面试轮次、参与人、薪资预算和候选人保密边界，避免推荐后长期无反馈。', createdAt: '2026-08-01' },
        { id: 'demo_kb_3', title: 'AI 产品岗位寻访策略', category: '寻访策略', content: '# 搜索分层\n\n**强匹配**：AI SaaS 产品负责人、企业服务产品总监，必须有商业化结果。\n\n**宽搜索**：智能客服、知识库、数据产品负责人，允许行业相邻但要有复杂 B 端项目经验。\n\n**验证重点**：不要只看“AI”关键词，必须追问数据来源、用户规模、上线指标、付费方式和本人决策范围。\n\n**排除项**：只有模型研究没有产品落地、只有项目交付没有产品决策权、无法讲清量化结果。', createdAt: '2026-08-01' },
        { id: 'demo_kb_4', title: '面试反馈记录模板', category: '面试与评估', content: '# 面试反馈\n\n- 面试轮次 / 时间 / 面试官：\n- 候选人讲清楚的项目：\n- 与岗位硬性要求的匹配点：\n- 需要继续验证的风险：\n- 候选人对岗位的意愿变化：\n- 下一步动作与负责人：\n\n反馈应引用具体项目、数据和行为，不使用“感觉不错”“沟通一般”等无法复盘的描述。', createdAt: '2026-08-01' },
        { id: 'demo_kb_5', title: '推荐报告结构', category: '交付模板', content: '# 客户推荐报告\n\n1. 一句话结论：为什么现在推荐。\n2. 候选人摘要：年限、方向、当前公司和核心成果。\n3. 匹配亮点：逐条对应 JD，不堆砌关键词。\n4. 潜在顾虑：明确证据和建议核实问题。\n5. 薪资与动机：写清当前状态、期望和沟通口径。\n6. 推荐建议：面试重点、可能的吸引点和风险控制。', createdAt: '2026-08-01' },
        { id: 'demo_kb_6', title: 'Offer 沟通与反悔预防', category: '候选人管理', content: '# Offer 阶段\n\n发 Offer 前确认候选人的真实排序：业务内容、直属上级、团队氛围、薪资、地点和稳定性。\n\n发出后不要只催签字：同步解释试用期目标、入职安排、汇报关系和长期发展。\n\n出现犹豫时，先区分是薪资差距、家庭因素、原公司挽留还是对岗位理解不一致，再制定对应动作。', createdAt: '2026-08-01' },
        { id: 'demo_kb_7', title: '背调授权与风险清单', category: '合规与风控', content: '# 背调注意事项\n\n- 必须获得候选人明确授权，说明核查范围和联系人。\n- 只核实与录用相关的工作经历、任职时间、职级和可公开业绩。\n- 不把同事评价、个人隐私或未经证实的传闻写入推荐结论。\n- 对日期冲突、职级表述差异和业绩口径差异，记录为待核实事项。', createdAt: '2026-08-01' },
        { id: 'demo_kb_8', title: '物流运营岗位面试题库', category: '行业知识', content: '# 结构化问题\n\n1. 请拆解你负责过的仓配网络：仓数、单量、团队和供应商。\n2. 最近一次降本项目中，基线、动作和最终结果分别是什么？\n3. 当准时率与成本目标冲突时如何决策？\n4. 遇到大客户异常投诉，你如何组织现场、客户和内部团队？\n5. 如何用 WMS / TMS 数据发现库存或线路问题？', createdAt: '2026-08-01' },
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

  function stripDemoSuffix(value) {
    return typeof value === 'string' ? value.replace(/\s*[（(](?:演示|虚构)[）)]\s*$/u, '').trim() : value;
  }

  function normalizeVisibleDemoLabels(workspace) {
    const workbench = workspace.workbenchV2 || {};
    (workbench.companies || []).forEach(item => {
      if (String(item.id || '').startsWith('demo_')) item.name = stripDemoSuffix(item.name);
    });
    (workbench.positions || []).forEach(item => {
      if (String(item.id || '').startsWith('demo_')) item.title = stripDemoSuffix(item.title);
    });
    (workbench.candidates || []).forEach(item => {
      if (String(item.id || '').startsWith('demo_')) {
        item.name = stripDemoSuffix(item.name);
        item.currentCompany = stripDemoSuffix(item.currentCompany);
      }
    });
    (workbench.todos || []).forEach(item => {
      if (String(item.id || '').startsWith('demo_')) item.title = stripDemoSuffix(item.title);
    });
    return workspace;
  }

  function mergeRichSeedData(workspace) {
    if (Number(workspace.meta?.seedVersion || 0) >= 2) return false;
    const seed = createInitialWorkspace();
    const workbench = workspace.workbenchV2 || {};
    const seedWorkbench = seed.workbenchV2;
    let changed = false;
    const byId = (items, id) => (Array.isArray(items) ? items : []).find(item => item.id === id);

    (workbench.positions || []).forEach(item => {
      const source = byId(seedWorkbench.positions, item.id);
      if (source && (!item.description || String(item.description).startsWith('演示岗位：'))) {
        item.description = source.description;
        changed = true;
      }
    });
    (workbench.candidates || []).forEach(item => {
      const source = byId(seedWorkbench.candidates, item.id);
      const version = item.resumeVersions?.[0];
      const sourceVersion = source?.resumeVersions?.[0];
      if (source && String(item.summary || '').includes('完全虚构的演示候选人')) {
        item.summary = source.summary;
        changed = true;
      }
      if (sourceVersion && version && String(version.rawText || '').startsWith('本简历为虚构演示内容')) {
        item.resumeVersions[0] = clone(sourceVersion);
        changed = true;
      }
    });
    (workbench.applications || []).forEach(item => {
      const source = byId(seedWorkbench.applications, item.id);
      const genericTimeline = (item.pipelineEvents || []).length <= 1 && String(item.pipelineEvents?.[0]?.note || '').includes('虚构演示推进记录');
      if (source && (genericTimeline || !item.communicationLog || !item.progressNote)) {
        if (genericTimeline) item.pipelineEvents = clone(source.pipelineEvents);
        if (!item.communicationLog) item.communicationLog = source.communicationLog;
        if (!item.progressNote) item.progressNote = source.progressNote;
        if (!item.clientReport && source.clientReport) item.clientReport = source.clientReport;
        changed = true;
      }
    });
    if (!Array.isArray(workbench.activities)) workbench.activities = [];
    const existingActivityIds = new Set(workbench.activities.map(item => item.id));
    seedWorkbench.activities.forEach(item => {
      if (!existingActivityIds.has(item.id)) { workbench.activities.push(clone(item)); changed = true; }
    });
    if (!Array.isArray(workbench.notes)) workbench.notes = [];
    const existingNoteIds = new Set(workbench.notes.map(item => item.id));
    seedWorkbench.notes.forEach(item => {
      if (!existingNoteIds.has(item.id)) { workbench.notes.push(clone(item)); changed = true; }
    });
    const existingKb = new Set((Array.isArray(workspace.kb) ? workspace.kb : []).map(item => item.id));
    seed.kb.forEach(item => {
      if (!existingKb.has(item.id)) {
        if (!Array.isArray(workspace.kb)) workspace.kb = [];
        workspace.kb.push(clone(item));
        changed = true;
      }
    });
    workspace.meta.seedVersion = 2;
    return changed;
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
        const normalized = normalizeVisibleDemoLabels(workspace);
        if (mergeRichSeedData(normalized)) storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return clone(normalized);
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
