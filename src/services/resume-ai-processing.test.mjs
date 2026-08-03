import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./resume-ai-processing.js');
const Processor = globalThis.WorkBuddyResumeAiProcessing;
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function makeBundle() {
  return {
    candidates: [{
      id: 'candidate_lei',
      name: '人工姓名',
      currentCompany: '',
      currentTitle: '人工职位',
      city: '',
      owner: '顾问A',
      categoryIds: ['cat_1'],
      note: '业务备注',
      resumeVersions: [{
        id: 'resume_lei',
        sourceResumeId: 'resume_source',
        fileId: 'file_lei',
        fileHash: 'hash_lei',
        uploadedAt: '2026-07-01T00:00:00.000Z',
        rawText: '雷艺旋完整原始简历文本'.repeat(8),
        formattedText: '',
        formatStatus: 'queued',
        formatError: '',
        formattedAt: '',
      }, {
        id: 'resume_other',
        rawText: '另一版本原文',
        formattedText: '### 另一版本',
        formatStatus: 'done',
      }],
    }],
    applications: [{ id: 'app_1', candidateId: 'candidate_lei', stage: 'interviewing' }],
    notes: [{ id: 'note_1', candidateId: 'candidate_lei', text: '历史记录' }],
  };
}

function successfulDeps(calls) {
  return {
    assertConfigured() { calls.push('configured'); },
    async extractBasic() {
      calls.push('basic');
      return { name: 'AI 姓名', company: 'AI 公司', title: 'AI 职位', city: '上海' };
    },
    async extractProfile() {
      calls.push('profile');
      return {
        summary: '十年人才发展经验',
        keywords: ['人才发展', '企业文化'],
        skills: ['组织发展'],
        profileText: '结构化候选人画像',
        trajectory: [{ type: 'work', name: 'AI 公司', start: '2020', end: '至今', role: '负责人' }],
        directions: ['人才发展'],
      };
    },
    async format() { calls.push('format'); return '### 候选人概览\n- 十年人才发展经验'; },
    async persist({ version }) { calls.push(`persist:${version.formatStatus}:${version.formattedText ? 'formatted' : 'plain'}`); return true; },
    scheduleSync() { calls.push('sync'); },
    now() { return '2026-07-29T12:00:00.000Z'; },
  };
}

test('三步 AI 处理按顺序持久化，并且只补空基础字段', async () => {
  const bundle = makeBundle();
  const beforeApplications = structuredClone(bundle.applications);
  const beforeNotes = structuredClone(bundle.notes);
  const beforeOtherVersion = structuredClone(bundle.candidates[0].resumeVersions[1]);
  const versionBefore = structuredClone(bundle.candidates[0].resumeVersions[0]);
  const calls = [];

  await Processor.process({
    bundle,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    deps: successfulDeps(calls),
  });

  const candidate = bundle.candidates[0];
  const version = candidate.resumeVersions[0];
  assert.deepEqual(calls, [
    'configured',
    'persist:processing:plain',
    'basic',
    'persist:processing:plain',
    'profile',
    'persist:processing:plain',
    'format',
    'persist:done:formatted',
    'sync',
  ]);
  assert.equal(candidate.name, '人工姓名');
  assert.equal(candidate.currentCompany, 'AI 公司');
  assert.equal(candidate.currentTitle, '人工职位');
  assert.equal(candidate.city, '上海');
  assert.equal(candidate.profileProcessStatus, 'done');
  assert.equal(candidate.profileProcessError, '');
  assert.equal(candidate.profileProcessedAt, '2026-07-29T12:00:00.000Z');
  assert.equal(version.rawText, versionBefore.rawText);
  assert.equal(version.formattedText, '### 候选人概览\n- 十年人才发展经验');
  assert.equal(version.formatStatus, 'done');
  assert.equal(version.formattedAt, '2026-07-29T12:00:00.000Z');
  assert.equal(version.fileId, versionBefore.fileId);
  assert.equal(version.fileHash, versionBefore.fileHash);
  assert.equal(version.uploadedAt, versionBefore.uploadedAt);
  assert.deepEqual(bundle.applications, beforeApplications);
  assert.deepEqual(bundle.notes, beforeNotes);
  assert.deepEqual(candidate.resumeVersions[1], beforeOtherVersion);
  assert.equal(candidate.owner, '顾问A');
  assert.deepEqual(candidate.categoryIds, ['cat_1']);
});

