import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./candidate-read-path.js');
const ReadPath = globalThis.WorkBuddyCandidateReadPath;
const INDEX_HTML = fs.readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');

test('fingerprintCandidate 忽略本地大文本和对象键顺序，但识别业务字段变化', () => {
  const first = {
    id: 'c1',
    name: '张三',
    tags: ['A'],
    profileProcessStatus: 'done',
    electronicResumeText: '本机旧文本',
    updatedAt: '2026-01-01T00:00:00Z',
    resumeVersions: [{ id: 'rv1', fileName: 'a.pdf', rawText: '原文一', meta: { b: 2, a: 1 } }],
  };
  const same = {
    profileProcessStatus: 'done',
    tags: ['A'],
    name: '张三',
    id: 'c1',
    updatedAt: '2026-08-01T00:00:00Z',
    electronicResumeText: '另一份本机文本',
    resumeVersions: [{ meta: { a: 1, b: 2 }, rawText: '原文二', fileName: 'a.pdf', id: 'rv1' }],
  };
  const changed = { ...same, name: '李四' };

  assert.equal(ReadPath.fingerprintCandidate(first), ReadPath.fingerprintCandidate(same));
  assert.notEqual(ReadPath.fingerprintCandidate(first), ReadPath.fingerprintCandidate(changed));
});

test('fingerprintCandidate 把本地缺省字段与云端行标准默认值视为一致', () => {
  const local = { id: 'c-defaults', name: '候选人' };
  const cloud = {
    id: 'c-defaults',
    name: '候选人',
    phone: '',
    email: '',
    currentCompany: '',
    currentTitle: '',
    city: '',
    status: 'active',
    owner: '',
    source: '',
    education: '',
    experienceYears: null,
    tags: [],
    skills: [],
    keywords: [],
    directions: [],
    categoryIds: [],
    summary: '',
    profileText: '',
    resumeVersions: [],
  };
  assert.equal(ReadPath.fingerprintCandidate(local), ReadPath.fingerprintCandidate(cloud));
});

test('候选人增量合并决策不会用较旧云端字段覆盖本地更新', () => {
  const local = { id: 'c1', name: '本地新姓名', updatedAt: '2026-08-02T12:00:00Z' };
  const cloud = { id: 'c1', name: '云端旧姓名', updatedAt: '2026-08-02T11:00:00Z' };
  const decision = ReadPath.buildCandidateMergeDecision(local, cloud);
  assert.equal(decision.action, 'keep');
  assert.equal(decision.conflict.type, 'local_newer_than_cloud');
});

test('候选人增量合并决策允许较新云端记录合并并处理墓碑', () => {
  const local = { id: 'c1', name: '本地', updatedAt: '2026-08-02T10:00:00Z' };
  assert.equal(ReadPath.buildCandidateMergeDecision(local, { id: 'c1', name: '云端', updatedAt: '2026-08-02T11:00:00Z' }).action, 'merge');
  assert.equal(ReadPath.buildCandidateMergeDecision(local, { id: 'c1', deletedAt: '2026-08-02T11:00:00Z', updatedAt: '2026-08-02T11:00:00Z' }).action, 'remove');
});

test('buildParityReport 严格报告缺行、字段漂移和云端墓碑', () => {
  const local = [
    { id: 'same', name: '相同', resumeVersions: [] },
    { id: 'changed', name: '本地名', resumeVersions: [] },
    { id: 'local-only', name: '仅本地', resumeVersions: [] },
    { id: 'deleted', name: '待删除', resumeVersions: [] },
  ];
  const cloud = [
    { id: 'same', name: '相同', resumeVersions: [] },
    { id: 'changed', name: '云端名', resumeVersions: [] },
    { id: 'cloud-only', name: '仅云端', resumeVersions: [] },
    { id: 'deleted', name: '待删除', deletedAt: '2026-08-01T00:00:00Z', resumeVersions: [] },
  ];

  const report = ReadPath.buildParityReport(local, cloud);
  assert.equal(report.ok, false);
  assert.deepEqual(report.missingInCloud, ['local-only']);
  assert.deepEqual(report.missingInLocal, ['cloud-only']);
  assert.deepEqual(report.mismatched, ['changed']);
  assert.deepEqual(report.tombstonedLocal, ['deleted']);
  assert.equal(report.localCount, 4);
  assert.equal(report.cloudCount, 3);
});

