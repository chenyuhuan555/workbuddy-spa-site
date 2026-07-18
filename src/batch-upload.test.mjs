// 阶段 3.5：批量 / 拖拽简历入库 —— 纯函数引擎单测
// 覆盖用户 18 项自动测试要求中可在 Node 层验证的部分（复用 WorkbenchV2.*，无 DOM）。
// 运行：node --test src/batch-upload.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// workbench-v2.js 是 UMD 风格 IIFE，无 window 时挂到 globalThis
await import('./workbench-v2.js');
const { WorkbenchV2 } = globalThis;

// ---- 工厂 ----
function fakeFile(name, type = '', size = 120) {
  return { name, type, size };
}

function makeState(concurrency = 2) {
  return { open: true, running: false, concurrency, tasks: [], hashes: {}, active: 0, gate: Promise.resolve() };
}

// parseImpl: 根据文件名生成表单；可强制抛错或返回空身份
function makeDeps(bundle, { parseImpl, latency = 4 } = {}) {
  let inFlight = 0;
  let maxInFlight = 0;
  const fileWrites = [];
  const parseFile = async (task) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      if (latency) await new Promise((r) => setTimeout(r, latency));
      return parseImpl(task);
    } finally {
      inFlight -= 1;
    }
  };
  const persist = async () => { if (latency) await new Promise((r) => setTimeout(r, 1)); };
  const persistFile = async (task) => {
    fileWrites.push({ taskId: task.id, fileId: task.fileId, fileHash: task.fileHash });
    if (latency) await new Promise((r) => setTimeout(r, 1));
  };
  return {
    bundle,
    parseFile,
    persist,
    persistFile,
    _stats: {
      get maxInFlight() { return maxInFlight; },
      get fileWrites() { return fileWrites.slice(); },
    },
  };
}

function formFromName(name, { emptyIdentity = false, throwErr = null, company = '' } = {}) {
  if (throwErr) throw new Error(throwErr);
  const form = {
    name: emptyIdentity ? '' : name.replace(/\.[^.]+$/, ''),
    phone: '', email: '', currentCompany: company, currentTitle: '', city: '', owner: '', status: 'open',
    rawText: 'resume text for ' + name, fileName: name, fileData: '', fileId: 'fid_' + name, fileHash: 'hash_' + name, fileSize: 120, fileType: '',
  };
  return { form, fileId: 'fid_' + name, fileHash: 'hash_' + name, fileSize: 120, fileType: '', rawText: 'resume text for ' + name };
}

const TERMINAL = ['success', 'skipped', 'error', 'cancelled'];
async function drain(state, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pending = state.tasks.some((t) => ['queued', 'reading', 'parsing', 'saving'].includes(t.status));
    if (!pending) break;
    await new Promise((r) => setTimeout(r, 5));
  }
}

// ===========================================================================
// 1) 一次选择多份文件 → 多条任务
// ===========================================================================
test('batchAddFiles：一次选择 3 份文件生成 3 条独立任务', () => {
  const state = makeState();
  const added = WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('b.pdf'), fakeFile('c.pdf')]);
  assert.equal(added.length, 3, '应返回 3 条任务');
  assert.equal(state.tasks.length, 3, 'state.tasks 应有 3 条');
  assert.ok(state.tasks.every((t) => t.status === 'queued'), '初始状态均为 queued');
  assert.ok(state.tasks.every((t) => t.id && t.fileName), '每条都有 id 与文件名');
});

// ===========================================================================
// 2) 格式分类
// ===========================================================================
test('classifyResumeFile：PDF/Word/图片/文本允许，其他拒绝', () => {
  const ok = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.txt'];
  for (const ext of ok) assert.equal(WorkbenchV2.classifyResumeFile('x' + ext).ok, true, ext + ' 应允许');
  assert.equal(WorkbenchV2.classifyResumeFile('x.exe').ok, false, '.exe 应拒绝');
  assert.equal(WorkbenchV2.classifyResumeFile('x.zip').ok, false, '.zip 应拒绝');
});

// ===========================================================================
// 3) 一份格式错误不影响其他文件
// ===========================================================================
test('不支持格式逐条 error，不拖垮批次', () => {
  const state = makeState();
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('bad.exe'), fakeFile('c.pdf')]);
  assert.equal(state.tasks.length, 3, '仍为 3 条');
  const bad = state.tasks.find((t) => t.fileName === 'bad.exe');
  assert.equal(bad.status, 'error', '不支持格式直接 error');
  assert.match(bad.error, /不支持的格式/, '给出格式错误原因');
  assert.equal(state.tasks.filter((t) => t.status === 'queued').length, 2, '其余 2 份仍可处理');
});

