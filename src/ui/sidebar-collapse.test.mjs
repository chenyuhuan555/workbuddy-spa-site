import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const DOCUMENT = parse(INDEX_HTML);

function descendants(node) {
  return [node, ...(node.childNodes || []).flatMap(descendants)];
}

function attribute(node, name) {
  return node?.attrs?.find(item => item.name === name)?.value;
}

function hasClass(node, className) {
  return String(attribute(node, 'class') || '').split(/\s+/).includes(className);
}

function assertMatches(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}

function cssBlock(header) {
  const headerIndex = INDEX_HTML.indexOf(header);
  assert.notEqual(headerIndex, -1, `缺少样式块：${header}`);
  const openIndex = INDEX_HTML.indexOf('{', headerIndex);
  assert.notEqual(openIndex, -1, `样式块没有起始花括号：${header}`);

  let depth = 0;
  for (let index = openIndex; index < INDEX_HTML.length; index++) {
    if (INDEX_HTML[index] === '{') depth++;
    if (INDEX_HTML[index] === '}') {
      depth--;
      if (depth === 0) return INDEX_HTML.slice(openIndex + 1, index);
    }
  }
  assert.fail(`样式块没有结束花括号：${header}`);
}

test('侧栏收起状态默认展开、从 setup 暴露且不进入持久化链路', () => {
  assertMatches(
    INDEX_HTML,
    /\bconst\s+workbenchSidebarCollapsed\s*=\s*ref\(\s*false\s*\)\s*;/,
    '缺少 const workbenchSidebarCollapsed = ref(false)',
  );

  const setupReturnStart = INDEX_HTML.lastIndexOf('\n    return {');
  const setupReturnEnd = INDEX_HTML.indexOf('\n    };', setupReturnStart);
  assert.ok(setupReturnStart >= 0 && setupReturnEnd > setupReturnStart, '应能定位 Vue setup 的返回对象');
  assert.match(INDEX_HTML.slice(setupReturnStart, setupReturnEnd), /\bworkbenchSidebarCollapsed\b/);

  const stateLines = INDEX_HTML.split(/\r?\n/).flatMap((line, index, lines) => (
    line.includes('workbenchSidebarCollapsed')
      ? lines.slice(Math.max(0, index - 4), index + 5)
      : []
  )).join('\n');
  assert.doesNotMatch(
    stateLines,
    /\b(?:localStorage|sessionStorage|localSave|schedulePush|saveWorkbenchV2)\b/,
    '收起状态及其切换逻辑不得读写本地、会话或工作台快照存储',
  );
});

test('主导航用内存状态绑定 is-collapsed 类', () => {
  const nav = descendants(DOCUMENT).find(node => (
    node.tagName === 'nav' && attribute(node, 'id') === 'workbench-main-navigation'
  ));

  assert.ok(nav, '主导航必须提供稳定 id=workbench-main-navigation');
  assert.ok(hasClass(nav, 'wb-v2-sidebar'));
  assert.match(attribute(nav, ':class') || '', /\bworkbenchSidebarCollapsed\b/);
  assert.match(attribute(nav, ':class') || '', /\bis-collapsed\b/);
});

test('桌面侧栏开关提供完整动态无障碍属性', () => {
  const toggle = descendants(DOCUMENT).find(node => (
    node.tagName === 'button' && hasClass(node, 'wb-v2-sidebar-toggle')
  ));

  assert.ok(toggle, '缺少 .wb-v2-sidebar-toggle 按钮');
  assert.equal(attribute(toggle, 'type'), 'button');
  assert.equal(attribute(toggle, 'aria-controls'), 'workbench-main-navigation');
  assert.match(attribute(toggle, ':aria-expanded') || '', /!\s*workbenchSidebarCollapsed/);
  assert.match(attribute(toggle, ':aria-label') || '', /workbenchSidebarCollapsed/);
  assert.match(attribute(toggle, ':aria-label') || '', /展开导航栏/);
  assert.match(attribute(toggle, ':aria-label') || '', /收起导航栏/);
});

test('图标导航在收起态提供 title，并用专用类包裹文字', () => {
  const navItem = descendants(DOCUMENT).find(node => (
    node.tagName === 'button' && attribute(node, 'v-for') === 'item in workbenchNavItems'
  ));

  assert.ok(navItem, '应能定位工作台导航项');
  assert.match(attribute(navItem, ':title') || '', /workbenchSidebarCollapsed/);
  assert.match(attribute(navItem, ':title') || '', /item\.label/);
  assert.ok(
    descendants(navItem).some(node => node.tagName === 'span' && hasClass(node, 'wb-v2-sidebar-label')),
    '导航文字必须由 .wb-v2-sidebar-label 包裹',
  );
});

test('桌面收起态宽度固定为 72px', () => {
  assertMatches(
    INDEX_HTML,
    /\.wb-v2-workspace\s+\.wb-v2-sidebar\.is-collapsed\s*\{[^}]*\bwidth\s*:\s*72px\s*!important\s*;/s,
    '缺少优先级明确的桌面 72px 收起宽度',
  );
});

test('820px 内保持 84px 自动窄栏并隐藏手动开关', () => {
  const narrowScreenCss = cssBlock('@media (max-width: 820px)');

  assert.match(narrowScreenCss, /\.wb-v2-workspace\s+\.wb-v2-sidebar\s*\{[^}]*\bwidth\s*:\s*84px\s*!important\s*;/s);
  assert.match(narrowScreenCss, /\.wb-v2-workspace\s+\.wb-v2-sidebar\.is-collapsed\s*\{[^}]*\bwidth\s*:\s*84px\s*!important\s*;/s);
  assert.match(narrowScreenCss, /\.wb-v2-sidebar-toggle\s*\{[^}]*\bdisplay\s*:\s*none\s*(?:!important\s*)?;/s);
});

test('减少动态效果时取消侧栏 transition', () => {
  const reducedMotionCss = cssBlock('@media (prefers-reduced-motion: reduce)');

  assert.match(
    reducedMotionCss,
    /\.wb-v2-workspace\s+\.wb-v2-sidebar(?:\.is-collapsed)?\s*\{[^}]*\btransition\s*:\s*none\s*(?:!important\s*)?;/s,
  );
});
