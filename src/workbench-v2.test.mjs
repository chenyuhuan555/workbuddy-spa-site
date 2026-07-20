// Phase 1 回归测试：人才库（由“候选人”模块升级）
// 覆盖：(1) 数据迁移/持久化 (2) 人才列表筛选 (3) 候选人详情与推进记录回归
//      (4) 新增：简历完整度 + 最近更新时间
// 运行：node --test src/workbench-v2.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// workbench-v2.js 是 UMD 风格 IIFE，无 window 时挂到 globalThis
await import('./workbench-v2.js');
const { WorkbenchV2 } = globalThis;

const INDEX_HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// (1) 数据迁移 / 持久化
// ---------------------------------------------------------------------------

test('createCandidate 保留既有 id 且 status 默认 open（资产状态，非管道阶段）', () => {
  const created = WorkbenchV2.createCandidate({ id: 'cand_keep', name: '张三' });
  assert.equal(created.id, 'cand_keep', '必须保留既有候选人 id，禁止重建');
  assert.equal(created.status, 'open', 'status 表示人才资产状态，默认 open');
  assert.ok(created.updatedAt, '必须带 updatedAt 时间戳');
  assert.ok(created.createdAt, '必须带 createdAt 时间戳');
});

test('validateBundle 拒绝错误版本且补全 resumeVersions', () => {
  assert.throws(() => WorkbenchV2.validateBundle({ schemaVersion: 1, candidates: [] }), /数据版本/);

  const bundle = WorkbenchV2.validateBundle({
    schemaVersion: 2,
    candidates: [{ id: 'c1', name: '李四', electronicResumeText: '十年后端经验' }],
  });
  assert.equal(bundle.schemaVersion, 2);
  assert.equal(bundle.candidates.length, 1);
  assert.equal(bundle.candidates[0].resumeVersions.length, 1, '电子简历文本应被收敛进 resumeVersions');
  assert.equal(bundle.candidates[0].resumeVersions[0].rawText, '十年后端经验');
});

test('createApplication 建立 talent×position 推进且仅允许一条活跃推进', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '王五' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: '后端工程师' }));

  const app = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1', stage: 'discovered' });
  assert.equal(bundle.applications.length, 1);
  assert.equal(app.stage, 'discovered');

  assert.throws(
    () => WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1' }),
    /已存在此岗位推进/,
    '同一人才在同一岗位只允许一条活跃推进（防止重复）'
  );
});

test('changeApplicationStage 推进阶段并写入 updatedAt（阶段属于推进关系，不属于人才全局）', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '赵六' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: '前端' }));
  const app = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1' });

  WorkbenchV2.changeApplicationStage(app, { toStage: 'interviewing' });
  assert.equal(app.stage, 'interviewing');
  assert.ok(app.updatedAt, '推进阶段变更应更新 updatedAt');
  assert.ok(Array.isArray(app.pipelineEvents) && app.pipelineEvents.length === 1);
});

// ---------------------------------------------------------------------------
// (2) 人才列表筛选
// ---------------------------------------------------------------------------

test('filterCandidates 支持 关键词/方向/负责人/状态 过滤', () => {
  const candidates = [
    WorkbenchV2.createCandidate({ name: 'Anna', currentCompany: '腾讯', directions: ['后端'], owner: '顾问A', status: 'open' }),
    WorkbenchV2.createCandidate({ name: 'Bob', currentCompany: '字节', directions: ['前端'], owner: '顾问B', status: 'passive' }),
    WorkbenchV2.createCandidate({ name: 'Cara', currentCompany: '阿里', directions: ['后端'], owner: '顾问A', status: 'onboarded' }),
  ];

  assert.equal(WorkbenchV2.filterCandidates(candidates, { query: '腾讯' }).length, 1);
  assert.equal(WorkbenchV2.filterCandidates(candidates, { direction: '后端' }).length, 2);
  assert.equal(WorkbenchV2.filterCandidates(candidates, { owner: '顾问A' }).length, 2);
  assert.equal(WorkbenchV2.filterCandidates(candidates, { status: 'onboarded' }).length, 1);
  assert.equal(WorkbenchV2.filterCandidates(candidates, { status: 'all' }).length, 3);
});