// ===========================================================================
// 4) 一份解析失败不影响其他文件
// ===========================================================================
test('一份解析失败不影响其他文件', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => {
      if (task.fileName === 'boom.pdf') return formFromName('boom.pdf', { throwErr: '解析失败' });
      return formFromName(task.fileName);
    },
  });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('boom.pdf'), fakeFile('c.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  const boom = state.tasks.find((t) => t.fileName === 'boom.pdf');
  assert.equal(boom.status, 'error', '解析失败 → error');
  assert.match(boom.error, /解析失败/, '记录错误原因');
  const ok = state.tasks.filter((t) => t.fileName !== 'boom.pdf');
  assert.ok(ok.every((t) => t.status === 'success'), '其他文件成功');
  assert.equal(bundle.candidates.length, 2, '仅成功 2 份创建人才');
});

// ===========================================================================
// 5) 一份疑似重复可单独选择四种处理方式（以 merge 为例；另三种在后续用例覆盖）
// ===========================================================================
test('疑似重复 → 四种处理可选（merge / newVersion / forceCreate / skip）', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  // 预置一个既有人才
  const existing = WorkbenchV2.createTalent(bundle, { name: '张三', currentCompany: 'A公司' });
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName, { company: 'A公司' }) });
  // 上传与既有人才同名的简历
  WorkbenchV2.batchAddFiles(state, [fakeFile('张三.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  const t = state.tasks[0];
  assert.equal(t.status, 'duplicate', '同名 → 进入 duplicate');
  assert.ok(t.duplicates.length >= 1, '应给出查重结果');

  // 逐一验证四种处理
  const actions = ['merge', 'newVersion', 'forceCreate', 'skip'];
  for (const action of actions) {
    const b2 = WorkbenchV2.createEmptyBundle();
    const s2 = makeState();
    const d2 = makeDeps(b2, { parseImpl: (task) => formFromName(task.fileName, { company: 'A公司' }) });
    WorkbenchV2.createTalent(b2, { name: '张三', currentCompany: 'A公司' });
    WorkbenchV2.batchAddFiles(s2, [fakeFile('张三.pdf')]);
    WorkbenchV2.batchPump(s2, d2);
    await drain(s2);
    await WorkbenchV2.batchResolveDuplicate(s2, s2.tasks[0].id, action, d2);
    await drain(s2);
    const ct = s2.tasks[0];
    if (action === 'skip') {
      assert.equal(ct.status, 'skipped', 'skip → skipped');
      assert.equal(b2.candidates.length, 1, 'skip 不新增人才');
    } else if (action === 'forceCreate') {
      assert.equal(ct.status, 'success', 'forceCreate → success');
      assert.equal(b2.candidates.length, 2, 'forceCreate 新建人才');
    } else {
      // merge / newVersion：写到既有人才，人才数不变，但追加了简历版本
      assert.equal(ct.status, 'success', action + ' → success');
      assert.equal(b2.candidates.length, 1, action + ' 不新建人才');
      const tgt = b2.candidates[0];
      assert.ok(tgt.resumeVersions && tgt.resumeVersions.length >= 1, action + ' 应追加简历版本');
    }
  }
});

// ===========================================================================
// 6) 同批次重复文件不会重复创建人才
// ===========================================================================
test('同批次相同文件哈希不会重复创建人才（默认不自动创建）', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => ({ ...formFromName(task.fileName), fileHash: 'SAMEHASH' }),
  });
  WorkbenchV2.batchAddFiles(state, [fakeFile('same.pdf'), fakeFile('same.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  // 第二份应被判定为重复（不自动创建）
  const dups = state.tasks.filter((t) => t.status === 'duplicate');
  assert.ok(dups.length >= 1, '至少一份进入 duplicate（不自动创建）');
  assert.equal(bundle.candidates.length, 1, '未解析前最多 1 个已保存人才；不重复创建');
  // 即使全部 skip，也不应超过 1 个真实人才
  for (const t of state.tasks.filter((x) => x.status === 'duplicate')) {
    await WorkbenchV2.batchResolveDuplicate(state, t.id, 'skip', deps);
  }
  assert.equal(bundle.candidates.length, 1, 'skip 后仍为 1 个人才');
});

// ===========================================================================
// 7) 取消 queued 任务不会写入数据
// ===========================================================================
test('取消 queued 任务后不会创建人才或写入文件', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('cancel.pdf'), fakeFile('c.pdf')]);
  WorkbenchV2.batchCancelTask(state, state.tasks[1].id); // 取消 queued
  assert.equal(state.tasks[1].status, 'cancelled', 'queued → cancelled');
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks[1].status, 'cancelled', '取消后保持 cancelled');
  assert.equal(bundle.candidates.length, 2, '仅另 2 份创建人才');
});

