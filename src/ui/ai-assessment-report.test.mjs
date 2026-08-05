import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./ai-assessment-report.js');
const { parseReport } = globalThis.WorkBuddyAiAssessmentReport;

test('AI报告拆分为核心结论、优势、话术、风险和待确认', () => {
  const report = parseReport([
    '★★★★★ 推荐指数 82分', '', '## 核心判断', '适合贝壳财务负责人岗位。', '', '## 优势',
    '- 10年财务经验', '- 全盘账务能力', '', '## 风险', '- 无房产行业经验', '', '## 推荐话术',
    '建议重点推荐其全盘财务和税务处理经验。', '', '## 待确认', '- 杭州base接受度', '- 薪资预期', '',
    '```mermaid', 'flowchart TD', 'A[财务经验] --> B[岗位匹配]', '```',
  ].join('\n'));
  assert.equal(report.score, 82);
  assert.equal(report.conclusion, '适合贝壳财务负责人岗位。');
  assert.deepEqual(report.strengths, ['10年财务经验', '全盘账务能力']);
  assert.equal(report.recommendation, '建议重点推荐其全盘财务和税务处理经验。');
  assert.deepEqual(report.risks, ['无房产行业经验']);
  assert.deepEqual(report.questions, ['杭州base接受度', '薪资预期']);
  assert.match(report.mermaid, /flowchart TD/);
});