test('rawText 为空时只回填一次原始文本再继续处理', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  version.rawText = '';
  const calls = [];
  const deps = successfulDeps(calls);
  deps.loadRawText = async current => {
    assert.equal(current.fileId, 'file_lei');
    calls.push('loadRaw');
    return '从原始 PDF 重新提取的文本'.repeat(8);
  };

  await Processor.process({ bundle, candidateId: 'candidate_lei', versionId: 'resume_lei', canWrite: true, canUseAi: true, deps });

  assert.match(version.rawText, /从原始 PDF/);
  assert.ok(calls.indexOf('loadRaw') < calls.indexOf('basic'));
  assert.equal(calls.filter(item => item.startsWith('persist:')).length, 5);
});

test('手动重新提取时从原始文件刷新 rawText，而不是复用旧解析文本', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  const calls = [];
  const deps = successfulDeps(calls);
  deps.loadRawText = async (current, candidate, options) => {
    assert.equal(current.fileId, 'file_lei');
    assert.equal(candidate.id, 'candidate_lei');
    assert.equal(options.refresh, true);
    calls.push('loadRaw');
    return '从保留的原始 PDF 重新提取的正确文本'.repeat(8);
  };

  await Processor.process({
    bundle,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    refreshRawText: true,
    deps,
  });

  assert.match(version.rawText, /正确文本/);
  assert.equal(calls.filter(item => item === 'loadRaw').length, 1);
  assert.ok(calls.indexOf('loadRaw') < calls.indexOf('basic'));
});

test('使用现有文本重试时完全不读取原始文件', async () => {
  const bundle = makeBundle();
  const deps = successfulDeps([]);
  deps.loadRawText = async () => assert.fail('已有 rawText 时不应读取原件');

  await Processor.process({
    bundle,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    refreshRawText: false,
    deps,
  });

  assert.equal(bundle.candidates[0].resumeVersions[0].formatStatus, 'done');
});

test('画像阶段限流时保存准确阶段和安全错误码', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  const deps = successfulDeps([]);
  deps.extractProfile = async () => { throw new Error('HTTP 429 rate limit: private response'); };

  await assert.rejects(() => Processor.process({
    bundle,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    deps,
  }), /候选人画像提取失败/);

  assert.equal(version.aiStage, 'profile');
  assert.equal(version.formatErrorCode, 'AI_RATE_LIMITED');
  assert.match(version.formatError, /请求过于频繁或额度不足/);
  assert.doesNotMatch(version.formatError, /private response/);
});

test('新排版失败时继续保留上一次成功排版', async () => {
  const bundle = makeBundle();
  const candidate = bundle.candidates[0];
  const version = candidate.resumeVersions[0];
  version.formattedText = '### 上一次成功结果';
  version.formattedAt = '2026-07-20T00:00:00.000Z';
  const deps = successfulDeps([]);
  deps.format = async () => { throw new Error('timeout'); };

  await assert.rejects(() => Processor.process({
    bundle,
    candidateId: candidate.id,
    versionId: version.id,
    canWrite: true,
    canUseAi: true,
    deps,
  }), /电子简历排版失败/);

  assert.equal(version.aiStage, 'format');
  assert.equal(version.formatErrorCode, 'AI_TIMEOUT');
  assert.equal(version.formattedText, '### 上一次成功结果');
  assert.equal(version.formattedAt, '2026-07-20T00:00:00.000Z');
  assert.equal(candidate.profileProcessStatus, 'done');
});

