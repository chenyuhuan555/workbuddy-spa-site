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
      age: profile.age || String(24 + experienceYears),
      education: profile.education || '本科',
      expectedBase: profile.expectedBase || city,
      currentSalary: profile.currentSalary || `${experienceYears + 20}K/月`,
      expectedSalary: profile.expectedSalary || `${experienceYears + 25}K/月`,
      motivation: profile.motivation || `希望在${city}寻找更大的业务空间，承担更完整的结果。`,
      availability: profile.availability || '30天内',
      recommendationComment: profile.recommendationComment || `具备${skills.slice(0, 2).join('、')}经验，建议结合岗位重点推进。`,
      remark: profile.remark || '虚构演示资料，信息已完成基础核验。',
      sourceCompanyId: profile.sourceCompanyId || '',
      sourceChannelId: profile.sourceChannelId || '',
      sourceChannelName: profile.sourceChannelName || '',
      phone: `1380000${demoNumber}`,
      email: `${id}@example.invalid`, status: 'open', tags: ['演示人才'], directions: skills.slice(0, 2),
      summary: profile.summary || `${name}为完全虚构的演示候选人，用于展示人才画像、搜索与推进功能。`,
      resumeVersions: [{
        id: `resume_${id}`, sourceResumeId: `resume_${id}`, fileName: `${name}-虚构简历.txt`,
        uploadedAt: SEED_DATE, rawText: profile.rawText || `本简历为虚构演示内容。${name}，现任${currentTitle}，技能：${skills.join('、')}。`,
        formattedText: profile.formattedText || `【虚构演示简历】\n姓名：${name}\n当前职位：${currentTitle}\n核心技能：${skills.join('、')}`,
        formatStatus: 'done', originalFileStatus: 'missing',
      }],
      demo: true, createdAt: profile.intakeAt || SEED_DATE, updatedAt: profile.updatedAt || SEED_DATE,
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
      company('demo_co_5', '瀚海金融', '金融科技', '杭州', '演示顾问'),
      company('demo_co_6', '智造云联', '工业软件', '苏州', '演示顾问'),
      company('demo_co_7', '澄明医疗', '数字医疗', '成都', '演示顾问'),
      company('demo_co_8', '北辰科技', '数据基础设施', '武汉', '演示顾问'),
      company('demo_co_qc', '中科量枢', '量子计算', '合肥', '演示顾问'),
    ];
    const positions = [
      position('demo_pos_1', 'demo_co_1', 'AI 产品负责人', '深圳', '50-80K', '演示顾问', ['AI产品', '商业化', '团队管理']),
      position('demo_pos_2', 'demo_co_1', '算法工程师', '深圳', '40-65K', '演示顾问', ['大模型', 'Python', 'RAG']),
      position('demo_pos_3', 'demo_co_2', '供应链解决方案总监', '上海', '45-70K', '演示顾问', ['供应链', '解决方案', '大客户']),
      position('demo_pos_4', 'demo_co_3', '医疗 SaaS 销售总监', '北京', '35-60K', '演示顾问', ['医疗SaaS', '销售管理', '渠道']),
      position('demo_pos_5', 'demo_co_4', '品牌增长负责人', '广州', '35-55K', '演示顾问', ['品牌策略', '增长', '内容营销']),
      position('demo_pos_6', 'demo_co_2', '物流运营负责人', '上海', '35-50K', '演示顾问', ['物流运营', '精益管理', '数据分析']),
      position('demo_pos_7', 'demo_co_5', '企业服务产品总监', '杭州', '60-85K', '演示顾问', ['金融科技', '产品战略', '商业化']),
      position('demo_pos_8', 'demo_co_6', '售前解决方案经理', '苏州', '40-60K', '演示顾问', ['工业软件', '售前咨询', '大客户']),
      position('demo_pos_9', 'demo_co_7', '医疗运营负责人', '成都', '35-55K', '演示顾问', ['医疗运营', '用户增长', '团队管理']),
      position('demo_pos_10', 'demo_co_8', '数据工程负责人', '武汉', '50-70K', '演示顾问', ['数据工程', '云平台', '团队管理']),
      position('demo_pos_qc_1', 'demo_co_qc', '量子软件工程师', '合肥', '40-70K', '演示顾问', ['量子软件', 'Qiskit', 'Python'], '中科量枢量子软件工程师负责量子算法 SDK 与编译器后端开发，支撑量子云平台上的用户任务编译与执行。要求熟悉量子线路建模、门级优化与噪声感知编译，有 Qiskit / Cirq / Q# 实际项目经验者优先，并与量子硬件、量子算法组协作完成从线路抽象到脉冲调度的全栈优化。'),
      position('demo_pos_qc_2', 'demo_co_qc', '量子纠错研究员', '合肥', '35-65K', '演示顾问', ['量子纠错', '表面码', '拓扑编码'], '量子纠错研究员聚焦表面码与拓扑编码的码距扩展、解码器设计与逻辑错误率压降。需要扎实的量子信息理论基础，熟悉稳定子形式、最小权重完美匹配解码或神经网络解码器，并有超导或离子阱实验数据验证经验，产出直接服务于容错量子计算路线图。'),
      position('demo_pos_qc_3', 'demo_co_qc', '量子算法工程师', '合肥', '38-68K', '演示顾问', ['量子算法', '量子机器学习', '组合优化'], '量子算法工程师负责变分量子算法、量子机器学习与组合优化求解器的设计与仿真验证。要求熟悉 VQE / QAOA / 量子核方法，能使用主流量子框架完成算法原型，并与应用团队把算法落地到金融、化学或物流等真实场景。'),
      position('demo_pos_qc_4', 'demo_co_qc', '量子云平台架构师', '合肥', '50-85K', '演示顾问', ['云平台', '分布式', '量子调度'], '量子云平台架构师主导多租户量子计算平台的资源调度、任务队列与混合云接入。需要设计低延迟的线路编译与脉冲下发链路，保障批处理与交互式任务的隔离与稳定性，并推动计量计费与权限模型落地。'),
      position('demo_pos_qc_5', 'demo_co_qc', '离子阱量子工程师', '合肥', '40-72K', '演示顾问', ['离子阱', '真空', '测控'], '离子阱量子工程师负责离子囚禁、激光冷却与高精度测控电子学调试，支撑离子阱量子比特的相干时间与门保真度提升。要求熟悉真空与低温系统、RF 囚禁与态制备读出，有离子阱或中性原子实验平台经验者优先。'),
    ];
    const positionDescriptions = {
      demo_pos_1: '岗位背景：负责公司 AI 产品线从 0 到 1 的产品规划与商业化落地，服务企业客户和内部交付团队。\n\n核心职责：\n- 制定年度产品路线图，拆解模型能力、工作流和数据闭环。\n- 带领产品经理与设计、研发、交付团队推进版本上线。\n- 建立试点客户反馈机制，跟踪激活率、续费率和项目毛利。\n\n任职要求：\n- 8 年以上 B 端产品经验，至少有 2 年 AI / SaaS 产品经历。\n- 能讲清楚大模型应用边界、RAG、Agent 和企业数据治理。\n- 有从试点到规模化商业化的实战案例。\n\n加分项：有企业服务销售支持、海外产品或 0 到 1 团队搭建经验。',
      demo_pos_2: '岗位背景：加入算法平台团队，负责企业知识库问答和检索增强生成能力。\n\n工作内容：负责文本切分、向量检索、重排、评测集和线上召回质量；与产品及应用团队协作，将模型能力落到客服、销售和内部知识场景。\n\n硬性要求：3 年以上 NLP / 推荐 / 搜索算法经验；熟悉 Python、PyTorch、Transformer、向量数据库和 RAG 评测；能够独立定位线上延迟和效果问题。\n\n优先考虑：有大模型微调、Agent 工具调用、千亿级文档检索或企业 SaaS 经验者。',
      demo_pos_3: '岗位背景：面向制造业和零售客户搭建端到端供应链数字化解决方案，负责从客户诊断、方案设计到项目签约。\n\n职责：带领售前顾问理解计划、采购、库存和运输场景；输出方案、ROI 测算和标书；协调产品、交付及生态伙伴完成大型项目。\n\n要求：8 年以上供应链咨询或 SaaS 解决方案经验；服务过年收入 10 亿以上客户；擅长高层沟通、复杂项目推进和团队管理。\n\n关键指标：方案转化率、项目毛利、回款周期和客户续约。',
      demo_pos_4: '岗位背景：负责医疗 SaaS 在北京及华北区域的销售增长，客户覆盖连锁医院、专科集团和区域医疗服务商。\n\n职责：搭建大客户销售方法论，管理 6-8 人销售团队；从线索、商机、商务谈判到回款全流程负责；联合市场和交付团队打造标杆案例。\n\n要求：医疗软件或医疗服务行业 8 年以上销售经验；有千万级合同和院端决策链经验；能把产品价值转化为客户经营结果。\n\n风险提示：需要适应较长决策周期和严格合规要求。',
      demo_pos_5: '岗位背景：为新消费品牌负责年度增长与品牌资产建设，兼顾内容、投放、渠道和用户运营。\n\n职责：制定品牌定位与年度 campaign；管理小红书、抖音和私域内容策略；与电商、供应链和门店团队协作，复盘 CAC、复购率和单客贡献。\n\n要求：6 年以上消费品牌或整合营销经验；有从 0 到 1 打造单品或品牌升级案例；能用数据驱动内容和预算分配。\n\n加分项：做过母婴、健康食品或生活方式品牌。',
      demo_pos_6: '岗位背景：负责上海区域仓配网络和重点客户履约运营，推动运营标准化和成本优化。\n\n职责：管理仓、干线、配送合作伙伴；建立时效、破损、客诉和人效看板；识别异常并推动流程、系统和供应商改进；支持大客户续约和新仓上线。\n\n要求：5 年以上物流运营经验，熟悉仓配一体、WMS/TMS 和数据分析；有跨区域项目管理与团队带教经验。\n\n核心指标：准时率、履约成本、库存准确率和客户满意度。',
      demo_pos_7: '岗位背景：负责金融科技企业服务产品线的战略规划、商业化和客户价值交付。\n\n职责：制定年度路线图，平衡监管、客户需求和产品体验；带领产品与解决方案团队服务银行、消费金融和财富管理客户；建立定价、续费和客户成功机制。\n\n要求：10 年以上 B 端产品经验，熟悉金融机构决策链和 SaaS 商业化；能够用收入、留存和毛利指标复盘产品结果。\n\n加分项：有数据中台、风控或支付产品从 0 到 1 经验。',
      demo_pos_8: '岗位背景：面向制造业客户负责工业软件售前方案与复杂项目推进，连接销售、产品和交付团队。\n\n职责：完成客户诊断、方案架构、价值测算和标书答辩；沉淀行业模板和成功案例；参与关键客户高层沟通并推动项目签约。\n\n要求：7 年以上工业软件、MES、ERP 或供应链 SaaS 售前经验；能独立完成大型项目方案和 ROI 论证；有团队带教能力。\n\n核心指标：方案转化率、项目毛利、交付风险和客户满意度。',
      demo_pos_9: '岗位背景：负责数字医疗区域业务运营，推动患者服务、医生协作和增长项目从试点走向规模化。\n\n职责：搭建运营指标体系和区域团队，协同产品、销售与交付改善用户体验；复盘获客、活跃、复购和服务质量；建立合规运营流程和合作方管理机制。\n\n要求：6 年以上医疗服务或医疗 SaaS 运营经验；具备用户增长、团队管理和跨部门项目推进能力；能够适应业务快速迭代。\n\n风险提示：需要熟悉医疗合规和区域资源协同。',
      demo_pos_10: '岗位背景：建设面向多业务线的数据平台与工程团队，为实时分析、推荐和企业应用提供稳定的数据基础设施。\n\n职责：规划数据湖仓、实时计算和数据质量体系；带领工程师提升任务稳定性、成本效率和数据服务能力；推动云原生迁移和治理标准落地。\n\n要求：8 年以上数据工程经验，熟悉 Spark、Flink、Kafka、数据仓库和云平台；有 5 人以上团队管理经验；能与产品和业务负责人共创指标体系。\n\n核心指标：数据时效、任务成功率、云资源成本和业务使用率。',
      demo_pos_qc_1: '岗位背景：加入中科量枢量子软件团队，负责量子算法 SDK 与编译器后端开发，支撑量子云平台上的用户任务编译、优化与执行。\n\n核心职责：\n- 设计并实现量子线路建模、门级优化与噪声感知编译流程。\n- 打通从高层线路抽象到脉冲调度的全栈编译链路。\n- 与量子硬件、量子算法团队协作提升真实设备上的执行保真度。\n\n任职要求：\n- 精通 Python，熟悉 Qiskit / Cirq / Q# 任一主流框架。\n- 理解量子线路、门模型与基础编译优化。\n- 有编译器、程序分析或高性能计算经验者优先。\n\n加分项：参与过开源量子框架贡献或硬件后端对接。',
      demo_pos_qc_2: '岗位背景：聚焦表面码与拓扑编码研究，为容错量子计算路线图提供码距扩展、解码器设计与逻辑错误率压降方案。\n\n核心职责：\n- 研究表面码、拓扑编码的码距扩展与阈值行为。\n- 设计最小权重完美匹配或神经网络解码器并做性能评估。\n- 基于超导或离子阱实验数据验证纠错增益。\n\n任职要求：\n- 扎实的量子信息理论基础，熟悉稳定子形式与解码框架。\n- 有解码器实现、数值仿真或实验数据建模经验。\n- 能阅读并复现顶会论文中的纠错实验。\n\n加分项：发表过量子纠错相关论文或拥有真实硬件验证经历。',
      demo_pos_qc_3: '岗位背景：负责变分量子算法、量子机器学习与组合优化求解器的设计与仿真验证，推动算法在真实场景落地。\n\n核心职责：\n- 实现并改进 VQE / QAOA / 量子核方法等算法原型。\n- 在主流量子框架上完成可复现的仿真与基准测试。\n- 与应用团队把算法对接到金融、化学或物流业务。\n\n任职要求：\n- 熟悉量子线路编程与线性代数基础。\n- 有 Python 与一种量子 SDK 的实战项目经验。\n- 理解经典优化器与噪声对算法结果的影响。\n\n加分项：具备机器学习或组合优化背景，能独立完成端到端实验。',
      demo_pos_qc_4: '岗位背景：主导多租户量子计算平台的资源调度、任务队列与混合云接入，保障批处理与交互式任务的稳定性和隔离性。\n\n核心职责：\n- 设计低延迟的线路编译与脉冲下发链路。\n- 规划任务队列、配额与多租户隔离策略。\n- 推动计量计费、权限模型与混合云接入落地。\n\n任职要求：\n- 5 年以上云平台或分布式系统架构经验。\n- 熟悉任务调度、消息队列与云原生技术栈。\n- 有高并发、低延迟系统的设计与调优能力。\n\n加分项：了解量子硬件接入协议或具备算力运营经验。',
      demo_pos_qc_5: '岗位背景：负责离子囚禁、激光冷却与高精度测控电子学调试，支撑离子阱量子比特的相干时间与门保真度提升。\n\n核心职责：\n- 调试离子囚禁势场与激光冷却参数，提升相干时间。\n- 维护高精度测控电子学链路，降低噪声与串扰。\n- 参与态制备、单比特与双比特门的保真度优化。\n\n任职要求：\n- 熟悉真空与低温系统、RF 囚禁与态制备读出。\n- 有离子阱或中性原子实验平台经验者优先。\n- 具备电子学、光学或原子物理交叉背景。\n\n加分项：动手能力强，能独立完成实验装置搭建与排障。',
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
      candidate('demo_cand_9', '沈砚', '瀚海金融', '企业服务产品总监', '杭州', '演示顾问', ['金融科技', '产品战略', '商业化'], 12, { age: '36', education: '硕士 · 浙江大学', expectedBase: '杭州 / 上海', currentSalary: '58K/月 + 年终', expectedSalary: '70K/月起', motivation: '希望进入金融科技增长期团队，负责从产品战略到收入结果。', availability: '2个月内', recommendationComment: '金融科技产品与商业化经验完整，适合负责复杂 B 端产品线。', remark: '重点核实团队规模和长期激励方案。', intakeAt: '2026-07-22T09:00:00.000Z', updatedAt: '2026-08-04T10:30:00.000Z' }),
      candidate('demo_cand_10', '许衡', '智造云联', '售前解决方案经理', '苏州', '演示顾问', ['工业软件', '售前咨询', '大客户'], 9, { age: '33', education: '本科 · 东南大学', expectedBase: '苏州 / 上海', currentSalary: '42K/月', expectedSalary: '50-55K/月', motivation: '希望从单项目售前转向行业解决方案负责人，扩大客户与团队影响力。', availability: '45天内', recommendationComment: '工业软件售前和客户诊断能力突出，可承接复杂项目。', remark: '已有两家制造业客户流程，需确认竞业边界。', intakeAt: '2026-07-25T09:00:00.000Z', updatedAt: '2026-08-03T11:00:00.000Z' }),
      candidate('demo_cand_11', '叶宁', '澄明医疗', '医疗运营负责人', '成都', '演示顾问', ['医疗运营', '用户增长', '团队管理'], 8, { age: '31', education: '本科 · 四川大学', expectedBase: '成都', currentSalary: '36K/月 + 奖金', expectedSalary: '45K/月', motivation: '看好数字医疗长期价值，希望负责区域业务从试点到规模化。', availability: '30天内', recommendationComment: '医疗业务运营经验扎实，具备从 0 到 1 搭建团队的经历。', remark: '关注业务合规和区域资源投入。', intakeAt: '2026-07-28T09:00:00.000Z', updatedAt: '2026-08-05T09:15:00.000Z' }),
      candidate('demo_cand_12', '陆川', '北辰科技', '数据工程负责人', '武汉', '演示顾问', ['数据工程', '云平台', '团队管理'], 10, { age: '34', education: '硕士 · 华中科技大学', expectedBase: '武汉 / 深圳', currentSalary: '48K/月', expectedSalary: '60K/月', motivation: '希望带领数据平台团队服务更多业务线，参与云原生架构升级。', availability: '60天内', recommendationComment: '数据平台架构和团队管理兼备，适合建设期技术团队。', remark: '需进一步确认远程协作和搬迁安排。', intakeAt: '2026-07-30T09:00:00.000Z', updatedAt: '2026-08-05T14:30:00.000Z' }),
      candidate('demo_qc_cand_21', '沈逸辰', '本源量子', '量子软件工程师', '合肥', '演示顾问', ['量子软件', 'Qiskit', 'Python'], 6, { age: '31', education: '硕士 · 中科大', summary: '6 年量子软件经验，主导量子算法 SDK 与噪声感知编译器开发，熟悉从线路抽象到脉冲调度的全栈优化。', rawText: '沈逸辰｜男｜合肥｜6 年量子软件经验\n求职方向：量子软件工程师\n\n本源量子｜量子软件工程师｜2021.03-至今\n- 负责量子算法 SDK 与编译器后端，支撑云平台上万次任务编译。\n- 设计噪声感知编译流程，关键线路保真度提升 19%。\n- 与硬件组协作完成门级优化与调度链路压降。\n\n教育背景：中国科学技术大学｜量子信息硕士。', formattedText: '## 沈逸辰\n\n**量子软件工程师｜合肥｜6 年经验**\n\n- 主导量子算法 SDK 与噪声感知编译器，熟悉 Qiskit / Cirq。\n- 关键线路保真度提升 19%，支撑云平台任务编译。\n- 与硬件、算法组协作完成门级优化到脉冲调度的全栈优化。', recommendationComment: '量子软件与编译器经验完整，可直接承接云平台研发。', remark: '需确认对离子阱后端的适配意愿。', intakeAt: '2026-08-02T09:00:00.000Z', updatedAt: '2026-08-12T10:30:00.000Z' }),
      candidate('demo_qc_cand_22', '韩沐阳', '国盾量子', '量子通信工程师', '合肥', '演示顾问', ['量子密钥', '光通信', '嵌入式'], 5, { age: '30', education: '本科 · 合工大', summary: '5 年量子密钥分发与光通信经验，熟悉 QKD 系统调试与嵌入式控制。', rawText: '韩沐阳｜男｜合肥｜5 年量子通信经验\n求职方向：量子通信工程师\n\n国盾量子｜量子通信工程师｜2021.06-至今\n- 负责 QKD 终端的系统联调与密钥成码率优化。\n- 调试嵌入式控制模块，将现场部署周期缩短 30%。\n\n教育背景：合肥工业大学｜光电信息科学与工程。', formattedText: '## 韩沐阳\n\n**量子通信工程师｜合肥｜5 年经验**\n\n- 熟悉 QKD 系统联调与密钥成码率优化。\n- 嵌入式控制模块调试经验，部署周期缩短 30%。', recommendationComment: '量子通信与光电子基础扎实，适合中科量枢通信方向。', remark: '建议补充云平台接入经验。', intakeAt: '2026-08-03T09:00:00.000Z', updatedAt: '2026-08-12T11:00:00.000Z' }),
      candidate('demo_qc_cand_23', '苏景行', '图灵量子', '光量子研究员', '上海', '演示顾问', ['光量子', '集成光学', '仿真'], 4, { age: '29', education: '博士 · 上海交大', summary: '光量子集成光学方向博士，专注可编程光子线路与仿真验证。', rawText: '苏景行｜男｜上海｜4 年光量子研究经验\n求职方向：光量子研究员\n\n图灵量子｜光量子研究员｜2022.07-至今\n- 负责可编程光子线路的架构设计与仿真验证。\n- 搭建硅光芯片封装测试流程，良率提升 12%。\n\n教育背景：上海交通大学｜光学工程博士。', formattedText: '## 苏景行\n\n**光量子研究员｜上海｜4 年经验**\n\n- 可编程光子线路架构与仿真验证。\n- 硅光芯片封装测试流程搭建，良率提升 12%。', recommendationComment: '光量子与集成光学背景稀缺，适合前沿研发。', remark: '需确认是否接受合肥驻地。', intakeAt: '2026-08-04T09:00:00.000Z', updatedAt: '2026-08-12T11:30:00.000Z' }),
      candidate('demo_qc_cand_24', '裴知远', '清华大学量子信息中心', '量子纠错博士生', '北京', '演示顾问', ['量子纠错', '表面码', '解码器'], 3, { age: '27', education: '博士在读 · 清华', summary: '量子纠错方向博士生，研究表面码解码器与逻辑错误率压降。', rawText: '裴知远｜男｜北京｜量子纠错博士在读\n求职方向：量子纠错研究员\n\n清华大学量子信息中心｜研究助理｜2023.09-至今\n- 研究表面码神经网络解码器，逻辑错误率下降一个数量级。\n- 在超导量子实验数据上验证解码方案。\n\n教育背景：清华大学｜量子信息博士在读。', formattedText: '## 裴知远\n\n**量子纠错博士生｜北京**\n\n- 表面码神经网络解码器研究，逻辑错误率下降一个数量级。\n- 有超导量子实验数据验证经验。', recommendationComment: '理论功底强，适合纠错方向攻坚。', remark: '应届博士，需确认入职时间。', intakeAt: '2026-08-05T09:00:00.000Z', updatedAt: '2026-08-12T12:00:00.000Z' }),
      candidate('demo_qc_cand_25', '罗清让', '中国科学技术大学', '超导量子实验员', '合肥', '演示顾问', ['超导量子', '低温', '测控'], 4, { age: '28', education: '硕士 · 中科大', summary: '超导量子实验方向，熟悉稀释制冷机、低温测控与态制备读出。', rawText: '罗清让｜男｜合肥｜4 年超导量子实验经验\n求职方向：超导量子实验员\n\n中国科学技术大学｜实验助理｜2022.09-至今\n- 负责稀释制冷机运维与低温测控链路调试。\n- 参与超导量子比特相干时间提升实验。\n\n教育背景：中国科学技术大学｜物理学硕士。', formattedText: '## 罗清让\n\n**超导量子实验员｜合肥｜4 年经验**\n\n- 稀释制冷机运维与低温测控调试。\n- 参与超导量子比特相干时间提升实验。', recommendationComment: '实验动手能力强，适合硬件平台。', remark: '需确认岗位方向与论文产出平衡。', intakeAt: '2026-08-06T09:00:00.000Z', updatedAt: '2026-08-12T12:30:00.000Z' }),
      candidate('demo_qc_cand_26', '方既明', '之江实验室', '量子算法研究员', '杭州', '演示顾问', ['量子算法', 'VQE', 'QAOA'], 5, { age: '32', education: '博士 · 浙大', summary: '量子算法研究员，专注 VQE / QAOA 与组合优化求解器落地。', rawText: '方既明｜男｜杭州｜5 年量子算法经验\n求职方向：量子算法工程师\n\n之江实验室｜量子算法研究员｜2021.04-至今\n- 负责 VQE / QAOA 求解器设计与仿真验证。\n- 将量子算法落地到组合优化场景，较经典基线提速明显。\n\n教育背景：浙江大学｜计算机博士。', formattedText: '## 方既明\n\n**量子算法研究员｜杭州｜5 年经验**\n\n- VQE / QAOA 求解器设计与仿真验证。\n- 组合优化场景落地，较经典基线提速明显。', recommendationComment: '算法与工程落地兼备，适合应用团队。', remark: '需确认是否愿意转向硬件协同优化。', intakeAt: '2026-08-07T09:00:00.000Z', updatedAt: '2026-08-12T13:00:00.000Z' }),
      candidate('demo_qc_cand_27', '卫昭明', '华为量子', '量子云平台架构师', '深圳', '演示顾问', ['云平台', '分布式', '量子调度'], 9, { age: '35', education: '硕士 · 华中科大', summary: '9 年云平台架构经验，主导多租户量子计算平台的资源调度与混合云接入。', rawText: '卫昭明｜男｜深圳｜9 年云平台架构经验\n求职方向：量子云平台架构师\n\n华为量子｜云平台架构师｜2019.05-至今\n- 主导多租户量子计算平台资源调度与任务队列。\n- 设计低延迟线路编译与脉冲下发链路，稳定性提升 40%。\n\n教育背景：华中科技大学｜软件工程硕士。', formattedText: '## 卫昭明\n\n**量子云平台架构师｜深圳｜9 年经验**\n\n- 多租户量子计算平台资源调度与任务队列。\n- 低延迟编译与脉冲下发链路，稳定性提升 40%。', recommendationComment: '云平台与分布式经验深厚，可牵头平台建设。', remark: '薪资预期较高，需确认预算。', intakeAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-12T13:30:00.000Z' }),
      candidate('demo_qc_cand_28', '乔砚', '百度量子', '量子机器学习研究员', '北京', '演示顾问', ['量子机器学习', 'PyTorch', '优化'], 6, { age: '33', education: '博士 · 中科院', summary: '量子机器学习研究员，熟悉量子核方法与变分电路在 PyTorch 中的训练。', rawText: '乔砚｜女｜北京｜6 年量子机器学习经验\n求职方向：量子机器学习研究员\n\n百度量子｜研究员｜2020.07-至今\n- 负责量子核方法与变分电路训练框架搭建。\n- 将量子模型应用于化学分子性质预测。\n\n教育背景：中国科学院｜量子信息博士。', formattedText: '## 乔砚\n\n**量子机器学习研究员｜北京｜6 年经验**\n\n- 量子核方法与变分电路训练框架。\n- 量子模型应用于化学分子性质预测。', recommendationComment: '量子 ML 与深度学习交叉背景突出。', remark: '需确认技术方向是否匹配云平台路线。', intakeAt: '2026-08-09T09:00:00.000Z', updatedAt: '2026-08-12T14:00:00.000Z' }),
      candidate('demo_qc_cand_29', '岑予安', '阿里量子', '量子芯片设计', '杭州', '演示顾问', ['量子芯片', 'EDA', '半导体'], 7, { age: '34', education: '硕士 · 复旦', summary: '量子芯片设计经验，熟悉 EDA 流程与半导体工艺协同。', rawText: '岑予安｜男｜杭州｜7 年量子芯片设计经验\n求职方向：量子芯片设计工程师\n\n阿里量子｜芯片设计工程师｜2019.03-至今\n- 负责量子芯片版图设计与 EDA 流程搭建。\n- 协同半导体工艺完成流片验证。\n\n教育背景：复旦大学｜微电子硕士。', formattedText: '## 岑予安\n\n**量子芯片设计｜杭州｜7 年经验**\n\n- 量子芯片版图设计与 EDA 流程搭建。\n- 协同半导体工艺完成流片验证。', recommendationComment: '芯片设计与工艺协同经验稀缺。', remark: '需确认驻地合肥的接受度。', intakeAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-12T14:30:00.000Z' }),
      candidate('demo_qc_cand_30', '虞清和', '玻色量子', '量子计算产品经理', '北京', '演示顾问', ['产品', '量子退火', '商业化'], 8, { age: '36', education: '硕士 · 北邮', summary: '量子计算产品经理，主导量子退火产品的商业化与客户落地。', rawText: '虞清和｜女｜北京｜8 年产品经验\n求职方向：量子计算产品经理\n\n玻色量子｜产品经理｜2018.05-至今\n- 主导量子退火产品 roadmap 与商业化落地。\n- 拓展金融与物流行业客户，签约多个试点。\n\n教育背景：北京邮电大学｜信息管理硕士。', formattedText: '## 虞清和\n\n**量子计算产品经理｜北京｜8 年经验**\n\n- 量子退火产品 roadmap 与商业化落地。\n- 拓展金融、物流行业客户并签约试点。', recommendationComment: '产品商业化与行业客户经验完整。', remark: '需确认是否愿意转向研发协同型产品。', intakeAt: '2026-08-11T09:00:00.000Z', updatedAt: '2026-08-12T15:00:00.000Z' }),
      candidate('demo_qc_cand_31', '宋怀瑾', '启科量子', '离子阱工程师', '北京', '演示顾问', ['离子阱', '真空', '激光'], 6, { age: '33', education: '博士 · 清华', summary: '离子阱方向博士，熟悉真空系统、激光冷却与高精度测控。', rawText: '宋怀瑾｜男｜北京｜6 年离子阱研究经验\n求职方向：离子阱量子工程师\n\n启科量子｜离子阱工程师｜2020.09-至今\n- 负责离子囚禁与激光冷却系统调试。\n- 提升离子阱比特相干时间与门保真度。\n\n教育背景：清华大学｜物理博士。', formattedText: '## 宋怀瑾\n\n**离子阱量子工程师｜北京｜6 年经验**\n\n- 离子囚禁与激光冷却系统调试。\n- 提升离子阱比特相干时间与门保真度。', recommendationComment: '离子阱硬件经验扎实，适合中科量枢硬件线。', remark: '需确认驻地合肥。', intakeAt: '2026-08-12T09:00:00.000Z', updatedAt: '2026-08-12T15:30:00.000Z' }),
      candidate('demo_qc_cand_32', '简言之', '自旋量子', '量子测控工程师', '合肥', '演示顾问', ['量子测控', 'FPGA', '电子学'], 5, { age: '30', education: '本科 · 电子科大', summary: '量子测控工程师，熟悉 FPGA 控制与高精度电子学调试。', rawText: '简言之｜男｜合肥｜5 年量子测控经验\n求职方向：量子测控工程师\n\n自旋量子｜测控工程师｜2021.04-至今\n- 负责 FPGA 控制逻辑与高精度读出电子学调试。\n- 搭建自动化标定流程，效率提升 25%。\n\n教育背景：电子科技大学｜电子信息工程。', formattedText: '## 简言之\n\n**量子测控工程师｜合肥｜5 年经验**\n\n- FPGA 控制逻辑与高精度读出电子学调试。\n- 自动化标定流程搭建，效率提升 25%。', recommendationComment: '测控与电子学基础好，适合硬件支撑岗。', remark: '需补充量子比特专项经验。', intakeAt: '2026-08-12T09:00:00.000Z', updatedAt: '2026-08-12T16:00:00.000Z' }),
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
      application('demo_app_9', 'demo_cand_9', 'demo_pos_7', 'demo_co_5', 'recommended', '演示顾问', 94),
      application('demo_app_10', 'demo_cand_10', 'demo_pos_8', 'demo_co_6', 'contacted', '演示顾问', 87),
      application('demo_app_11', 'demo_cand_11', 'demo_pos_9', 'demo_co_7', 'interviewing', '演示顾问', 90),
      application('demo_app_12', 'demo_cand_12', 'demo_pos_10', 'demo_co_8', 'screening', '演示顾问', 89),
      application('demo_qc_app_21', 'demo_qc_cand_21', 'demo_pos_qc_1', 'demo_co_qc', 'client_accepted', '演示顾问', 93, {
        progressNote: '量子软件与编译器经验完整，已进入录用与团队组建阶段。',
        pipelineEvents: [
          { id: 'event_qc_app_21_1', fromStage: '', toStage: 'discovered', reasonNote: '外宣网站投递，量子软件方向高度匹配。', occurredAt: '2026-08-12T03:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_21_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '电话沟通，候选人确认意向并进入面试。', occurredAt: '2026-08-13T06:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_22', 'demo_qc_cand_22', 'demo_pos_qc_1', 'demo_co_qc', 'interviewing', '演示顾问', 88, {
        progressNote: '量子通信背景扎实，客户安排技术面试，重点确认云平台接入经验。',
        pipelineEvents: [
          { id: 'event_qc_app_22_1', fromStage: '', toStage: 'discovered', reasonNote: '外宣网站投递，量子通信方向匹配。', occurredAt: '2026-08-12T03:30:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_22_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认看机会。', occurredAt: '2026-08-13T07:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_23', 'demo_qc_cand_23', 'demo_pos_qc_2', 'demo_co_qc', 'recommended', '演示顾问', 85, {
        progressNote: '光量子研究背景稀缺，已发送推荐报告待客户反馈。',
        pipelineEvents: [
          { id: 'event_qc_app_23_1', fromStage: '', toStage: 'discovered', reasonNote: '外宣网站投递，光量子方向匹配。', occurredAt: '2026-08-12T04:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_23_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T08:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_24', 'demo_qc_cand_24', 'demo_pos_qc_2', 'demo_co_qc', 'offer', '演示顾问', 90, {
        progressNote: '量子纠错理论功底强，客户已发出 Offer，待确认入职时间。',
        pipelineEvents: [
          { id: 'event_qc_app_24_1', fromStage: '', toStage: 'discovered', reasonNote: '小蜜蜂从论文站点发现，纠错方向匹配。', occurredAt: '2026-08-12T05:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_24_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并进入筛选。', occurredAt: '2026-08-13T09:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_25', 'demo_qc_cand_25', 'demo_pos_qc_3', 'demo_co_qc', 'screening', '演示顾问', 87, {
        progressNote: '超导量子实验经验好，但面试表现未达预期，暂缓推进。',
        pipelineEvents: [
          { id: 'event_qc_app_25_1', fromStage: '', toStage: 'discovered', reasonNote: '小蜜蜂发现，超导实验方向匹配。', occurredAt: '2026-08-12T05:30:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_25_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T10:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_26', 'demo_qc_cand_26', 'demo_pos_qc_3', 'demo_co_qc', 'contacted', '演示顾问', 84, {
        progressNote: '量子算法研究员，已建立联系，等待补充组合优化落地案例。',
        pipelineEvents: [
          { id: 'event_qc_app_26_1', fromStage: '', toStage: 'discovered', reasonNote: '小蜜蜂发现，量子算法方向匹配。', occurredAt: '2026-08-12T06:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_26_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T11:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_27', 'demo_qc_cand_27', 'demo_pos_qc_4', 'demo_co_qc', 'client_accepted', '演示顾问', 94, {
        progressNote: '云平台架构经验深厚，客户高度认可，已进入录用阶段。',
        pipelineEvents: [
          { id: 'event_qc_app_27_1', fromStage: '', toStage: 'discovered', reasonNote: '倍罗 AI 检索命中，云平台架构方向匹配。', occurredAt: '2026-08-12T03:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_27_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并进入面试。', occurredAt: '2026-08-13T06:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_28', 'demo_qc_cand_28', 'demo_pos_qc_4', 'demo_co_qc', 'contacted', '演示顾问', 86, {
        progressNote: '量子机器学习背景好，但技术方向与客户云平台路线不完全契合，暂缓。',
        pipelineEvents: [
          { id: 'event_qc_app_28_1', fromStage: '', toStage: 'discovered', reasonNote: '倍罗 AI 检索命中，量子 ML 方向匹配。', occurredAt: '2026-08-12T03:30:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_28_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T07:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_29', 'demo_qc_cand_29', 'demo_pos_qc_5', 'demo_co_qc', 'interviewing', '演示顾问', 89, {
        progressNote: '量子芯片设计经验稀缺，客户安排技术面试。',
        pipelineEvents: [
          { id: 'event_qc_app_29_1', fromStage: '', toStage: 'discovered', reasonNote: '倍罗 AI 检索命中，芯片设计方向匹配。', occurredAt: '2026-08-12T04:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_29_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T08:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_30', 'demo_qc_cand_30', 'demo_pos_qc_4', 'demo_co_qc', 'interviewing', '演示顾问', 91, {
        progressNote: '量子计算产品商业化经验完整，已进入终面，Offer 阶段候选人提出长期激励诉求。',
        pipelineEvents: [
          { id: 'event_qc_app_30_1', fromStage: '', toStage: 'discovered', reasonNote: '传统猎头推荐，产品商业化方向匹配。', occurredAt: '2026-08-12T05:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_30_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并进入面试。', occurredAt: '2026-08-13T09:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_31', 'demo_qc_cand_31', 'demo_pos_qc_5', 'demo_co_qc', 'interviewing', '演示顾问', 90, {
        progressNote: '离子阱硬件经验扎实，客户安排技术面试。',
        pipelineEvents: [
          { id: 'event_qc_app_31_1', fromStage: '', toStage: 'discovered', reasonNote: '传统猎头推荐，离子阱方向匹配。', occurredAt: '2026-08-12T05:30:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_31_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T10:00:00.000Z', actor: '演示顾问' },
        ],
      }),
      application('demo_qc_app_32', 'demo_qc_cand_32', 'demo_pos_qc_5', 'demo_co_qc', 'contacted', '演示顾问', 85, {
        progressNote: '量子测控工程师，已建立联系，等待补充量子比特专项经验。',
        pipelineEvents: [
          { id: 'event_qc_app_32_1', fromStage: '', toStage: 'discovered', reasonNote: '传统猎头推荐，测控方向匹配。', occurredAt: '2026-08-12T06:00:00.000Z', actor: '演示顾问' },
          { id: 'event_qc_app_32_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认意向。', occurredAt: '2026-08-13T11:00:00.000Z', actor: '演示顾问' },
        ],
      }),
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
      demo_app_7: { progressNote: '候选人处于被动看机会状态，已加入岗位人才池，暂不主动推荐。', communicationLog: '2026-08-01 已发送岗位摘要，候选人未明确回复，计划一周后再次触达。', pipelineEvents: [{ id: 'event_demo_app_7_1', fromStage: '', toStage: 'discovered', reasonNote: '加入 AI 产品岗位人才池。', occurredAt: '2026-08-01T03:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_7_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '发送岗位摘要并完成首次触达。', occurredAt: '2026-08-02T03:00:00.000Z', actor: '演示顾问' }] },
      demo_app_8: { progressNote: '候选人行业研究和方案能力较好，需进一步核实是否有直接客户拓展业绩。', communicationLog: '2026-07-31 完成首次沟通，候选人愿意了解医疗行业岗位。', pipelineEvents: [{ id: 'event_demo_app_8_1', fromStage: '', toStage: 'discovered', reasonNote: '从行业顾问人才池发现。', occurredAt: '2026-07-30T05:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_8_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成首次沟通并确认行业方向。', occurredAt: '2026-07-31T06:30:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_8_3', fromStage: 'contacted', toStage: 'to_recommend', reasonNote: '初步匹配岗位，但推荐前需补充客户拓展案例。', occurredAt: '2026-07-31T08:30:00.000Z', actor: '演示顾问' }] },
      demo_app_9: { progressNote: '客户认可其金融产品商业化经验，下一步由 CTO 和业务负责人联合面试。', communicationLog: '2026-07-24 完成首次沟通，候选人关注产品决策权和长期激励。\n2026-08-02 客户确认进入面试。', pipelineEvents: [{ id: 'event_demo_app_9_1', fromStage: '', toStage: 'discovered', reasonNote: '从金融科技产品人才地图发现。', occurredAt: '2026-07-22T03:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_9_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成岗位和业务阶段介绍。', occurredAt: '2026-07-24T06:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_9_3', fromStage: 'contacted', toStage: 'responded', reasonNote: '候选人回复并确认看机会。', occurredAt: '2026-07-25T08:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_9_4', fromStage: 'responded', toStage: 'recommended', reasonNote: '完成金融客户案例推荐报告。', occurredAt: '2026-08-02T08:30:00.000Z', actor: '演示顾问' }] },
      demo_app_10: { progressNote: '候选人愿意了解平台型售前岗位，等待补充大型制造客户案例。', communicationLog: '2026-07-29 发送岗位说明和团队介绍，候选人已回复。', pipelineEvents: [{ id: 'event_demo_app_10_1', fromStage: '', toStage: 'discovered', reasonNote: '从工业软件售前人才池发现。', occurredAt: '2026-07-25T04:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_10_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '发送岗位业务范围和薪资区间。', occurredAt: '2026-07-29T07:00:00.000Z', actor: '演示顾问' }] },
      demo_app_11: { progressNote: '客户认可区域运营和团队搭建经验，面试重点确认合规与增长方法论。', communicationLog: '2026-07-30 候选人确认对数字医疗方向有兴趣。\n2026-08-04 完成客户一面，等待业务负责人反馈。', pipelineEvents: [{ id: 'event_demo_app_11_1', fromStage: '', toStage: 'discovered', reasonNote: '从数字医疗运营人才池发现。', occurredAt: '2026-07-28T04:30:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_11_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '完成业务方向和岗位边界沟通。', occurredAt: '2026-07-30T06:30:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_11_3', fromStage: 'contacted', toStage: 'interviewing', reasonNote: '客户完成第一轮面试。', occurredAt: '2026-08-04T09:00:00.000Z', actor: '演示顾问' }] },
      demo_app_12: { progressNote: '数据平台经验匹配，候选人处于在职状态，需进一步确认到岗时间。', communicationLog: '2026-07-31 完成首次沟通，候选人愿意了解武汉和深圳双基地机会。', pipelineEvents: [{ id: 'event_demo_app_12_1', fromStage: '', toStage: 'discovered', reasonNote: '从数据工程负责人候选池发现。', occurredAt: '2026-07-30T05:30:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_12_2', fromStage: 'discovered', toStage: 'contacted', reasonNote: '发送岗位架构和团队信息。', occurredAt: '2026-07-31T08:00:00.000Z', actor: '演示顾问' }, { id: 'event_demo_app_12_3', fromStage: 'contacted', toStage: 'screening', reasonNote: '完成技术栈与团队规模初筛。', occurredAt: '2026-08-04T07:30:00.000Z', actor: '演示顾问' }] },
    };
    applications.forEach(item => Object.assign(item, applicationDetails[item.id] || {}));

    const talentSourceChannels = [
      { id: 'demo_channel_referral', name: '人才推荐', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_community', name: '行业社群', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_map', name: '人才地图', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_inbound', name: '主动申请', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_site', name: '外宣网站', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_bee', name: '小蜜蜂', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_bairo', name: '倍罗', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
      { id: 'demo_channel_headhunter', name: '传统猎头', status: 'active', demo: true, createdAt: SEED_DATE, updatedAt: SEED_DATE },
    ];
    const channelByCompanyId = {
      demo_co_1: 'demo_channel_map', demo_co_2: 'demo_channel_referral', demo_co_3: 'demo_channel_community', demo_co_4: 'demo_channel_inbound',
      demo_co_5: 'demo_channel_map', demo_co_6: 'demo_channel_referral', demo_co_7: 'demo_channel_community', demo_co_8: 'demo_channel_inbound',
    };
    const channelNameById = Object.fromEntries(talentSourceChannels.map(channel => [channel.id, channel.name]));
    const sourceCompanyByCandidateId = {
      demo_cand_1: 'demo_co_1', demo_cand_2: 'demo_co_1', demo_cand_3: 'demo_co_2', demo_cand_4: 'demo_co_3',
      demo_cand_5: 'demo_co_4', demo_cand_6: 'demo_co_2', demo_cand_7: 'demo_co_1', demo_cand_8: 'demo_co_3',
      demo_cand_9: 'demo_co_5', demo_cand_10: 'demo_co_6', demo_cand_11: 'demo_co_7', demo_cand_12: 'demo_co_8',
      demo_qc_cand_21: 'demo_co_qc', demo_qc_cand_22: 'demo_co_qc', demo_qc_cand_23: 'demo_co_qc', demo_qc_cand_24: 'demo_co_qc',
      demo_qc_cand_25: 'demo_co_qc', demo_qc_cand_26: 'demo_co_qc', demo_qc_cand_27: 'demo_co_qc', demo_qc_cand_28: 'demo_co_qc',
      demo_qc_cand_29: 'demo_co_qc', demo_qc_cand_30: 'demo_co_qc', demo_qc_cand_31: 'demo_co_qc', demo_qc_cand_32: 'demo_co_qc',
    };
    const qcChannelByCandidateId = {
      demo_qc_cand_21: 'demo_channel_site', demo_qc_cand_22: 'demo_channel_site', demo_qc_cand_23: 'demo_channel_site',
      demo_qc_cand_24: 'demo_channel_bee', demo_qc_cand_25: 'demo_channel_bee', demo_qc_cand_26: 'demo_channel_bee',
      demo_qc_cand_27: 'demo_channel_bairo', demo_qc_cand_28: 'demo_channel_bairo', demo_qc_cand_29: 'demo_channel_bairo',
      demo_qc_cand_30: 'demo_channel_headhunter', demo_qc_cand_31: 'demo_channel_headhunter', demo_qc_cand_32: 'demo_channel_headhunter',
    };
    candidates.forEach(candidateItem => {
      const sourceCompanyId = sourceCompanyByCandidateId[candidateItem.id] || '';
      const sourceChannelId = channelByCompanyId[sourceCompanyId] || '';
      candidateItem.sourceCompanyId = sourceCompanyId;
      candidateItem.sourceChannelId = sourceChannelId;
      candidateItem.sourceChannelName = channelNameById[sourceChannelId] || '';
    });
    candidates.forEach(candidateItem => {
      const qcChannelId = qcChannelByCandidateId[candidateItem.id];
      if (!qcChannelId) return;
      candidateItem.sourceCompanyId = 'demo_co_qc';
      candidateItem.sourceChannelId = qcChannelId;
      candidateItem.sourceChannelName = channelNameById[qcChannelId] || '';
    });
    const funnelStagesByApplication = {
      demo_app_1: ['imported', 'contacted', 'matched', 'interviewed'], demo_app_2: ['imported', 'contacted', 'matched', 'interviewed'],
      demo_app_3: ['imported', 'contacted', 'matched', 'interviewed', 'offered'], demo_app_4: ['imported', 'contacted', 'matched', 'interviewed', 'offered', 'hired'],
      demo_app_5: ['imported', 'contacted'], demo_app_6: ['imported', 'contacted', 'matched'], demo_app_7: ['imported', 'contacted'], demo_app_8: ['imported', 'contacted', 'matched'],
      demo_app_9: ['imported', 'contacted', 'matched'], demo_app_10: ['imported', 'contacted'], demo_app_11: ['imported', 'contacted', 'matched', 'interviewed'], demo_app_12: ['imported', 'contacted', 'matched'],
    };
    const talentFunnelEvents = applications.flatMap((applicationItem, index) => {
      const channelId = channelByCompanyId[applicationItem.companyId] || talentSourceChannels[index % talentSourceChannels.length].id;
      return (funnelStagesByApplication[applicationItem.id] || ['imported']).map((stage, stageIndex) => ({
        id: `demo_funnel_${applicationItem.id}_${stage}`, applicationId: applicationItem.id, candidateId: applicationItem.candidateId,
        positionId: applicationItem.positionId, companyId: applicationItem.companyId, channelId, stage, result: 'success', isPilot: true,
        occurredAt: `2026-08-${String(Math.min(12, 1 + index + stageIndex)).padStart(2, '0')}T0${stageIndex}:00:00.000Z`, demo: true,
      }));
    });
    talentFunnelEvents.push({ id: 'demo_funnel_failure_1', applicationId: 'demo_app_10', candidateId: 'demo_cand_10', positionId: 'demo_pos_8', companyId: 'demo_co_6', channelId: 'demo_channel_referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-10T09:30:00.000Z', demo: true });

    // 量子计算试点（中科量枢）渠道漏斗事件：各渠道均有候选人漏斗，事件日期均晚于默认基线 2026-08-12。
    const quantumApplicationsById = new Map(applications.filter(item => String(item.id).startsWith('demo_qc_app_')).map(item => [item.id, item]));
    const quantumFunnelProgression = {
      demo_qc_app_21: ['imported', 'contacted', 'matched', 'interviewed', 'offered', 'hired'],
      demo_qc_app_22: ['imported', 'contacted', 'matched', 'interviewed'],
      demo_qc_app_23: ['imported', 'contacted', 'matched'],
      demo_qc_app_24: ['imported', 'contacted', 'matched', 'interviewed', 'offered'],
      demo_qc_app_25: ['imported', 'contacted', 'matched'],
      demo_qc_app_26: ['imported', 'contacted'],
      demo_qc_app_27: ['imported', 'contacted', 'matched', 'interviewed', 'offered', 'hired'],
      demo_qc_app_28: ['imported', 'contacted'],
      demo_qc_app_29: ['imported', 'contacted', 'matched', 'interviewed'],
      demo_qc_app_30: ['imported', 'contacted', 'matched', 'interviewed'],
      demo_qc_app_31: ['imported', 'contacted', 'matched', 'interviewed'],
      demo_qc_app_32: ['imported', 'contacted'],
    };
    const quantumFunnelEvents = Object.entries(quantumFunnelProgression).flatMap(([appId, stages]) => {
      const app = quantumApplicationsById.get(appId);
      if (!app) return [];
      const channelId = qcChannelByCandidateId[app.candidateId];
      return stages.map((stage, stageIndex) => ({
        id: `demo_funnel_qc_${appId}_${stage}`, applicationId: appId, candidateId: app.candidateId,
        positionId: app.positionId, companyId: 'demo_co_qc', channelId, stage, result: 'success', isPilot: true,
        occurredAt: `2026-08-${String(Math.min(15, 12 + stageIndex)).padStart(2, '0')}T${String(stageIndex % 10).padStart(2, '0')}:00:00.000Z`, demo: true,
      }));
    });
    talentFunnelEvents.push(...quantumFunnelEvents);
    // 量子试点失败掉点（用于卡点诊断演示）：每渠道各一条代表性掉点。
    talentFunnelEvents.push({ id: 'demo_funnel_qc_fail_1', applicationId: 'demo_qc_app_30', candidateId: 'demo_qc_cand_30', positionId: 'demo_pos_qc_4', companyId: 'demo_co_qc', channelId: 'demo_channel_headhunter', stage: 'offered', result: 'failed', reasonCode: 'offer_declined', isPilot: true, occurredAt: '2026-08-15T10:30:00.000Z', demo: true });
    talentFunnelEvents.push({ id: 'demo_funnel_qc_fail_2', applicationId: 'demo_qc_app_25', candidateId: 'demo_qc_cand_25', positionId: 'demo_pos_qc_3', companyId: 'demo_co_qc', channelId: 'demo_channel_bee', stage: 'interviewed', result: 'failed', reasonCode: 'interview_failed', isPilot: true, occurredAt: '2026-08-14T11:15:00.000Z', demo: true });
    talentFunnelEvents.push({ id: 'demo_funnel_qc_fail_3', applicationId: 'demo_qc_app_28', candidateId: 'demo_qc_cand_28', positionId: 'demo_pos_qc_4', companyId: 'demo_co_qc', channelId: 'demo_channel_bairo', stage: 'matched', result: 'failed', reasonCode: 'tech_direction_mismatch', isPilot: true, occurredAt: '2026-08-13T09:45:00.000Z', demo: true });

    return {
      meta: { mode: 'guest-demo', fictional: true, version: 1, seedVersion: 4, seededAt: SEED_DATE },
      names: ['演示工作区'],
      jobs: [[]],
      workbenchV2: {
        schemaVersion: 2,
        companies, positions, candidates, applications, talentSourceChannels, talentFunnelEvents,
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
    if (Number(workspace.meta?.seedVersion || 0) >= 4) return false;
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
    ['companies', 'positions', 'candidates', 'applications', 'talentSourceChannels', 'talentFunnelEvents'].forEach(key => {
      if (!Array.isArray(workbench[key])) workbench[key] = [];
      const existingIds = new Set(workbench[key].map(item => item.id));
      (seedWorkbench[key] || []).forEach(item => {
        if (!existingIds.has(item.id)) { workbench[key].push(clone(item)); changed = true; }
      });
    });
    const seedCandidatesById = new Map(seedWorkbench.candidates.map(item => [item.id, item]));
    (workbench.candidates || []).forEach(item => {
      const source = seedCandidatesById.get(item.id);
      if (!source) return;
      ['age', 'education', 'expectedBase', 'currentSalary', 'expectedSalary', 'motivation', 'availability', 'recommendationComment', 'remark', 'sourceCompanyId', 'sourceChannelId', 'sourceChannelName'].forEach(key => {
        if (!String(item[key] ?? '').trim() && String(source[key] ?? '').trim()) { item[key] = source[key]; changed = true; }
      });
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
    workspace.meta.seedVersion = 4;
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