test('findDuplicateCandidates 命中硬冲突（手机/邮箱）与待复核冲突（姓名+公司）', () => {
  const existing = [
    WorkbenchV2.createCandidate({ name: 'Anna', currentCompany: '腾讯', phone: '13800000000', email: 'a@x.com' }),
    WorkbenchV2.createCandidate({ name: 'Anna', currentCompany: '腾讯', phone: '', email: '' }),
  ];
  const byPhone = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna2', phone: '13800000000' });
  assert.equal(byPhone[0].confidence, 'hard');
  assert.match(byPhone[0].reasons[0], /手机号一致/);

  const byName = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna', currentCompany: '腾讯' });
  assert.equal(byName[0].confidence, 'review');
  assert.match(byName[0].reasons[0], /姓名和当前公司一致/);
});

// ---------------------------------------------------------------------------
// (3) 候选人详情与推进记录回归（源码级，确认路由与推进中心未被改动）
// ---------------------------------------------------------------------------

test('候选人详情路由与推进中心在 Phase 1 保持不变', () => {
  assert.match(INDEX_HTML, /openCandidateDetail\(/, '详情路由函数必须存在');
  assert.match(INDEX_HTML, /openApplicationDetail\(/, '推进记录详情路由必须存在');
  assert.match(INDEX_HTML, /changeWorkbenchApplicationStage\(/, '推进阶段变更函数必须存在');
  // 推进中心标题与页签未被改名
  assert.match(INDEX_HTML, /<h1 class="text-2xl font-bold">推进中心<\/h1>/, '推进中心标题应保持');
  assert.match(INDEX_HTML, /候选人推进/, '推进中心“候选人推进”关系语义保留');
  assert.match(INDEX_HTML, /v-else-if="workbenchRoute\.tab === 'applications'".*推进记录/, '候选人详情“推进记录”页签保留');
});

test('导航项 key 仍为 candidates（仅 label 改为人才库，路由键不变）', () => {
  assert.match(INDEX_HTML, /\{ key: 'candidates', label: '人才库'/, '导航 key 保持 candidates，label 改为人才库');
});

// ---------------------------------------------------------------------------
// (4) 新增：简历完整度 + 最近更新时间
// ---------------------------------------------------------------------------

test('candidateResumeCompleteness 随画像字段填充度从 0 到 100', () => {
  assert.equal(WorkbenchV2.candidateResumeCompleteness({}), 0, '空画像完整度为 0');

  const full = {
    name: '张三', currentCompany: '腾讯', currentTitle: '工程师', city: '深圳',
    owner: '顾问A', phone: '13800000000', skills: ['Go'], directions: ['后端'],
    education: '本科', experienceYears: 8, electronicResumeText: '完整简历文本',
  };
  assert.equal(WorkbenchV2.candidateResumeCompleteness(full), 100, '字段全填应为 100');

  const partial = { name: '李四', currentCompany: '字节', skills: ['Vue'], resumeVersions: [{ rawText: '有文本' }] };
  const score = WorkbenchV2.candidateResumeCompleteness(partial);
  assert.ok(score > 0 && score < 100, `部分字段应为 0-100 之间，实际 ${score}`);
});

test('candidateLastUpdated 优先 updatedAt 并回退 createdAt', () => {
  assert.equal(WorkbenchV2.candidateLastUpdated({}), null, '无时间戳返回 null');
  assert.equal(WorkbenchV2.candidateLastUpdated({ createdAt: '2026-01-01' }), '2026-01-01', '缺 updatedAt 应回退 createdAt');
  assert.equal(
    WorkbenchV2.candidateLastUpdated({ createdAt: '2026-01-01', updatedAt: '2026-06-01' }),
    '2026-06-01',
    '优先 updatedAt'
  );
});

test('模板已暴露完整度/更新时间辅助函数并新增两列表头', () => {
  assert.match(INDEX_HTML, /candidateResumeCompleteness,/, '辅助函数已加入 setup 返回');
  assert.match(INDEX_HTML, /candidateLastUpdated,/, '辅助函数已加入 setup 返回');
  assert.match(INDEX_HTML, /最近更新时间/, '人才库列表新增“最近更新时间”表头');
  assert.match(INDEX_HTML, /简历完整度/, '人才库列表新增“简历完整度”表头');
});

// ---------------------------------------------------------------------------
// (5) 阶段 2：人才(Talent) × 岗位候选关系(Application) 对齐
// ---------------------------------------------------------------------------

test('getTalentById / getTalentApplications 正确按人才聚合其岗位推进', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: 'A岗' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p2', title: 'B岗' }));
  WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1', stage: 'discovered' });
  WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p2', stage: 'screening' });

  assert.equal(WorkbenchV2.getTalentById(bundle, 'c1').id, 'c1');
  assert.equal(WorkbenchV2.getTalentById(bundle, 'nope'), null);
  assert.equal(WorkbenchV2.getTalentApplications(bundle, 'c1').length, 2, '同一人才可同时推进多个岗位');
});

test('同一人才关联两个岗位，阶段互不覆盖', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: 'A岗' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p2', title: 'B岗' }));
  const a1 = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1' });
  const a2 = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p2' });
  WorkbenchV2.changeApplicationStage(a1, { toStage: 'interviewing' });
  WorkbenchV2.changeApplicationStage(a2, { toStage: 'offer' });
  const byPos = Object.fromEntries(WorkbenchV2.getTalentApplications(bundle, 'c1').map(a => [a.positionId, a.stage]));
  assert.equal(byPos.p1, 'interviewing');
  assert.equal(byPos.p2, 'offer', '两个岗位的阶段相互独立，不互相覆盖');
});

test('createTalent 是唯一人才写入入口：硬身份命中则复用既有人才 ID，不新建平行人才', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const first = WorkbenchV2.createTalent(bundle, { name: '李四', phone: '13800000000', email: 'l@x.com' });
  assert.equal(bundle.candidates.length, 1);
  const second = WorkbenchV2.createTalent(bundle, { name: '李四(再传)', phone: '13800000000' });
  assert.equal(bundle.candidates.length, 1, '硬身份（手机号）命中应复用，不新增人才');
  assert.equal(second.id, first.id, '必须保留既有稳定 id，禁止重建');
});

test('updateTalent 修改人才基础资料，不触碰岗位推进阶段', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三', currentTitle: '旧职位' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: 'A岗' }));
  const app = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1', stage: 'screening' });
  app.matchScore = 88;
  app.note = '原始备注';

  WorkbenchV2.updateTalent(bundle, 'c1', { currentTitle: '新职位', city: '上海' });
  assert.equal(bundle.candidates[0].currentTitle, '新职位');
  assert.equal(bundle.candidates[0].city, '上海');
  assert.equal(app.stage, 'screening', '改人才资料不应改动其岗位推进阶段');
  assert.equal(app.matchScore, 88, '改人才资料不应改动推进的匹配分');
  assert.equal(app.note, '原始备注', '改人才资料不应改动推进备注');
});