test('canEnableReadPath 同时要求已回填且严格一致性通过', () => {
  const okReport = ReadPath.buildParityReport(
    [{ id: 'c1', name: 'A', resumeVersions: [] }],
    [{ id: 'c1', name: 'A', resumeVersions: [] }],
  );
  assert.equal(okReport.ok, true);
  assert.equal(ReadPath.canEnableReadPath({}, okReport), false);
  assert.equal(ReadPath.canEnableReadPath({ backfilledAt: '2026-08-01T00:00:00Z' }, okReport), true);
  assert.equal(ReadPath.canEnableReadPath({ backfilledAt: '2026-08-01T00:00:00Z' }, { ...okReport, ok: false }), false);
});

test('buildAuthoritativeCandidates 以云端集合为准并仅保留本机简历大字段', () => {
  const local = [
    {
      id: 'c1', name: '本地旧名', electronicResumeText: '候选人本机文本', localOnlyBusinessField: '不应覆盖云端',
      resumeVersions: [
        { id: 'rv1', fileName: 'old.pdf', rawText: '原始文本', formattedText: '排版文本', fileData: 'base64' },
        { id: 'local-version', fileName: 'local.pdf', rawText: '本机独有版本' },
      ],
    },
    { id: 'local-only', name: '仅本地', resumeVersions: [] },
    { id: 'deleted', name: '本地待删', resumeVersions: [] },
  ];
  const cloud = [
    {
      id: 'c1', name: '云端新名', cloudBusinessField: '保留',
      resumeVersions: [{ id: 'rv1', fileName: 'new.pdf', originalFileStatus: 'synced' }],
    },
    { id: 'cloud-only', name: '仅云端', resumeVersions: [] },
    { id: 'deleted', name: '已删除', deletedAt: '2026-08-01T00:00:00Z', resumeVersions: [] },
  ];

  const result = ReadPath.buildAuthoritativeCandidates(local, cloud);
  assert.deepEqual(result.map(candidate => candidate.id), ['c1', 'cloud-only']);
  const merged = result[0];
  assert.equal(merged.name, '云端新名');
  assert.equal(merged.cloudBusinessField, '保留');
  assert.equal(merged.localOnlyBusinessField, undefined);
  assert.equal(merged.electronicResumeText, '候选人本机文本');
  assert.equal(merged.resumeVersions.length, 1);
  assert.equal(merged.resumeVersions[0].fileName, 'new.pdf');
  assert.equal(merged.resumeVersions[0].originalFileStatus, 'synced');
  assert.equal(merged.resumeVersions[0].rawText, '原始文本');
  assert.equal(merged.resumeVersions[0].formattedText, '排版文本');
  assert.equal(merged.resumeVersions[0].fileData, 'base64');
});

