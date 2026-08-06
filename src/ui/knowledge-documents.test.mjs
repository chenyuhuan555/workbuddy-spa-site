import test from 'node:test';
import assert from 'node:assert/strict';

await import('./knowledge-documents.js');
const api = globalThis.WorkBuddyKnowledgeDocuments;

test('清理知识库文本中的裸 Markdown 标记但保留结构', () => {
  const result = api.stripKnowledgeMarkdownMarkers('```markdown\n## 今日判断\n- **融资**增加\n```');
  assert.equal(result, '## 今日判断\n- 融资增加');
  assert.equal(result.includes('**'), false);
});

test('固定知识库文档首次保存后再保存会把新条目放到顶部', () => {
  const articles = [];
  const first = api.prependKnowledgeDocumentEntry(articles, {
    documentKey: 'ai-news', title: 'AI资讯 · Builders Digest', category: 'AI资讯',
    entryKey: '2026-08-06-a', content: '## 2026-08-06\n今日摘要', now: '2026-08-06',
  });
  const second = api.prependKnowledgeDocumentEntry(articles, {
    documentKey: 'ai-news', title: 'AI资讯 · Builders Digest', category: 'AI资讯',
    entryKey: '2026-08-07-b', content: '## 2026-08-07\n今日摘要', now: '2026-08-07',
  });
  assert.equal(articles.length, 1);
  assert.equal(first.documentKey, 'ai-news');
  assert.match(articles[0].content, /^## 2026-08-07/);
  assert.ok(articles[0].content.indexOf('2026-08-07') < articles[0].content.indexOf('2026-08-06'));
  assert.equal(second, articles[0]);
});

test('相同 entryKey 不会重复追加', () => {
  const articles = [];
  const input = { documentKey: 'industry-news', title: '行业动态 · 活水雷达', category: '行业动态', entryKey: 'same', content: '同一条', now: '2026-08-06' };
  api.prependKnowledgeDocumentEntry(articles, input);
  api.prependKnowledgeDocumentEntry(articles, input);
  assert.equal(articles.length, 1);
  assert.equal((articles[0].content.match(/同一条/g) || []).length, 1);
  assert.deepEqual(articles[0].entryKeys, ['same']);
});

test('replaceExisting 会更新同一天的固定文档条目而不新增文档', () => {
  const articles = [];
  const input = { documentKey: 'ai-news', title: 'AI资讯', category: 'AI资讯', entryKey: 'today', content: '摘要', now: '2026-08-06' };
  api.prependKnowledgeDocumentEntry(articles, input);
  api.prependKnowledgeDocumentEntry(articles, { ...input, content: '摘要\n\n工作流', replaceExisting: true });
  assert.equal(articles.length, 1);
  assert.equal(articles[0].content, '摘要\n\n工作流');
  assert.deepEqual(articles[0].entryKeys, ['today']);
});