// ===========================================================================
// 8) 取消处理中任务不会继续保存
// ===========================================================================
test('取消处理中任务后不会继续保存', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  let parseStartHook = null;
  const deps = makeDeps(bundle, {
    latency: 30,
    parseImpl: (task) => {
      if (parseStartHook) parseStartHook(task);
      return formFromName(task.fileName);
    },
  });
  WorkbenchV2.batchAddFiles(state, [fakeFile('target.pdf')]);
  // 在解析刚开始时取消
  parseStartHook = (task) => { WorkbenchV2.batchCancelTask(state, task.id); };
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks[0].status, 'cancelled', '处理中取消 → cancelled');
  assert.equal(bundle.candidates.length, 0, '取消的任务未创建人才');
});

// ===========================================================================
// 9) 重试只处理失败项
// ===========================================================================
test('仅重试失败项：requeue error，不影响 success', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => {
      if (task.fileName === 'boom.pdf') return formFromName('boom.pdf', { throwErr: '失败' });
      return formFromName(task.fileName);
    },
  });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('boom.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks.find((t) => t.fileName === 'a.pdf').status, 'success');
  assert.equal(state.tasks.find((t) => t.fileName === 'boom.pdf').status, 'error');
  const before = bundle.candidates.length;
  // 修复：让 boom 这次成功
  deps.parseFile = async (task) => { if (deps._lat) await new Promise((r) => setTimeout(r, 2)); return formFromName(task.fileName); };
  WorkbenchV2.batchRetryFailed(state);
  assert.equal(state.tasks.find((t) => t.fileName === 'boom.pdf').status, 'queued', '失败后重新 queued');
  assert.equal(state.tasks.find((t) => t.fileName === 'a.pdf').status, 'success', 'success 不被重置');
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks.find((t) => t.fileName === 'boom.pdf').status, 'success', '重试后成功');
  assert.equal(bundle.candidates.length, before + 1, '仅重试项新增 1 个人才');
});

// ===========================================================================
// 10) AI 解析并发数不超过限制
// ===========================================================================
test('解析并发不超过限制（默认 2）', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState(2);
  const deps = makeDeps(bundle, { latency: 20, parseImpl: (task) => formFromName(task.fileName) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('1.pdf'), fakeFile('2.pdf'), fakeFile('3.pdf'), fakeFile('4.pdf'), fakeFile('5.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.ok(deps._stats.maxInFlight <= 2, '最大并发解析应 ≤ 2，实际=' + deps._stats.maxInFlight);
  assert.equal(bundle.candidates.length, 5, '全部成功');
});

// ===========================================================================
// 11) 每个成功人才通过 createTalent 写入
// ===========================================================================
test('成功人才均经 createTalent 写入', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('b.pdf'), fakeFile('c.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(bundle.candidates.length, 3, '3 个人才');
  assert.ok(state.tasks.every((t) => t.status === 'success' && t.createdId), '每条成功都有 createdId');
  assert.ok(bundle.candidates.every((c) => c.id && c.name), '人才字段完整');
});

// ===========================================================================
// 12) AI 空结果不会创建人才
// ===========================================================================
test('AI 空结果（无身份）不创建人才 → needs_review', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName, { emptyIdentity: true }) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('unknown.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks[0].status, 'needs_review', '无身份 → needs_review');
  assert.equal(bundle.candidates.length, 0, '不应创建空人才');
  // 用户补全姓名后保存 → 才创建
  await WorkbenchV2.batchSaveNeedsReview(state, state.tasks[0].id, '补全姓名', deps);
  await drain(state);
  assert.equal(state.tasks[0].status, 'success', '补全后可成功');
  assert.equal(bundle.candidates.length, 1, '此时才创建 1 个');
});

// ===========================================================================
// 13) 快照不包含 Base64（简历版本只存 fileId）
// ===========================================================================
test('buildResumeVersionFromForm：只存 fileId 元数据，不含 base64', () => {
  const v = WorkbenchV2.buildResumeVersionFromForm({ fileName: 'a.pdf', fileId: 'fid_x', fileType: 'application/pdf', fileSize: 99, fileHash: 'h', rawText: 'txt' });
  assert.equal(v.fileId, 'fid_x', '保留 fileId');
  assert.equal(v.data, undefined, '不应含 data/base64');
  assert.equal(v.fileData, undefined, '不应含 fileData');
  assert.ok(!JSON.stringify(v).includes('data:'), '序列化结果不含 data: 前缀');
  const none = WorkbenchV2.buildResumeVersionFromForm({ fileName: '', rawText: '' });
  assert.equal(none, null, '无内容返回 null');
});

// ===========================================================================
// 14) 人才数量与成功创建数量一致
// ===========================================================================
test('人才数量 == 成功任务数量', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => (task.fileName === 'boom.pdf' ? formFromName('boom.pdf', { throwErr: 'x' }) : formFromName(task.fileName)),
  });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('boom.pdf'), fakeFile('c.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  const success = state.tasks.filter((t) => t.status === 'success').length;
  assert.equal(bundle.candidates.length, success, '人才数 == 成功数');
});

