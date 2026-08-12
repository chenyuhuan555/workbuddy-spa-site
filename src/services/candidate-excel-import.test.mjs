import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCandidateExcelRows, splitContacts, markDuplicateCandidateRows, buildCandidateFields, buildCandidateExcelAiMessages, normalizeCandidateExcelAiResult } from './candidate-excel-import.js';

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
  assert.match(INDEX_HTML, /AI 正在整理候选人字段/);
});