test('updateTalent 拒绝把阶段类字段写入人才（护栏）', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));
  assert.throws(
    () => WorkbenchV2.updateTalent(bundle, 'c1', { stage: 'interviewing' }),
    /属于 Application/,
    '阶段字段不应写入人才全局状态'
  );
  assert.throws(
    () => WorkbenchV2.updateTalent(bundle, 'c1', { pipelineEvents: [] }),
    /属于 Application/
  );
});

test('updateApplicationStage 仅推进阶段，不覆盖人才基础资料', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三', currentTitle: '工程师' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: 'A岗' }));
  const app = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1', stage: 'discovered' });

  WorkbenchV2.updateApplicationStage(bundle, app.id, 'offer', { reasonCode: '', reasonNote: '推进到Offer' });
  assert.equal(app.stage, 'offer');
  assert.equal(bundle.candidates[0].currentTitle, '工程师', '推进阶段变更不应覆盖人才基础资料');
  assert.equal(bundle.candidates[0].name, '张三');
});

test('加载(validateBundle)后人才数量、ID 与岗位 ID 均保持不变', () => {
  // 构造含多人才 / 多岗位 / 一人双岗的代表性存量数据
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'cust_99', name: '存量人才' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: 'A岗' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'pos_99', title: '存量岗位' }));
  WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1' });
  WorkbenchV2.createApplication(bundle, { candidateId: 'cust_99', positionId: 'pos_99' });

  const loaded = WorkbenchV2.validateBundle(JSON.parse(JSON.stringify(bundle)));
  assert.equal(loaded.candidates.length, 2, '人才数量不变');
  assert.deepEqual(loaded.candidates.map(c => c.id).sort(), ['c1', 'cust_99'], '人才 ID 不变');
  assert.deepEqual(loaded.positions.map(p => p.id).sort(), ['p1', 'pos_99'], '岗位 ID 不变');
  assert.equal(loaded.applications.length, 2);
  assert.ok(loaded.applications.every(a => a.candidateId && a.positionId), '推进关系关联键完整');
});

