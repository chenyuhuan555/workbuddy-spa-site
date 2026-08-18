import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const document = parse(html, { sourceCodeLocationInfo: true });
const nodes = [];
const parentByNode = new Map();

function walk(node, parent = null) {
  if (parent) parentByNode.set(node, parent);
  if (node.tagName) nodes.push(node);
  for (const child of node.childNodes || []) walk(child, node);
  if (node.content) walk(node.content, node);
}
walk(document);

function attrs(node) {
  return Object.fromEntries((node.attrs || []).map(attribute => [attribute.name, attribute.value]));
}

function attr(node, name) {
  return attrs(node)[name] || '';
}

function line(node) {
  return node.sourceCodeLocation?.startLine || 0;
}

function describe(node) {
  const attributes = attrs(node);
  return `${line(node)}:<${node.tagName}> v-model=${JSON.stringify(attributes['v-model'] || '')} placeholder=${JSON.stringify(attributes.placeholder || '')}`;
}

function textContent(node) {
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(textContent).join(' ');
}

function ancestorLabel(node) {
  for (let parent = parentByNode.get(node); parent; parent = parentByNode.get(parent)) {
    if (parent.tagName === 'label') return parent;
  }
  return null;
}

const idNodes = nodes.filter(node => attr(node, 'id'));
const ids = new Set(idNodes.map(node => attr(node, 'id')));
const labelsByTarget = new Map();
for (const label of nodes.filter(node => node.tagName === 'label' && attr(node, 'for'))) {
  const target = attr(label, 'for');
  const labels = labelsByTarget.get(target) || [];
  labels.push(label);
  labelsByTarget.set(target, labels);
}

function hasMeaningfulText(node) {
  return textContent(node).replace(/\s+/g, ' ').trim().length > 0;
}

function hasAccessibleName(node) {
  const attributes = attrs(node);
  if ((attributes['aria-label'] || '').trim()) return true;
  if (attributes['aria-labelledby']) {
    const references = attributes['aria-labelledby'].trim().split(/\s+/);
    if (references.length && references.every(reference => ids.has(reference))) return true;
  }
  if (attributes.id && (labelsByTarget.get(attributes.id) || []).some(hasMeaningfulText)) return true;
  const wrappingLabel = ancestorLabel(node);
  return !!wrappingLabel && hasMeaningfulText(wrappingLabel);
}

function staticReferences(node, attributeName) {
  const value = attr(node, attributeName).trim();
  if (!value || value.includes('{{') || value.includes('`')) return [];
  return value.split(/\s+/).map(reference => ({ node, attributeName, reference }));
}

test('所有按钮显式声明合法 type', () => {
  const invalid = nodes
    .filter(node => node.tagName === 'button')
    .filter(node => !['button', 'submit', 'reset'].includes(attr(node, 'type')))
    .map(describe);

  assert.deepEqual(invalid, []);
});

test('所有非隐藏控件具有可访问名称', () => {
  const controls = nodes.filter(node => ['input', 'select', 'textarea'].includes(node.tagName));
  const missing = controls
    .filter(node => !(node.tagName === 'input' && attr(node, 'type').toLowerCase() === 'hidden'))
    .filter(node => !hasAccessibleName(node))
    .map(describe);

  assert.deepEqual(missing, []);
});

test('label 和 ARIA 静态引用指向真实唯一 id', () => {
  const counts = new Map();
  for (const node of idNodes) counts.set(attr(node, 'id'), (counts.get(attr(node, 'id')) || 0) + 1);
  const duplicateIds = [...counts].filter(([, count]) => count > 1).map(([id, count]) => `${id}:${count}`);
  const references = nodes.flatMap(node => [
    ...staticReferences(node, 'for'),
    ...staticReferences(node, 'aria-labelledby'),
    ...staticReferences(node, 'aria-describedby'),
  ]);
  const broken = references
    .filter(item => !ids.has(item.reference))
    .map(item => `${line(item.node)}:${item.attributeName}=${item.reference}`);

  assert.deepEqual({ duplicateIds, broken }, { duplicateIds: [], broken: [] });
});