// ===========================================================================
// 15) 推进关系前后不变（批量不创建 application）
// ===========================================================================
test('批量入库不修改任何岗位推进关系', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const beforeApps = bundle.applications.length;
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('b.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(bundle.applications.length, beforeApps, 'applications 数量不变');
  assert.equal(bundle.applications.length, 0, '批量不创建推进记录');
});

// ===========================================================================
// 16) 批量操作：清除已成功 / 取消未开始 / 全部开始
// ===========================================================================
test('批量操作：清除已成功 + 取消未开始', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState();
  const deps = makeDeps(bundle, { parseImpl: (task) => formFromName(task.fileName) });
  WorkbenchV2.batchAddFiles(state, [fakeFile('a.pdf'), fakeFile('b.pdf'), fakeFile('c.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(state.tasks.filter((t) => t.status === 'success').length, 3);
  WorkbenchV2.batchClearSucceeded(state);
  assert.equal(state.tasks.length, 0, '清除已成功后列表清空');

  // 重新加：1 queued + 1 取消未开始
  WorkbenchV2.batchAddFiles(state, [fakeFile('d.pdf'), fakeFile('e.pdf')]);
  WorkbenchV2.batchCancelQueued(state);
  assert.ok(state.tasks.every((t) => t.status === 'cancelled'), '取消未开始 → 全部 cancelled');
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  assert.equal(bundle.candidates.length, 3, '仍只有最初的 3 个（d/e 被取消）');
});

// ===========================================================================
// 17) 单份上传流程不被批量改动影响（回归）
// ===========================================================================
test('回归：createTalent / appendTalentResumeVersion 既有契约不变', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const c = WorkbenchV2.createTalent(bundle, { name: '回归', phone: '13800000000' });
  assert.equal(bundle.candidates.length, 1);
  const v = WorkbenchV2.appendTalentResumeVersion(bundle, c.id, WorkbenchV2.buildResumeVersionFromForm({ fileName: 'r.pdf', fileId: 'f1', fileHash: 'h1', rawText: 'x' }));
  assert.equal(v.fileId, 'f1');
  assert.equal(c.resumeVersions.length, 1);
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({ name: '' }), false, '空身份不创建');
  assert.equal(WorkbenchV2.shouldCreateTalentFromParsed({ name: '有' }), true, '有姓名可创建');
});

// ===========================================================================
// 18) 拖拽/多文件入口底层 = batchAddFiles 接受数组（浏览器层验证真实拖拽）
// ===========================================================================
test('drag/drop 与多选共用 batchAddFiles（数组入参）', () => {
  const state = makeState();
  const dropped = [fakeFile('drag1.pdf'), fakeFile('drag2.png'), fakeFile('drag3.doc')];
  const added = WorkbenchV2.batchAddFiles(state, dropped);
  assert.equal(added.length, 3, '拖拽 3 份 → 3 任务');
  assert.ok(state.tasks.every((t) => t.status === 'queued'), '均为 queued');
});

