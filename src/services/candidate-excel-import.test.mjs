import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCandidateExcelRows, splitContacts, markDuplicateCandidateRows, buildCandidateFields, buildCandidateExcelAiMessages, normalizeCandidateExcelAiResult, buildCandidateExcelAiMappingMessages, normalizeCandidateExcelAiMapping, applyCandidateExcelAiMapping } from './candidate-excel-import.js';

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('候选人 Excel 适配器跳过顶部空行并映射倍罗字段', () => {
  const rows = normalizeCandidateExcelRows([
    [], [], [],
    ['推荐批次', '姓名', '当前职位', '当前公司', '所在城市', '学历', '匹配度', '公开联系方式', '联系方式类型', '核验状态', '联系方式来源', '核验备注'],
    ['最新推荐', 'Bing Zhu', 'Director', 'HSBC', 'Shanghai, China', 'Doctorate Degree', '100分', 'bing1.zhu@hsbc.com', '工作邮箱', '已核验公开邮箱', 'https://example.com', '建议确认'],
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Bing Zhu');
  assert.equal(rows[0].matchScore, 100);
  assert.equal(rows[0].email, 'bing1.zhu@hsbc.com');
  assert.equal(rows[0].status, 'ready');
});

test('候选人画像 Excel 额外字段会同步到人才详情', () => {
  const rows = normalizeCandidateExcelRows([
    ['姓名', '个人职业主页', '联系方式来源', '个人信息与背景', '一句话履历总结'],
    ['Bing Zhu', 'https://www.linkedin.com/in/bing', 'https://paper.example/cv.pdf', '量子计算研究与金融科技经历', '量子计算方向候选人'],
  ]);
  const fields = buildCandidateFields(rows[0], { channelName: '倍罗' });
  assert.equal(rows[0].personalProfileUrl, 'https://www.linkedin.com/in/bing');
  assert.equal(rows[0].background, '量子计算研究与金融科技经历');
  assert.equal(rows[0].summary, '量子计算方向候选人');
  assert.equal(fields.summary, '量子计算方向候选人');
  assert.equal(fields.personalProfileUrl, 'https://www.linkedin.com/in/bing');
  assert.match(fields.profileText, /量子计算研究与金融科技经历/);
  assert.match(fields.profileText, /个人职业主页：https:\/\/www\.linkedin\.com\/in\/bing/);
});

test('联系方式中的邮箱和电话会拆分', () => {
  assert.deepEqual(splitContacts('ccumeano@gmail.com / +44 7906 099539'), { emails: ['ccumeano@gmail.com'], phones: ['+447906099539'], raw: 'ccumeano@gmail.com / +44 7906 099539' });
});

test('候选人 Excel 适配器标记已有和本批次重复', () => {
  const rows = normalizeCandidateExcelRows([
    ['姓名', '当前公司', '公开联系方式'],
    ['A', 'Company', 'a@example.com'],
    ['B', 'Company', 'a@example.com'],
    ['C', 'Company', 'c@example.com'],
  ]);
  const marked = markDuplicateCandidateRows(rows, [{ name: 'C', currentCompany: 'Company', email: 'c@example.com' }]);
  assert.deepEqual(marked.map(row => row.duplicateType), ['', 'batch', 'existing']);
});

test('已软删除候选人不再阻止同一人重新导入', () => {
  const rows = normalizeCandidateExcelRows([
    ['姓名', '当前公司', '公开联系方式'],
    ['A', 'Company', 'a@example.com'],
  ]);
  const marked = markDuplicateCandidateRows(rows, [{ name: 'A', currentCompany: 'Company', email: 'a@example.com', deletedAt: '2026-08-12T00:00:00.000Z' }]);
  assert.equal(marked[0].duplicateType, '');
});

test('候选人 Excel 行可以转换为人才基础字段', () => {
  const fields = buildCandidateFields({ name: 'A', email: 'a@example.com', currentCompany: 'Company', currentTitle: 'Researcher', city: '北京', education: '博士', matchScore: 95, contactType: '公开邮箱', verificationStatus: '已核验', note: '说明', sourceUrl: 'https://example.com' });
  assert.equal(fields.source, '倍罗');
  assert.match(fields.profileText, /学历：博士/);
  assert.equal(fields.matchScore, 95);
  assert.equal(buildCandidateFields({ name: 'A' }, { channelName: '自定义渠道' }).sourceChannelName, '自定义渠道');
});

test('候选人 Excel 适配器提供 AI 整理契约并保留原始字段回退', () => {
  const rows = normalizeCandidateExcelRows([['姓名', '公开联系方式'], ['A', 'a@example.com'], ['B', 'b@example.com']]);
  const messages = buildCandidateExcelAiMessages({ rows, channelName: '倍罗' });
  assert.match(messages[1].content, /倍罗/);
  const normalized = normalizeCandidateExcelAiResult({ candidates: [{ rowNumber: rows[0].rowNumber, name: 'A', profileText: '量子研究者' }] }, rows);
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].email, 'a@example.com');
  assert.equal(normalized[0].profileText, '量子研究者');
  assert.equal(normalized[1].email, 'b@example.com');
});