test('页面加载读路径策略模块并持久记录候选人云端迁移闸门', () => {
  assert.match(INDEX_HTML, /src\/services\/repo\/candidate-read-path\.js\?v=/);
  assert.match(INDEX_HTML, /function candidateCloudMigrationMeta\(\)/);
  assert.match(INDEX_HTML, /const candidateReadPathEnabled = computed\(/);
  assert.match(INDEX_HTML, /candidateCloud\.backfilledAt/);
  assert.match(INDEX_HTML, /candidateCloud\.parityVerifiedAt/);
  assert.match(INDEX_HTML, /candidateCloud\.readEnabledAt/);
});

test('严格一致性校验读取全部候选人并阻止仅按数量放行', () => {
  const start = INDEX_HTML.indexOf('async function verifyCandidateParity()');
  const end = INDEX_HTML.indexOf('async function loadCandidatesFromCloudAsAuthority(', start);
  assert.ok(start >= 0 && end > start);
  const source = INDEX_HTML.slice(start, end + 6);
  assert.match(source, /listAllCandidates\(/);
  assert.match(source, /CandidateReadPath\.buildParityReport\(/);
  assert.doesNotMatch(source, /countCandidates\(/);
  assert.match(INDEX_HTML, /candidateParity\.mismatched/);
  assert.match(INDEX_HTML, /candidateParity\.missingInCloud/);
  assert.match(INDEX_HTML, /candidateParity\.missingInLocal/);
});

test('启用动作受回填和严格校验闸门保护', () => {
  const start = INDEX_HTML.indexOf('async function enableCandidateCloudReadPath()');
  const end = INDEX_HTML.indexOf('// 云端 JSON 瘦身', start);
  assert.ok(start >= 0 && end > start);
  const source = INDEX_HTML.slice(start, end + 6);
  assert.match(source, /CandidateReadPath\.canEnableReadPath\(/);
  assert.match(source, /candidateCloud\.readEnabledAt\s*=/);
  assert.match(source, /await loadCandidatesFromCloudAsAuthority\(/);
  assert.match(source, /await saveWorkbenchV2\(/);
  assert.match(INDEX_HTML, /@click="enableCandidateCloudReadPath"/);
});

test('权威读取替换候选人集合、保存本地快照并保留 workspace 回退', () => {
  const start = INDEX_HTML.indexOf('async function loadCandidatesFromCloudAsAuthority(');
  const end = INDEX_HTML.indexOf('async function enableCandidateCloudReadPath()', start);
  assert.ok(start >= 0 && end > start);
  const source = INDEX_HTML.slice(start, end + 6);
  assert.match(source, /listAllCandidates\(/);
  assert.match(source, /CandidateReadPath\.buildAuthoritativeCandidates\(/);
  assert.match(source, /workbenchV2\.candidates\.splice\(/);
  assert.match(source, /await saveWorkbenchV2\(/);
  assert.match(source, /catch/);
  assert.match(source, /workspace_state/);
});

test('启动时已启用则从 candidates 表读取，未启用继续双写预览', () => {
  const start = INDEX_HTML.indexOf('async function initCloud()');
  const end = INDEX_HTML.indexOf('// -------- 生命周期 --------', start);
  const source = INDEX_HTML.slice(start, end);
  assert.match(source, /candidateReadPathEnabled\.value/);
  assert.match(source, /await loadCandidatesFromCloudAsAuthority\(/);
  assert.match(source, /syncCandidatesWithCloud\(/);
});

test('读路径启用后候选人行写入是云端同步成功的必要条件', () => {
  const start = INDEX_HTML.indexOf('async function doPush()');
  const end = INDEX_HTML.indexOf('function schedulePush()', start);
  const source = INDEX_HTML.slice(start, end);
  assert.match(source, /candidateReadPathEnabled\.value[\s\S]*await syncCandidatesWithCloud\(/);
});

test('候选人增量拉取使用时间戳合并决策并显示冲突', () => {
  const start = INDEX_HTML.indexOf('async function pullCandidatesFromCloud(');
  const end = INDEX_HTML.indexOf('// 2b.2 闸门', start);
  assert.ok(start >= 0 && end > start);
  const source = INDEX_HTML.slice(start, end);
  assert.match(source, /buildCandidateMergeDecision/);
  assert.match(source, /candidatePull\.conflicts\.push/);
  assert.match(source, /candidatePull\.lastCursor\s*=\s*readCandidatePullCursor\(\);[\s\S]*await saveWorkbenchV2\(\)/, '拉取增量后必须持久化合并结果');
  assert.match(INDEX_HTML, /候选人本地较新冲突/);
});

test('候选人双写接入离线队列并在失败后保留待重试状态', () => {
  const start = INDEX_HTML.indexOf('async function syncCandidatesWithCloud(');
  const end = INDEX_HTML.indexOf('async function requireCandidateRowsSynced()', start);
  assert.ok(start >= 0 && end > start);
  const source = INDEX_HTML.slice(start, end);
  assert.match(source, /candidateOfflineQueue/);
  assert.match(source, /markFailure/);
  assert.match(source, /listDue/);
  assert.match(INDEX_HTML, /candidateOfflineState\.pending/);
});

test('候选人读路径启用后启动定时增量拉取并回放离线队列', () => {
  assert.match(INDEX_HTML, /startCandidatePolling/);
  assert.match(INDEX_HTML, /stopCandidatePolling/);
  assert.match(INDEX_HTML, /pullCandidatesFromCloud\(\{ automatic: true \}\)/);
  assert.match(INDEX_HTML, /candidateOfflineState\.pending[\s\S]{0,180}syncCandidatesWithCloud/);
});