// ===========================================================================
// 19) 二进制仅在任务真正接受入库后落盘
// ===========================================================================
test('文件落盘延迟到接受入库；重复跳过不写二进制', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  WorkbenchV2.createTalent(bundle, { name: '重复人才', currentCompany: 'A公司' });
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => formFromName(task.fileName, { company: task.fileName.startsWith('重复人才') ? 'A公司' : '' }),
  });

  WorkbenchV2.batchAddFiles(state, [fakeFile('新人才.pdf'), fakeFile('重复人才.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);

  const accepted = state.tasks.find((task) => task.fileName === '新人才.pdf');
  const duplicate = state.tasks.find((task) => task.fileName === '重复人才.pdf');
  assert.equal(accepted.status, 'success');
  assert.equal(duplicate.status, 'duplicate');
  assert.deepEqual(deps._stats.fileWrites.map((item) => item.taskId), [accepted.id], '只有已接受的新人才写入文件');

  await WorkbenchV2.batchResolveDuplicate(state, duplicate.id, 'skip', deps);
  assert.equal(duplicate.status, 'skipped');
  assert.deepEqual(deps._stats.fileWrites.map((item) => item.taskId), [accepted.id], '跳过重复项不写入文件');
});

// ===========================================================================
// 20) 同批次相同哈希合并时复用第一份真实人才和文件
// ===========================================================================
test('同批次相同哈希选择合并时不创建第二个人才或第二份文件', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState(1);
  const deps = makeDeps(bundle, {
    parseImpl: (task) => ({ ...formFromName(task.fileName), fileHash: 'SAME_BATCH_HASH' }),
  });

  WorkbenchV2.batchAddFiles(state, [fakeFile('同一人.pdf'), fakeFile('同一人.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);

  const first = state.tasks.find((task) => task.status === 'success');
  const duplicate = state.tasks.find((task) => task.status === 'duplicate');
  assert.ok(first && duplicate, '应得到一份成功任务和一份重复任务');
  await WorkbenchV2.batchResolveDuplicate(state, duplicate.id, 'merge', deps);

  assert.equal(duplicate.status, 'success');
  assert.equal(duplicate.createdId, first.createdId, '同哈希任务复用第一份真实人才ID');
  assert.equal(bundle.candidates.length, 1, '不能创建第二个人才');
  assert.equal(deps._stats.fileWrites.length, 1, '相同文件哈希只保存一次二进制');
});

// ===========================================================================
// 21) 关闭后重开批量弹窗不能清空正在处理/已完成的队列
// ===========================================================================
test('openBatchUpload 重开时保留现有任务、哈希和写入门禁', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const body = source.match(/function openBatchUpload\(\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.ok(body, '应能定位 openBatchUpload');
  assert.doesNotMatch(body, /tasks\s*:\s*\[\]/, '重开不能清空任务');
  assert.doesNotMatch(body, /hashes\s*:\s*\{\}/, '重开不能清空哈希映射');
  assert.doesNotMatch(body, /gate\s*:\s*Promise\.resolve/, '重开不能替换正在使用的写入门禁');
});

// ===========================================================================
// 22) 重复项确认时文件落盘失败必须回到可重试 error，不能卡在 saving
// ===========================================================================
test('重复项确认落盘失败时标记 error，且不修改既有人才', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const existing = WorkbenchV2.createTalent(bundle, { name: '失败保护', currentCompany: 'A公司' });
  const state = makeState();
  const deps = makeDeps(bundle, {
    parseImpl: (task) => formFromName(task.fileName, { company: 'A公司' }),
  });
  deps.persistFile = async () => { throw new Error('IndexedDB quota exceeded'); };

  WorkbenchV2.batchAddFiles(state, [fakeFile('失败保护.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  const task = state.tasks[0];
  assert.equal(task.status, 'duplicate');

  await assert.doesNotReject(() => WorkbenchV2.batchResolveDuplicate(state, task.id, 'merge', deps));
  assert.equal(task.status, 'error', '文件保存失败必须成为可重试错误');
  assert.match(task.error, /IndexedDB quota exceeded/);
  assert.equal(bundle.candidates.length, 1, '不能创建第二个人才');
  assert.equal(existing.resumeVersions.length, 0, '不能给既有人才追加无文件版本');
  assert.equal(existing.currentCompany, 'A公司', '不能提前修改既有人才字段');
});

// ===========================================================================
// 23) Vue 代理必须采用引擎真实终态，不能把失败强制覆盖成 success
// ===========================================================================
test('批量查重代理按任务真实状态收口，不强制标记成功', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(source, /async function resolveBatchProxy\(action\)/, '应由统一代理处理查重动作');
  assert.doesNotMatch(
    source,
    /batchResolveDuplicate\([^;]+;[\s\S]{0,180}?finalizeBatchProxy\('success'/,
    '引擎返回 error/duplicate 时不能被UI强制覆盖成 success',
  );
});
