import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePositionCsv,
  splitPositionText,
  normalizeImportedPositions,
  markDuplicatePositions,
  buildPositionBulkImportMessages,
  normalizePositionBulkAiResult,
  cleanPositionDescription,
} from './position-bulk-import.js';

test('parsePositionCsv maps headers and preserves multiline descriptions', () => {
  const rows = parsePositionCsv('岗位名称,工作城市,薪资范围,岗位职责\n量子算法工程师,北京,40-60K,"负责算法研发\n熟悉量子线路"');
  assert.deepEqual(rows, [{
    title: '量子算法工程师', company: '', city: '北京', salary: '40-60K',
    description: '负责算法研发\n熟悉量子线路', owner: '', skills: [],
  }]);
});

test('splitPositionText separates labeled multi-position text', () => {
  const rows = splitPositionText('岗位：量子算法工程师\n地点：北京\n要求：熟悉量子线路\n---\n岗位：量子软件工程师\n地点：上海\n要求：熟悉 Python');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, '量子算法工程师');
  assert.equal(rows[1].city, '上海');
  assert.match(rows[1].description, /Python/);
});

test('岗位描述清理招聘平台界面噪声但保留职责内容', () => {
  const cleaned = cleanPositionDescription('聊一聊\n王女士 2小时前在线 已认证\n招聘经理 · 深圳市羲和生命科技有限责任公司\n职位介绍\n负责平台筹建和生产运营');
  assert.doesNotMatch(cleaned, /聊一聊|2小时前在线|已认证|招聘经理/);
  assert.match(cleaned, /深圳市羲和生命科技有限责任公司/);
  assert.match(cleaned, /负责平台筹建/);
});

test('normalizeImportedPositions accepts AI array aliases and drops empty rows', () => {
  const rows = normalizeImportedPositions([
    { positionName: '量子算法工程师', location: '北京', detail: '研发量子算法', keywords: ['量子计算', 'Python'] },
    { title: '  ', description: '无效' },
  ]);
  assert.deepEqual(rows, [{
    title: '量子算法工程师', company: '', city: '北京', salary: '', owner: '',
    description: '研发量子算法', skills: ['量子计算', 'Python'],
  }]);
});

test('markDuplicatePositions flags existing and repeated titles without changing data', () => {
  const rows = [{ title: '量子算法工程师' }, { title: '量子算法工程师' }, { title: '量子软件工程师' }];
  const result = markDuplicatePositions(rows, [{ title: '量子算法工程师' }]);
  assert.deepEqual(result.map(row => row.duplicateType), ['existing', 'batch', '']);
  assert.equal(result[0].title, '量子算法工程师');
});

test('buildPositionBulkImportMessages asks AI for company-scoped position records', () => {
  const messages = buildPositionBulkImportMessages({ companyName: '量子科技公司', rawText: '岗位：量子算法工程师' });
  assert.match(messages[1].content, /量子科技公司/);
  assert.match(messages[0].content, /positions/);
  assert.match(messages[0].content, /company/);
  assert.match(messages[0].content, /salary/);
  assert.match(messages[0].content, /聊一聊/);
});

test('normalizePositionBulkAiResult accepts an object wrapper', () => {
  const rows = normalizePositionBulkAiResult({ positions: [{ title: '量子算法工程师', city: '北京', description: '研发' }] });
  assert.equal(rows[0].title, '量子算法工程师');
  assert.equal(rows[0].city, '北京');
});

test('production entry loads the bulk import helper before app startup', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/services\/position-bulk-import\.js/);
  assert.match(html, /openCompanyBulkPositionImport/);
  assert.match(html, /confirmCompanyBulkPositions/);
  assert.match(html, /table-fixed/);
  assert.match(html, /inline-flex whitespace-nowrap[^>]*>待入库/);
});