// ---------------------------------------------------------------------------
// (6) 阶段 3：简历入库与人才详情整合
// ---------------------------------------------------------------------------

test('findDuplicateCandidates 命中原始文件哈希（硬冲突）', () => {
  const existing = [WorkbenchV2.createCandidate({ name: 'Anna', resumeVersions: [{ fileHash: 'abc123' }] })];
  const hits = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna2', fileHash: 'abc123' });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].confidence, 'hard');
  assert.match(hits[0].reasons[0], /原始文件哈希一致/);
});

test('findDuplicateCandidates 命中姓名+手机号后四位（硬冲突）', () => {
  const existing = [WorkbenchV2.createCandidate({ name: 'Anna', phone: '13800000099' })];
  const hits = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna', phone: '13999900099' });
  assert.equal(hits[0].confidence, 'hard');
  assert.match(hits[0].reasons[0], /手机号后四位一致/);
});

test('findDuplicateCandidates 姓名+学历/职位相似进入待复核（不自动合并）', () => {
  const existing = [WorkbenchV2.createCandidate({ name: 'Anna', education: '本科', currentTitle: '后端工程师' })];
  const byEdu = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna', education: '本科' });
  assert.equal(byEdu[0].confidence, 'review');
  const byTitle = WorkbenchV2.findDuplicateCandidates(existing, { name: 'Anna', currentTitle: '后端工程师' });
  assert.equal(byTitle[0].confidence, 'review');
});

test('appendTalentResumeVersion 经统一入口追加简历版本且只存元数据（二进制存外部）', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const t = WorkbenchV2.createTalent(bundle, { name: '张三', phone: '13800000000' });
  const v = WorkbenchV2.appendTalentResumeVersion(bundle, t.id, {
    fileName: '张三-简历.pdf', fileId: 'fid_1', fileType: 'application/pdf', fileSize: 12345, fileHash: 'h1', rawText: '简历文本',
  });
  assert.equal(bundle.candidates[0].resumeVersions.length, 1);
  assert.equal(v.fileId, 'fid_1');
  assert.equal(v.fileName, '张三-简历.pdf');
  assert.ok(!('stage' in v), '简历版本不应携带岗位阶段字段');
  // 同一人才再次追加应累计，不覆盖
  WorkbenchV2.appendTalentResumeVersion(bundle, t.id, { fileName: 'v2.docx', fileId: 'fid_2' });
  assert.equal(bundle.candidates[0].resumeVersions.length, 2, '多次上传应累计版本');
});

test('reconcileParsedFields 只补充空字段，非空字段生成差异不覆盖', () => {
  const existing = { name: '张三', phone: '', city: '深圳', skills: ['Go'] };
  const parsed = { name: '李四', phone: '13900000000', city: '北京', education: '硕士' };
  const { merged, diff } = WorkbenchV2.reconcileParsedFields(existing, parsed);
  assert.equal(merged.phone, '13900000000', '空字段应被补充');
  assert.equal(merged.education, '硕士', '空字段应被补充');
  assert.equal(merged.name, undefined, '非空字段不应被覆盖');
  assert.equal(diff.name, '李四', '非空差异应进入 diff 供人工确认');
  assert.equal(diff.city, '北京', '非空差异应进入 diff');
});