test('从原件重新提取失败时记录 source 阶段', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  const deps = successfulDeps([]);
  deps.loadRawText = async () => { throw new Error('原文件不存在'); };

  await assert.rejects(() => Processor.process({
    bundle,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    refreshRawText: true,
    deps,
  }), /原始文件提取失败/);

  assert.equal(version.aiStage, 'source');
  assert.equal(version.formatErrorCode, 'SOURCE_MISSING');
});

test('只读调用在任何修改前拒绝', async () => {
  const bundle = makeBundle();
  const before = structuredClone(bundle);
  await assert.rejects(() => Processor.process({
    bundle, candidateId: 'candidate_lei', versionId: 'resume_lei', canWrite: false, canUseAi: true, deps: successfulDeps([]),
  }), /无权/);
  assert.deepEqual(bundle, before);
});

test('AI 权限或配置不可用时保存明确且脱敏的失败原因', async () => {
  const noPermission = makeBundle();
  let permissionPersisted = 0;
  await assert.rejects(() => Processor.process({
    bundle: noPermission,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: false,
    deps: { persist: async () => { permissionPersisted++; return true; } },
  }), /AI 功能权限/);
  assert.equal(noPermission.candidates[0].resumeVersions[0].formatStatus, 'failed');
  assert.equal(noPermission.candidates[0].resumeVersions[0].formatError, '当前账号没有 AI 功能权限');
  assert.equal(permissionPersisted, 1);

  const noConfig = makeBundle();
  const leakedKey = 'sk-secret-value-must-not-leak';
  await assert.rejects(() => Processor.process({
    bundle: noConfig,
    candidateId: 'candidate_lei',
    versionId: 'resume_lei',
    canWrite: true,
    canUseAi: true,
    deps: {
      assertConfigured() { throw new Error(`DeepSeek API Key invalid: ${leakedKey}`); },
      persist: async () => true,
    },
  }), /API Key 未配置或无效/);
  assert.equal(noConfig.candidates[0].resumeVersions[0].formatError, 'DeepSeek API Key 未配置或无效');
  assert.doesNotMatch(noConfig.candidates[0].resumeVersions[0].formatError, /secret/);
});

test('排版失败保留已提取画像与原始文件，并显示分类后的原因', async () => {
  const bundle = makeBundle();
  const candidate = bundle.candidates[0];
  const version = candidate.resumeVersions[0];
  const metadataBefore = { fileId: version.fileId, fileHash: version.fileHash, uploadedAt: version.uploadedAt, rawText: version.rawText };
  const deps = successfulDeps([]);
  deps.format = async () => { throw new Error(`fetch network failed ${version.rawText}`); };

  await assert.rejects(() => Processor.process({
    bundle, candidateId: candidate.id, versionId: version.id, canWrite: true, canUseAi: true, deps,
  }), /网络请求失败/);

  assert.equal(candidate.summary, '十年人才发展经验');
  assert.equal(candidate.profileProcessStatus, 'done');
  assert.equal(version.formatStatus, 'failed');
  assert.equal(version.aiStage, 'format');
  assert.equal(version.formatErrorCode, 'AI_NETWORK');
  assert.equal(version.formatError, '电子简历排版失败：AI 网络请求失败，请检查网络后重试');
  assert.equal(version.formattedText, '');
  assert.deepEqual(
    { fileId: version.fileId, fileHash: version.fileHash, uploadedAt: version.uploadedAt, rawText: version.rawText },
    metadataBefore,
  );
  assert.doesNotMatch(version.formatError, /雷艺旋|完整原始/);
});