test('AI 可以把不固定的 Excel 表头映射为人才标准字段', () => {
  const headers = ['Candidate', 'Affiliation', 'Role', 'Public Contact', 'Extra Research'];
  const messages = buildCandidateExcelAiMappingMessages({ headers, sampleRows: [['Bing Zhu', 'HSBC', 'Director', 'bing@example.com', 'Quantum finance']] });
  assert.match(messages[1].content, /Extra Research/);
  const mapping = normalizeCandidateExcelAiMapping({ mapping: { Candidate: 'name', Affiliation: 'currentCompany', Role: 'currentTitle', 'Public Contact': 'contact' }, confidence: { Candidate: 0.99 } }, headers);
  const rows = applyCandidateExcelAiMapping([
    headers,
    ['Bing Zhu', 'HSBC', 'Director', 'bing@example.com', 'Quantum finance'],
  ], mapping);
  assert.equal(rows[0].name, 'Bing Zhu');
  assert.equal(rows[0].currentCompany, 'HSBC');
  assert.equal(rows[0].currentTitle, 'Director');
  assert.equal(rows[0].email, 'bing@example.com');
  assert.equal(rows[0].extraFields['Extra Research'], 'Quantum finance');
});

test('Excel 候选人入库不因渠道漏斗事件失败而回滚候选人', () => {
  assert.match(INDEX_HTML, /const funnelEventFailures = \[\];/);
  assert.match(INDEX_HTML, /try \{[\s\S]*?await repo\.appendEvent\([\s\S]*?\} catch \(error\) \{[\s\S]*?funnelEventFailures\.push/s);
  assert.match(INDEX_HTML, /已从 Excel 导入 \$\{created\.length\} 名候选人，但/);
});

test('Excel 导入展示分阶段进度状态', () => {
  assert.match(INDEX_HTML, /candidateExcelImport\.parsing/);
  assert.match(INDEX_HTML, /candidateExcelImport\.progressLabel/);
  assert.match(INDEX_HTML, /candidateExcelImport\.progress/);
  assert.match(INDEX_HTML, /正在读取 Excel 文件/);
  assert.match(INDEX_HTML, /AI 正在分析本批次字段/);
  assert.match(INDEX_HTML, /AI 正在整理候选人字段/);
});

test('Excel 预览会先调用 AI 动态适配表头再生成候选人行', () => {
  const previewStart = INDEX_HTML.indexOf('async function onCandidateExcelFile');
  const confirmStart = INDEX_HTML.indexOf('async function confirmCandidateExcelImport');
  const previewCode = INDEX_HTML.slice(previewStart, confirmStart);
  assert.match(previewCode, /buildCandidateExcelAiMappingMessages/);
  assert.match(previewCode, /normalizeCandidateExcelAiMapping/);
  assert.match(previewCode, /applyCandidateExcelAiMapping/);
});

test('Excel 预览阶段不会写入人才库，只有确认时才允许创建候选人', () => {
  const previewStart = INDEX_HTML.indexOf('async function onCandidateExcelFile');
  const confirmStart = INDEX_HTML.indexOf('async function confirmCandidateExcelImport');
  assert.ok(previewStart >= 0 && confirmStart > previewStart);
  const previewCode = INDEX_HTML.slice(previewStart, confirmStart);
  assert.doesNotMatch(previewCode, /createTalent|saveWorkbenchV2/);
  assert.doesNotMatch(previewCode, /workbenchV2\.candidates\.(push|unshift)/);
  assert.match(INDEX_HTML, /excelPreview: true/);
  assert.match(INDEX_HTML, /if \(batchUpload\.excelPreview\) return;/);
  assert.match(INDEX_HTML, /async function confirmCandidateExcelImport[\s\S]*?WorkbenchV2\.createTalent/);
});

test('渠道 Excel 导入只有明确点击确认时才进入写入函数', () => {
  const confirmStart = INDEX_HTML.indexOf('async function confirmCandidateExcelImport');
  const confirmCode = INDEX_HTML.slice(confirmStart, confirmStart + 2600);
  assert.match(confirmCode, /if \(!canWrite \|\| candidateExcelImport\.importing\) return;/);
  assert.match(confirmCode, /WorkbenchV2\.createTalent/);
  assert.match(confirmCode, /saveWorkbenchV2\(\)/);
});