test('shouldCreateTalentFromParsed 空解析结果不创建人才（防 AI 失败静默建空人）', () => {
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({}), false, '无任何身份信息不应建人');
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({ rawText: '一大段文本但无姓名电话邮箱' }), false, '仅有文本无身份不应建人');
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({ name: '王五' }), true, '有姓名应建人');
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({ phone: '13900000000' }), true, '有手机号应建人');
});

test('合并(updateTalent 追加简历版本) 不覆盖顾问手工字段', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const t = WorkbenchV2.createTalent(bundle, { name: '张三', currentTitle: '资深后端', owner: '顾问A' });
  // 顾问手工改了职位
  WorkbenchV2.updateTalent(bundle, t.id, { currentTitle: '架构师（手工）' });
  // 合并：把新简历版本挂到既有人才
  WorkbenchV2.appendTalentResumeVersion(bundle, t.id, { fileName: '新简历.pdf', fileId: 'fid_x' });
  assert.equal(bundle.candidates[0].currentTitle, '架构师（手工）', '合并新简历不应覆盖顾问手工职位');
  assert.equal(bundle.candidates[0].owner, '顾问A');
  assert.equal(bundle.candidates[0].resumeVersions.length, 1);
});

test('validateBundle 保留简历版本元数据(fileId/fileHash)且人才数量不变', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push(WorkbenchV2.createCandidate({
    id: 'c1', name: '张三',
    resumeVersions: [{ id: 'r1', fileName: 'a.pdf', fileId: 'fid_1', fileHash: 'h1', fileSize: 99, rawText: 'txt' }],
  }));
  const loaded = WorkbenchV2.validateBundle(JSON.parse(JSON.stringify(bundle)));
  assert.equal(loaded.candidates.length, 1, '人才数量不变');
  const v = loaded.candidates[0].resumeVersions[0];
  assert.equal(v.fileId, 'fid_1', '外部文件引用元数据应保留');
  assert.equal(v.fileHash, 'h1', '文件哈希应保留');
  assert.equal(v.rawText, 'txt');
});

// ---------------------------------------------------------------------------
// (7) 人才分类目录与分类筛选
// ---------------------------------------------------------------------------

test('getTalentCategories / getTalentCategoryPaths 只读取 settings 中有序的主分类与子分类', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [
    { id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] },
    { id: 'product', name: '产品', subCategories: [] },
  ];

  assert.equal(WorkbenchV2.getTalentCategories(bundle), bundle.settings.talentCategories);
  assert.deepEqual(WorkbenchV2.getTalentCategoryPaths(bundle), [
    { id: 'tech', name: '技术', path: '技术', parentId: null },
    { id: 'backend', name: '后端', path: '技术 / 后端', parentId: 'tech' },
    { id: 'product', name: '产品', path: '产品', parentId: null },
  ]);
  assert.deepEqual(WorkbenchV2.getTalentCategories(WorkbenchV2.createEmptyBundle()), []);
});

test('filterCandidatesByCategory 选择主分类时包含其子分类，选择子分类时只匹配自身', () => {
  const categories = [
    { id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }, { id: 'frontend', name: '前端' }] },
    { id: 'product', name: '产品', subCategories: [] },
  ];
  const candidates = [
    { id: 'c1', categoryIds: ['tech'] },
    { id: 'c2', categoryIds: ['backend'] },
    { id: 'c3', categoryIds: ['frontend', 'product'] },
    { id: 'c4', categoryIds: [] },
  ];

  assert.deepEqual(WorkbenchV2.filterCandidatesByCategory(candidates, categories, 'tech').map(item => item.id), ['c1', 'c2', 'c3']);
  assert.deepEqual(WorkbenchV2.filterCandidatesByCategory(candidates, categories, 'backend').map(item => item.id), ['c2']);
  assert.deepEqual(WorkbenchV2.filterCandidatesByCategory(candidates, categories, 'all').map(item => item.id), ['c1', 'c2', 'c3', 'c4']);
});

