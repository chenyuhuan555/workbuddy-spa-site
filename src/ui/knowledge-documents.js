;(function initKnowledgeDocuments(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyKnowledgeDocuments = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createKnowledgeDocuments() {
  'use strict';

  function stripKnowledgeMarkdownMarkers(text) {
    return String(text || '')
      .replace(/```(?:markdown|md|text)?\s*/gi, '')
      .replace(/```/g, '')
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/__(.*?)__/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function prependKnowledgeDocumentEntry(articles, options = {}) {
    const list = Array.isArray(articles) ? articles : [];
    const documentKey = String(options.documentKey || '').trim();
    const entryKey = String(options.entryKey || '').trim();
    const content = stripKnowledgeMarkdownMarkers(options.content);
    if (!documentKey || !entryKey || !content) return null;

    let article = list.find(item => item && item.documentKey === documentKey);
    if (!article) {
      article = {
        id: documentKey,
        documentKey,
        title: String(options.title || documentKey),
        category: String(options.category || '其他'),
        content: '',
        entryKeys: [],
        entryRecords: [],
        createdAt: String(options.now || ''),
        updatedAt: String(options.now || ''),
      };
      list.push(article);
    }

    if (!Array.isArray(article.entryKeys)) article.entryKeys = [];
    if (!Array.isArray(article.entryRecords)) article.entryRecords = [];
    if (article.entryKeys.includes(entryKey)) {
      if (!options.replaceExisting) return article;
      const record = article.entryRecords.find(item => item.key === entryKey);
      if (!record) return article;
      record.content = content;
      article.content = article.entryRecords.map(item => item.content).filter(Boolean).join('\n\n---\n\n');
      article.updatedAt = String(options.now || article.updatedAt || '');
      return article;
    }
    article.entryRecords.unshift({ key: entryKey, content });
    article.content = article.entryRecords.map(item => item.content).filter(Boolean).join('\n\n---\n\n');
    article.entryKeys.unshift(entryKey);
    article.updatedAt = String(options.now || article.updatedAt || '');
    return article;
  }

  return { stripKnowledgeMarkdownMarkers, prependKnowledgeDocumentEntry };
});