test('队列串行执行并合并同一版本的重复请求', async () => {
  const queue = Processor.createQueue();
  const order = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  const runner = async task => {
    order.push(`start:${task.versionId}`);
    if (task.versionId === 'r1') await firstGate;
    order.push(`end:${task.versionId}`);
    return task.versionId;
  };
  const first = Processor.enqueue(queue, { candidateId: 'c1', versionId: 'r1' }, runner);
  const duplicate = Processor.enqueue(queue, { candidateId: 'c1', versionId: 'r1' }, runner);
  const second = Processor.enqueue(queue, { candidateId: 'c1', versionId: 'r2' }, runner);

  assert.equal(first, duplicate);
  await Promise.resolve();
  assert.deepEqual(order, ['start:r1']);
  releaseFirst();
  assert.deepEqual(await Promise.all([first, second]), ['r1', 'r2']);
  assert.deepEqual(order, ['start:r1', 'end:r1', 'start:r2', 'end:r2']);
});

test('刷新恢复只重置明确记录的 processing 版本', () => {
  const bundle = makeBundle();
  bundle.candidates[0].resumeVersions[0].formatStatus = 'processing';
  bundle.candidates[0].resumeVersions[1].formatStatus = 'processing';
  bundle.candidates[0].profileProcessStatus = 'processing';

  const recovered = Processor.recoverInterrupted(bundle, ['candidate_lei:resume_lei']);

  assert.deepEqual(recovered, [{ candidateId: 'candidate_lei', versionId: 'resume_lei' }]);
  assert.equal(bundle.candidates[0].resumeVersions[0].formatStatus, 'queued');
  assert.equal(bundle.candidates[0].resumeVersions[1].formatStatus, 'processing');
  assert.equal(bundle.candidates[0].profileProcessStatus, 'queued');
});

test('数据校验已转为 queued 的显式任务仍可在刷新后恢复', () => {
  const bundle = makeBundle();
  bundle.candidates[0].resumeVersions[0].formatStatus = 'queued';
  bundle.candidates[0].profileProcessStatus = 'queued';

  const recovered = Processor.recoverInterrupted(bundle, ['candidate_lei:resume_lei']);

  assert.deepEqual(recovered, [{ candidateId: 'candidate_lei', versionId: 'resume_lei' }]);
  assert.equal(bundle.candidates[0].resumeVersions[0].formatStatus, 'queued');
  assert.equal(bundle.candidates[0].profileProcessStatus, 'queued');
});

test('页面加载处理器并为单份和批量入库提供统一后台入口', () => {
  assert.match(INDEX_HTML, /src\/services\/resume-ai-processing\.js\?v=20260730-resumeai2/);
  assert.match(INDEX_HTML, /const ResumeAiProcessing = window\.WorkBuddyResumeAiProcessing/);
  assert.match(INDEX_HTML, /function enqueueResumeAiProcessing\(candidateId, versionId, options = \{\}\)/);
  assert.match(INDEX_HTML, /afterTalentSaved:\s*\(\{ candidateId, versionId \}\) => scheduleResumePostSaveTasks\(candidateId, versionId\)/);
  assert.match(INDEX_HTML, /scheduleResumePostSaveTasks\(candidate\.id, version\.id\)/);
});

test('页面只恢复显式记录的中断任务，不扫描全部历史简历', () => {
  assert.match(INDEX_HTML, /resumeAiPendingStore = window\.WorkBuddyResumeAiPendingStore\.createResumeAiPendingStore/);
  assert.match(INDEX_HTML, /key: STORAGE_KEY \+ '_resume_ai_pending_v1'/);
  assert.match(INDEX_HTML, /function recoverResumeAiProcessing\(\)/);
  assert.match(INDEX_HTML, /ResumeAiProcessing\.recoverInterrupted\(workbenchV2, pendingKeys\)/);
  assert.match(INDEX_HTML, /await recoverResumeAiProcessing\(\);/);
  const recoveryBody = INDEX_HTML.match(/async function recoverResumeAiProcessing\(\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.doesNotMatch(recoveryBody, /flatMap|resumeVersions\.forEach|candidates\.forEach/);
  assert.match(INDEX_HTML, /const readResumeAiPendingKeys = resumeAiPendingStore\.read/);
  assert.doesNotMatch(`${recoveryBody}`, /slice\(0,\s*50\)/);
});