test('assignTalentCategories 以去重后的分类 ID 更新人才，且不改动岗位推进', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [{ id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] }];
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: '后端工程师' }));
  const application = WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1', stage: 'screening' });

  const talent = WorkbenchV2.assignTalentCategories(bundle, 'c1', ['backend', 'backend', 'tech']);
  assert.deepEqual(talent.categoryIds, ['backend', 'tech']);
  assert.equal(application.stage, 'screening');
});

test('removeTalentCategory 删除主分类及子分类标记，不删除人才或岗位推进', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [
    { id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] },
    { id: 'product', name: '产品', subCategories: [] },
  ];
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三', categoryIds: ['tech', 'backend', 'product'] }));
  bundle.positions.push(WorkbenchV2.createPosition({ id: 'p1', title: '后端工程师' }));
  WorkbenchV2.createApplication(bundle, { candidateId: 'c1', positionId: 'p1' });

  WorkbenchV2.removeTalentCategory(bundle, 'tech');
  assert.deepEqual(bundle.settings.talentCategories.map(item => item.id), ['product']);
  assert.deepEqual(bundle.candidates[0].categoryIds, ['product']);
  assert.equal(bundle.candidates.length, 1, '删除分类不得删除人才');
  assert.equal(bundle.applications.length, 1, '删除分类不得删除岗位推进');
});

test('assignTalentCategories 仅保留分类目录中存在的 ID', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [{ id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] }];
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三' }));

  const talent = WorkbenchV2.assignTalentCategories(bundle, 'c1', ['backend', 'missing', 'tech', 'missing']);
  assert.deepEqual(talent.categoryIds, ['backend', 'tech']);
});

test('removeTalentCategory 仅更新时间发生分类变化的人才，删除不存在分类无副作用', () => {
  const unchangedAt = '2026-01-01T00:00:00.000Z';
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [
    { id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] },
    { id: 'product', name: '产品', subCategories: [] },
  ];
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三', categoryIds: ['backend'], updatedAt: unchangedAt }));
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c2', name: '李四', categoryIds: ['product'], updatedAt: unchangedAt }));
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c3', name: '王五', categoryIds: [], updatedAt: unchangedAt }));

  WorkbenchV2.removeTalentCategory(bundle, 'backend');
  assert.notEqual(bundle.candidates[0].updatedAt, unchangedAt, '子分类标记被清理的人才应更新时间');
  assert.equal(bundle.candidates[1].updatedAt, unchangedAt, '未关联子分类的人才不应更新时间');
  assert.equal(bundle.candidates[2].updatedAt, unchangedAt, '未分类人才不应更新时间');

  const updatedAfterChildRemoval = bundle.candidates.map(candidate => candidate.updatedAt);
  WorkbenchV2.removeTalentCategory(bundle, 'missing');
  assert.deepEqual(bundle.candidates.map(candidate => candidate.updatedAt), updatedAfterChildRemoval, '删除不存在分类不应更新时间');
});

test('removeTalentCategory 删除主分类时只更新时间发生分类变化的人才', () => {
  const unchangedAt = '2026-01-01T00:00:00.000Z';
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.settings.talentCategories = [
    { id: 'tech', name: '技术', subCategories: [{ id: 'backend', name: '后端' }] },
    { id: 'product', name: '产品', subCategories: [] },
  ];
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c1', name: '张三', categoryIds: ['tech', 'backend'], updatedAt: unchangedAt }));
  bundle.candidates.push(WorkbenchV2.createCandidate({ id: 'c2', name: '李四', categoryIds: ['product'], updatedAt: unchangedAt }));

  WorkbenchV2.removeTalentCategory(bundle, 'tech');
  assert.notEqual(bundle.candidates[0].updatedAt, unchangedAt);
  assert.equal(bundle.candidates[1].updatedAt, unchangedAt);
});
